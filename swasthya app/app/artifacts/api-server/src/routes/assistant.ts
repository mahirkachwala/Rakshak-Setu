import { Router, type IRouter } from "express";
import { db, centersTable, childrenTable, vaccinesTable, vaccineRecordsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ai } from "@workspace/integrations-gemini-ai";

const router: IRouter = Router();

export type AssistantIntent =
  | "BOOK_APPOINTMENT"
  | "FIND_CENTER"
  | "VACCINE_SCHEDULE"
  | "CHILD_FEVER"
  | "EMERGENCY"
  | "GENERAL";

export interface AssistantResponse {
  intent: AssistantIntent;
  message: string;
  type: "info" | "warning" | "emergency" | "action" | "schedule";
  action_data?: {
    suggested_center?: { id: string; name: string; address: string; distance: string; type: string; cost: string; phone: string | null; lat: number | null; lng: number | null };
    available_slots?: string[];
    recommended_date?: string;
    centers?: Array<{ id: string; name: string; address: string; distance: string; type: string; cost: string }>;
    vaccines?: Array<{ name: string; status: string; scheduledDate: string; ageLabel: string }>;
    phone?: string;
  };
  suggestions: string[];
  language: string;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function generateSlots(date: Date): string[] {
  const slots = ["9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM"];
  const seed = date.getDate() + date.getMonth();
  const available = slots.filter((_, i) => (i + seed) % 3 !== 0);
  return available.slice(0, 5);
}

function computeVaccineSchedule(dob: string, vaccines: typeof vaccinesTable.$inferSelect[], completedIds: number[]) {
  const dobDate = new Date(dob);
  const today = new Date();
  return vaccines.map(v => {
    const scheduledDate = new Date(dobDate);
    scheduledDate.setDate(scheduledDate.getDate() + v.ageWeeks * 7);
    const isCompleted = completedIds.includes(v.id);
    const diff = Math.floor((scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    let status: string;
    if (isCompleted) status = "completed";
    else if (diff < -7) status = "missed";
    else if (diff < 0) status = "overdue";
    else if (diff === 0) status = "due_today";
    else if (diff <= 7) status = "due_this_week";
    else status = "upcoming";
    return {
      name: v.name,
      ageLabel: v.ageLabel,
      scheduledDate: scheduledDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      status,
      diff,
    };
  });
}

function detectIntentKeywords(text: string): AssistantIntent | null {
  const lower = text.toLowerCase();
  if (lower.match(/book|appointment|appoint|slot|schedule.*vaccine|vaccine.*schedule.*book/)) return "BOOK_APPOINTMENT";
  if (lower.match(/center|centre|hospital|phc|clinic|nearest|nearby|where.*go|find.*place/)) return "FIND_CENTER";
  if (lower.match(/schedule|which vaccine|due|upcoming|missed vaccine|next vaccine|vaccine.*when|when.*vaccine/)) return "VACCINE_SCHEDULE";
  if (lower.match(/fever|temperature|hot body|bukhar|garam|sweating|chills|paracetamol/)) return "CHILD_FEVER";
  if (lower.match(/emergency|ambulance|108|breathing|unconscious|fitting|seizure|anaphylaxis|not breathing|very serious/)) return "EMERGENCY";
  return null;
}

const SYSTEM_PROMPT = `You are Swasthya Setu Health Assistant, a friendly healthcare guide for rural Indian parents. Your job is to help them with child vaccination and health queries.

RULES:
- Use very simple, clear language (like talking to a village mother or father)
- No medical jargon 
- Keep responses short (2-4 sentences max)
- Always guide user what to do next
- Be warm, caring, and reassuring
- If the query is in Hindi/regional language, respond in same language but keep it simple

IMPORTANT: You MUST return ONLY valid JSON in this exact format:
{
  "intent": "<one of: BOOK_APPOINTMENT|FIND_CENTER|VACCINE_SCHEDULE|CHILD_FEVER|EMERGENCY|GENERAL>",
  "message": "<your helpful response>",
  "type": "<one of: info|warning|emergency|action|schedule>",
  "suggestions": ["<follow-up 1>", "<follow-up 2>", "<follow-up 3>"]
}

INTENT RULES:
- BOOK_APPOINTMENT: user wants to book a vaccine appointment
- FIND_CENTER: user asks where to go for vaccination or treatment
- VACCINE_SCHEDULE: user asks about upcoming/missed/due vaccines
- CHILD_FEVER: child has fever, cold, cough, or illness after vaccination
- EMERGENCY: life-threatening situation (difficulty breathing, unconscious, severe allergic reaction)
- GENERAL: all other health questions

TYPE RULES:
- "emergency" → only for life-threatening situations
- "warning" → for symptoms needing medical attention soon
- "action" → when suggesting the user do something specific (book, go to center)
- "schedule" → for vaccine schedule information
- "info" → for general information

CHILD FEVER GUIDANCE:
- Fever < 38.5°C: give paracetamol by weight, keep child hydrated, wet cloth on forehead
- Fever > 39°C or lasting 2+ days: visit doctor immediately
- Always reassure the parent first`;

async function callGemini(message: string, context: string): Promise<{ intent: AssistantIntent; message: string; type: string; suggestions: string[] }> {
  const prompt = context
    ? `${message}\n\nChild/Context Information:\n${context}`
    : message;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
    },
  });

