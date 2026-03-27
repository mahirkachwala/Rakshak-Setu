import { Router, type IRouter } from "express";

const router: IRouter = Router();

const responses: Record<string, { reply: string; type: string; suggestions: string[] }> = {
  fever: {
    reply: "If your child has a mild fever (below 38.5°C) after vaccination, this is normal and usually goes away within 1-2 days. Give paracetamol as per weight, keep the child hydrated, and apply a cool wet cloth. Visit a doctor if fever exceeds 39°C or lasts more than 2 days.",
    type: "info",
    suggestions: ["What is normal after vaccination?", "When to visit doctor?", "Home remedies for fever"],
  },
  vomiting: {
    reply: "Some vomiting after vaccines can occur due to anxiety or mild reaction. Keep the child hydrated with small sips of water or ORS. If vomiting persists for more than 4 hours or is severe, consult a doctor immediately.",
    type: "warning",
    suggestions: ["Signs of dehydration", "When to go to emergency?"],
  },
  swelling: {
    reply: "Mild swelling and redness at the injection site is very common and normal. Apply a cold compress for 15 minutes every few hours. The swelling should reduce within 2-3 days. Do not massage the area.",
    type: "info",
    suggestions: ["How long does swelling last?", "Can I give medicine for pain?"],
  },
  missed: {
    reply: "Missing a vaccine doesn't mean starting over! Most vaccines can still be given after the scheduled age. Catch-up vaccines are safe and effective. Visit your nearest health center as soon as possible to get back on schedule.",
    type: "warning",
    suggestions: ["Find nearest center", "Which vaccines can be caught up?"],
  },
  bcg: {
    reply: "BCG (Bacillus Calmette-Guérin) vaccine is given at birth and protects against tuberculosis (TB). A small lump or sore at the injection site is normal and may take months to heal. This is a mandatory vaccine in India.",
    type: "info",
    suggestions: ["What does BCG protect against?", "Side effects of BCG"],
  },
  polio: {
    reply: "Polio vaccine (OPV/IPV) protects against poliomyelitis. India has been polio-free since 2014 but vaccination is still essential. The oral vaccine (OPV) tastes sweet and is given as drops. No significant side effects are expected.",
    type: "info",
    suggestions: ["When are polio drops given?", "Is polio eradicated in India?"],
  },
  emergency: {
    reply: "⚠️ EMERGENCY: If your child has difficulty breathing, severe rash, swelling of face/lips, or loss of consciousness after vaccination, call 108 immediately for an ambulance. This may be a rare but serious allergic reaction (anaphylaxis) requiring immediate medical attention.",
    type: "emergency",
    suggestions: ["Call 108", "Find nearest emergency center"],
  },
  rabies: {
    reply: "If your child was bitten by a dog or any animal, wash the wound immediately with soap and water for 15 minutes. Visit a doctor or health center immediately for rabies vaccination. Do not wait - early vaccination is critical. Call 108 if needed.",
    type: "emergency",
    suggestions: ["Find nearest center for rabies vaccine", "Call 108 ambulance"],
  },
  schedule: {
    reply: "The standard Indian vaccination schedule covers vaccines from birth to 5 years. Key vaccines include BCG (birth), Polio (birth, 6,10,14 weeks), Hepatitis B (birth, 6, 10 weeks), DPT, Hib, PCV (6, 10, 14 weeks), Rotavirus, MMR (9 months), and many more. Your child's schedule is auto-generated based on their date of birth.",
    type: "info",
    suggestions: ["View my child's schedule", "What vaccines are due?"],
  },
  default: {
    reply: "I'm the Swasthya Setu AI Health Assistant. I can help you with vaccine schedules, child health guidance, and answer questions about your child's healthcare. For medical emergencies, always call 108. For specific medical advice, please consult a qualified doctor.",
    type: "info",
    suggestions: [
      "My child has fever after vaccination",
      "Which vaccines are due this month?",
      "Dog bite - what to do?",
      "Swelling at injection site",
      "Missed a vaccine - what to do?",
    ],
  },
};

function getResponse(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("emergency") || lower.includes("breathing") || lower.includes("unconscious") || lower.includes("rash")) {
    return responses.emergency;
  }
  if (lower.includes("rabies") || lower.includes("dog bite") || lower.includes("animal bite")) {
    return responses.rabies;
  }
  if (lower.includes("fever") || lower.includes("temperature") || lower.includes("hot")) {
    return responses.fever;
  }
  if (lower.includes("vomit") || lower.includes("nausea")) {
    return responses.vomiting;
  }
  if (lower.includes("swelling") || lower.includes("swell") || lower.includes("lump") || lower.includes("injection site")) {
    return responses.swelling;
  }
  if (lower.includes("missed") || lower.includes("missed vaccine") || lower.includes("skip")) {
    return responses.missed;
  }
  if (lower.includes("bcg") || lower.includes("tuberculosis") || lower.includes("tb")) {
    return responses.bcg;
  }
  if (lower.includes("polio") || lower.includes("opv") || lower.includes("drops")) {
    return responses.polio;
  }
  if (lower.includes("schedule") || lower.includes("which vaccine") || lower.includes("due")) {
    return responses.schedule;
  }
  return responses.default;
}

router.post("/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  await new Promise(resolve => setTimeout(resolve, 500));
  const response = getResponse(message);
  res.json(response);
});

export default router;