  const text = response.text ?? "{}";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

router.post("/query", async (req, res) => {
  try {
    const { message, childId, lat, lng, language = "en" } = req.body as {
      message: string;
      childId?: string | number;
      lat?: number;
      lng?: number;
      language?: string;
    };

    if (!message?.trim()) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const keywordIntent = detectIntentKeywords(message);

    let childContext = "";
    let vaccineData: ReturnType<typeof computeVaccineSchedule> = [];
    let childName = "your child";

    if (childId) {
      const [child] = await db.select().from(childrenTable).where(eq(childrenTable.id, parseInt(String(childId))));
      if (child) {
        childName = child.name;
        const vaccines = await db.select().from(vaccinesTable);
        const records = await db.select().from(vaccineRecordsTable).where(eq(vaccineRecordsTable.childId, child.id));
        const completedIds = records.filter(r => r.status === "completed").map(r => r.vaccineId);
        vaccineData = computeVaccineSchedule(child.dob, vaccines, completedIds);

        const missed = vaccineData.filter(v => v.status === "missed" || v.status === "overdue");
        const due = vaccineData.filter(v => v.status === "due_today" || v.status === "due_this_week");
        const upcoming = vaccineData.filter(v => v.status === "upcoming").slice(0, 3);
        const done = vaccineData.filter(v => v.status === "completed");

        childContext = `Child: ${child.name}, DOB: ${child.dob}, Age: ${child.ageLabel || "unknown"}
Missed vaccines (${missed.length}): ${missed.map(v => `${v.name} (was due ${v.scheduledDate})`).join(", ") || "none"}
Due now (${due.length}): ${due.map(v => `${v.name} (${v.scheduledDate})`).join(", ") || "none"}
Upcoming (${upcoming.length}): ${upcoming.map(v => `${v.name} due ${v.scheduledDate}`).join(", ") || "none"}
Completed: ${done.length} of ${vaccineData.length} vaccines`;
      }
    }

    let allCenters = await db.select().from(centersTable);
    let nearestCenters: typeof allCenters = [];

    if (lat && lng) {
      const withDist = allCenters.map(c => ({
        ...c,
        dist: c.lat && c.lng ? haversine(lat, lng, c.lat, c.lng) : 999,
      }));
      withDist.sort((a, b) => a.dist - b.dist);
      nearestCenters = withDist.slice(0, 3) as typeof allCenters;
    } else {
      nearestCenters = allCenters.slice(0, 3);
    }

    let geminiResult: { intent: string; message: string; type: string; suggestions: string[] };

    try {
      geminiResult = await callGemini(message, childContext);
    } catch {
      const kwIntent = keywordIntent || "GENERAL";
      geminiResult = {
        intent: kwIntent,
        message: getFallbackMessage(kwIntent, childName),
        type: kwIntent === "EMERGENCY" ? "emergency" : kwIntent === "CHILD_FEVER" ? "warning" : "info",
        suggestions: getFallbackSuggestions(kwIntent),
      };
    }

    const intent = (geminiResult.intent || keywordIntent || "GENERAL") as AssistantIntent;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

    const response: AssistantResponse = {
      intent,
      message: geminiResult.message,
      type: (geminiResult.type || "info") as AssistantResponse["type"],
      suggestions: geminiResult.suggestions || [],
      language,
    };

    if (intent === "BOOK_APPOINTMENT" && nearestCenters.length > 0) {
      const center = nearestCenters[0];
      const dist = lat && lng && center.lat && center.lng
        ? formatDistance(haversine(lat, lng, center.lat, center.lng))
        : center.distance || "nearby";
      response.action_data = {
        suggested_center: {
          id: String(center.id),
          name: center.name,
          address: center.address,
          distance: dist,
          type: center.type,
          cost: center.isFree ? "Free" : (center.cost || "Paid"),
          phone: center.phone || null,
          lat: center.lat || null,
          lng: center.lng || null,
        },
        recommended_date: tomorrowStr,
        available_slots: generateSlots(tomorrow),
      };
    }

    if (intent === "FIND_CENTER" && nearestCenters.length > 0) {
      response.action_data = {
        centers: nearestCenters.map(c => {
          const dist = lat && lng && c.lat && c.lng
            ? formatDistance(haversine(lat, lng, c.lat, c.lng))
            : c.distance || "nearby";
          return {
            id: String(c.id),
            name: c.name,
            address: c.address,
            distance: dist,
            type: c.type,
            cost: c.isFree ? "Free" : (c.cost || "Paid"),
          };
        }),
      };
    }

    if ((intent === "VACCINE_SCHEDULE") && vaccineData.length > 0) {
      const relevant = vaccineData.filter(v => v.status !== "upcoming" || vaccineData.filter(x => x.status === "upcoming").indexOf(v) < 3);
      response.action_data = {
        vaccines: relevant.slice(0, 8).map(v => ({
          name: v.name,
          status: v.status,
          scheduledDate: v.scheduledDate,
          ageLabel: v.ageLabel,
        })),
      };
    }

    if (intent === "EMERGENCY") {
      response.action_data = { phone: "108" };
    }

    res.json(response);
  } catch (err) {
    console.error("Assistant error:", err);
    res.status(500).json({
      intent: "GENERAL",
      message: "I'm having trouble understanding. Please try again in a moment.",
      type: "info",
      suggestions: ["My child has fever", "Nearest vaccination center", "Vaccine schedule"],
      language: "en",
    });
  }
});

function getFallbackMessage(intent: string, childName: string): string {
  switch (intent) {
    case "EMERGENCY":
      return "⚠️ This sounds serious! Call 108 immediately for an ambulance. Do not wait.";
    case "CHILD_FEVER":
      return `If ${childName} has a mild fever (below 38.5°C), give paracetamol by weight and keep them hydrated. Visit a doctor if fever goes above 39°C or lasts more than 2 days.`;
    case "BOOK_APPOINTMENT":
      return `I found vaccination centers near you. I can help you book an appointment for ${childName}.`;
    case "FIND_CENTER":
      return "Here are the nearest vaccination centers. You can visit any of them during morning hours (9 AM - 1 PM).";
    case "VACCINE_SCHEDULE":
      return `Here is ${childName}'s vaccination schedule. Please do not miss any vaccines — they protect your child from serious diseases.`;
    default:
      return "I'm here to help with your child's health and vaccinations. Please ask me anything!";
  }
}

function getFallbackSuggestions(intent: string): string[] {
  switch (intent) {
    case "EMERGENCY": return ["Call 108", "Find nearest hospital", "My child is not breathing"];
    case "CHILD_FEVER": return ["When to go to doctor?", "Home remedies for fever", "Paracetamol dose"];
    case "BOOK_APPOINTMENT": return ["Available time slots", "Which vaccine is due?", "How to reach the center?"];
    case "FIND_CENTER": return ["Get directions", "Is it free?", "What vaccines are given?"];
    case "VACCINE_SCHEDULE": return ["Missed vaccines", "Next due vaccine", "Book appointment"];
    default: return ["Vaccine schedule", "Find nearest center", "My child has fever"];
  }
}

export default router;
