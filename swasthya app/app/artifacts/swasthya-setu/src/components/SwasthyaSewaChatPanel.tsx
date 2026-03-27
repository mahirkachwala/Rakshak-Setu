import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Loader2, Mic, RotateCcw, SendHorizonal, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { useListChildren } from '@workspace/api-client-react';

import BookingModalConnected from '@/components/BookingModalConnected';
import SwasthyaSewaGuide, {
  SwasthyaSewaAvatar,
  getGuideUiCopy,
  type SwasthyaSewaGuideHandle,
} from '@/components/SwasthyaSewaGuide';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { canonicalizeAssistantQuery, getAssistantUiCopy, localizeAssistantResponse, type AssistantIntent } from '@/lib/assistantLocale';
import { generateDaySlots, generateSessionSites, type BookingFacilityLike } from '@/lib/bookingSlots';
import { cn } from '@/lib/utils';
import { normalizeIndicDigits } from '@/lib/voice';
import { useAppStore } from '@/store';

type Message = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  intent?: AssistantIntent;
  suggestions?: string[];
  actionData?: {
    centers?: Array<{ id: string; name: string; address: string; distance?: string; type?: string; cost?: string }>;
    vaccines?: Array<{ name: string; scheduledDate: string; status: string; ageLabel: string }>;
    selected_center?: { id: string; name: string; address: string };
    slot_options?: Array<{ id: string; siteId: string; siteName: string; dateIso: string; dateLabel: string; time: string; capacityLeft: number }>;
  };
};

type HealthFacility = BookingFacilityLike & {
  lat: number;
  lng: number;
  isFree: boolean;
  openHours: string;
  vaccinesAvailable: string[];
  district?: string;
  state?: string;
  pincode?: string;
  distanceKm?: number;
};

type BookingFlow =
  | { stage: 'idle' }
  | { stage: 'awaiting_location' }
  | { stage: 'awaiting_center'; facilities: HealthFacility[] }
  | { stage: 'awaiting_slot'; facility: HealthFacility; slots: Message['actionData']['slot_options'] };

const BOOKING_TEXT = {
  askLocation: 'To book an appointment, please share your city or use your current location.',
  searching: 'Checking the nearest government hospitals for you...',
  noLocation: 'Please share a city, pincode, district, or use your current location.',
  noHospitals: 'I could not find matching hospitals there. Please try another place.',
  chooseHospital: 'Here are the nearest hospitals. Please choose one.',
  chooseSlot: 'Please choose a time slot. I will open the booking page with your selection prefilled.',
  bookingOpened: 'Your booking page is ready. Please review it and tap Book Appointment yourself to finish.',
};

const CURRENT_LOCATION_PATTERNS = ['current location', 'my location', 'use my location', 'near me', 'लोकेशन', 'અવસ્થાન', 'স্থান', 'స్థానం', 'இருப்பிடம்', 'ಸ್ಥಳ', 'സ്ഥലം', 'ਲੋਕੇਸ਼ਨ', 'ଅବସ୍ଥାନ'];

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeText(value: string) {
  return normalizeIndicDigits(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radius = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distanceKm: number) {
  return distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`;
}

function buildSlotOptions(facility: HealthFacility) {
  const options: NonNullable<Message['actionData']>['slot_options'] = [];
  for (const site of generateSessionSites(facility)) {
    for (const slot of Object.values(generateDaySlots(facility.id, site.id))) {
      if (!slot.available) continue;
      options.push({
        id: `${site.id}-${slot.date.toISOString()}`,
        siteId: site.id,
        siteName: site.siteName,
        dateIso: slot.date.toISOString(),
        dateLabel: slot.date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
        time: slot.time,
        capacityLeft: Math.max(0, slot.capacity - slot.booked),
      });
    }
  }
  return options.sort((a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime()).slice(0, 6);
}

function selectIndexFromText(text: string, max: number) {
  const match = normalizeText(text).match(/\b([1-9]\d?)\b/);
  if (!match) return null;
  const index = Number(match[1]) - 1;
  return index >= 0 && index < max ? index : null;
}

function containsIndicScript(text: string) {
  return /[\u0900-\u0D7F]/.test(text);
}

export default function SwasthyaSewaChatPanel({ className }: { className?: string }) {
  const activeChildId = useAppStore((state) => state.activeChildId);
  const parentName = useAppStore((state) => state.parentName);
  const language = useAppStore((state) => state.language);
  const { data: children } = useListChildren();
  const child = children?.find((entry) => entry.id === activeChildId) ?? children?.[0];
  const childName = child?.name || 'your child';
  const assistantUi = getAssistantUiCopy(language);
  const guideUi = getGuideUiCopy(language);
  const introText = localizeAssistantResponse(language, 'GENERAL', childName).message;
  const introSuggestions = localizeAssistantResponse(language, 'GENERAL', childName).suggestions;
  const englishFallback = useMemo(() => localizeAssistantResponse('en', 'GENERAL', childName), [childName]);

  const guideRef = useRef<SwasthyaSewaGuideHandle | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const datasetPromiseRef = useRef<Promise<HealthFacility[]> | null>(null);

  const [messages, setMessages] = useState<Message[]>([{ id: createId(), role: 'assistant', text: introText, suggestions: introSuggestions, intent: 'GENERAL' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataset, setDataset] = useState<HealthFacility[] | null>(null);
  const [bookingFlow, setBookingFlow] = useState<BookingFlow>({ stage: 'idle' });
  const [guidePrompt, setGuidePrompt] = useState(introText);
  const [guideReplayToken, setGuideReplayToken] = useState(0);
  const [guideAutoListen, setGuideAutoListen] = useState(false);
  const [bookingFacility, setBookingFacility] = useState<HealthFacility | null>(null);
  const [bookingSelection, setBookingSelection] = useState<{ siteId: string; dateIso: string } | null>(null);
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number } | null>(null);

  const speak = useCallback((text: string, autoListen = false) => {
    setGuidePrompt(text);
    setGuideAutoListen(autoListen);
    setGuideReplayToken((value) => value + 1);
  }, []);

  const appendAssistant = useCallback((text: string, extra: Partial<Message> = {}, autoListen = false) => {
    setMessages((current) => [...current, { id: createId(), role: 'assistant', text, ...extra }]);
    speak(text, autoListen);
  }, [speak]);

  const appendUser = useCallback((text: string) => {
    setMessages((current) => [...current, { id: createId(), role: 'user', text }]);
  }, []);

  const ensureDataset = useCallback(async () => {
    if (dataset) return dataset;
    if (datasetPromiseRef.current) return datasetPromiseRef.current;
    const promise = fetch(`${import.meta.env.BASE_URL}health-facilities.json`).then(async (response) => {
      const data = (await response.json()) as HealthFacility[];
      setDataset(data);
      datasetPromiseRef.current = null;
      return data;
    });
    datasetPromiseRef.current = promise;
    return promise;
  }, [dataset]);

  const openBooking = useCallback((facility: HealthFacility, slot: NonNullable<Message['actionData']>['slot_options'][number]) => {
    setBookingFlow({ stage: 'idle' });
    setBookingFacility(facility);
    setBookingSelection({ siteId: slot.siteId, dateIso: slot.dateIso });
    appendAssistant(BOOKING_TEXT.bookingOpened);
  }, [appendAssistant]);

  const promptForSlots = useCallback((facility: HealthFacility) => {
    const slots = buildSlotOptions(facility);
    if (!slots.length) {
      setBookingFlow({ stage: 'awaiting_location' });
      appendAssistant(BOOKING_TEXT.noHospitals, {}, true);
      return;
    }
    setBookingFlow({ stage: 'awaiting_slot', facility, slots });
    appendAssistant(`${BOOKING_TEXT.chooseSlot}`, {
      intent: 'BOOK_APPOINTMENT',
      actionData: {
        selected_center: { id: facility.id, name: facility.name, address: facility.address },
        slot_options: slots,
      },
    }, true);
  }, [appendAssistant]);

  const findByQuery = useCallback((facilities: HealthFacility[], query: string) => {
    const normalized = normalizeText(query);
    return facilities
      .map((facility) => {
        const haystack = normalizeText([facility.name, facility.city, facility.district, facility.state, facility.address, facility.pincode].filter(Boolean).join(' '));
        const score = haystack.includes(normalized) ? (haystack.startsWith(normalized) ? 10 : 1) : 0;
        return { facility, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((entry) => entry.facility);
  }, []);

  const handleLocation = useCallback(async (value: string) => {
    const normalized = normalizeText(value);
    if (!normalized) {
      appendAssistant(BOOKING_TEXT.noLocation, {}, true);
      return;
    }

    if (CURRENT_LOCATION_PATTERNS.some((pattern) => normalized.includes(normalizeText(pattern)))) {
      appendAssistant(BOOKING_TEXT.searching);
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
        });
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setLastCoords(coords);
        const facilities = (await ensureDataset())
          .map((facility) => ({ ...facility, distanceKm: haversine(coords.lat, coords.lng, facility.lat, facility.lng) }))
          .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
          .slice(0, 5);
        setBookingFlow({ stage: 'awaiting_center', facilities });
        appendAssistant(BOOKING_TEXT.chooseHospital, {
          intent: 'BOOK_APPOINTMENT',
          actionData: {
            centers: facilities.map((facility) => ({
              id: facility.id,
              name: facility.name,
              address: facility.address,
              distance: facility.distanceKm != null ? formatDistance(facility.distanceKm) : undefined,
              type: facility.facilityType || facility.type,
              cost: facility.isFree ? 'Free' : 'Paid',
            })),
          },
        }, true);
        return;
      } catch {
        appendAssistant('Location permission is blocked. Please type your city or pincode instead.', {}, true);
        return;
      }
    }

    appendAssistant(BOOKING_TEXT.searching);
    const facilities = findByQuery(await ensureDataset(), value);
    if (!facilities.length) {
      setBookingFlow({ stage: 'awaiting_location' });
      appendAssistant(BOOKING_TEXT.noHospitals, {}, true);
      return;
    }
    setBookingFlow({ stage: 'awaiting_center', facilities });
    appendAssistant(BOOKING_TEXT.chooseHospital, {
      intent: 'BOOK_APPOINTMENT',
      actionData: {
        centers: facilities.map((facility) => ({
          id: facility.id,
          name: facility.name,
          address: facility.address,
          type: facility.facilityType || facility.type,
          cost: facility.isFree ? 'Free' : 'Paid',
        })),
      },
    }, true);
  }, [appendAssistant, ensureDataset, findByQuery]);

  const handleFacilityChoice = useCallback(async (facilityId: string) => {
    const facilities = bookingFlow.stage === 'awaiting_center' ? bookingFlow.facilities : await ensureDataset();
    const facility = facilities.find((entry) => entry.id === facilityId) ?? facilities.find((entry) => entry.name === facilityId);
    if (facility) promptForSlots(facility);
  }, [bookingFlow, ensureDataset, promptForSlots]);

  const queryAssistant = useCallback(async (rawText: string) => {
    const { query, inferredIntent } = canonicalizeAssistantQuery(rawText);
    if (inferredIntent === 'BOOK_APPOINTMENT' || normalizeText(rawText).includes('book')) {
      setBookingFlow({ stage: 'awaiting_location' });
      appendAssistant(BOOKING_TEXT.askLocation, { intent: 'BOOK_APPOINTMENT', suggestions: ['Use current location'] }, true);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/assistant/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, rawMessage: rawText, childId: child?.id, language, lat: lastCoords?.lat, lng: lastCoords?.lng }),
      });
      const data = await response.json();
      const fallbackIntent = (data.intent as AssistantIntent | undefined) ?? 'GENERAL';
      const englishIntentFallback = localizeAssistantResponse('en', fallbackIntent, childName);
      const safeMessage = language === 'en' && containsIndicScript(String(data.message || ''))
        ? englishIntentFallback.message
        : String(data.message || '');
      const safeSuggestions = language === 'en' && Array.isArray(data.suggestions) && data.suggestions.some((item: string) => containsIndicScript(String(item)))
        ? englishIntentFallback.suggestions
        : data.suggestions;

      setMessages((current) => [...current, {
        id: createId(),
        role: 'assistant',
        text: safeMessage || englishFallback.message,
        intent: data.intent,
        suggestions: safeSuggestions,
        actionData: data.action_data,
      }]);
      speak(safeMessage || englishFallback.message, false);
    } catch {
      appendAssistant(introText, { intent: 'GENERAL', suggestions: introSuggestions });
    } finally {
      setLoading(false);
    }
  }, [appendAssistant, child?.id, childName, englishFallback.message, introSuggestions, introText, language, lastCoords?.lat, lastCoords?.lng, speak]);

  const handleMessage = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    appendUser(trimmed);
    setInput('');

    if (bookingFlow.stage === 'awaiting_location') {
      await handleLocation(trimmed);
      return;
    }

    if (bookingFlow.stage === 'awaiting_center') {
      const index = selectIndexFromText(trimmed, bookingFlow.facilities.length);
      if (index != null) {
        promptForSlots(bookingFlow.facilities[index]);
        return;
      }
      const facility = bookingFlow.facilities.find((entry) => normalizeText(entry.name).includes(normalizeText(trimmed)));
      if (facility) {
        promptForSlots(facility);
        return;
      }
      appendAssistant(BOOKING_TEXT.chooseHospital, {}, true);
      return;
    }

    if (bookingFlow.stage === 'awaiting_slot') {
      const index = selectIndexFromText(trimmed, bookingFlow.slots?.length ?? 0);
      if (index != null && bookingFlow.slots?.[index]) {
        openBooking(bookingFlow.facility, bookingFlow.slots[index]);
        return;
      }
      appendAssistant(BOOKING_TEXT.chooseSlot, {}, true);
      return;
    }

    await queryAssistant(trimmed);
  }, [appendAssistant, appendUser, bookingFlow, handleLocation, openBooking, promptForSlots, queryAssistant]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const lastAssistantId = useMemo(() => messages.filter((message) => message.role === 'assistant').at(-1)?.id ?? null, [messages]);
  const resetChat = useCallback(() => {
    setMessages([{ id: createId(), role: 'assistant', text: introText, suggestions: introSuggestions, intent: 'GENERAL' }]);
    setBookingFlow({ stage: 'idle' });
    setBookingFacility(null);
    setBookingSelection(null);
    setGuideAutoListen(false);
    speak(introText, false);
  }, [introSuggestions, introText, speak]);

  return (
    <div className={cn('flex h-full flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl shadow-slate-900/8', className)}>
      <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-[#6c63ff] via-[#5f8cf5] to-[#43c6ff] px-5 pb-5 pt-5 text-white">
        <div className="absolute -left-14 top-0 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Swasthya Sewa
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">{parentName ? `${parentName.split(' ')[0]}, ` : ''}{assistantUi.status}</h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-cyan-50/95">{introText}</p>
          </div>
          <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Number.POSITIVE_INFINITY, duration: 3.4, ease: 'easeInOut' }} className="flex h-28 w-24 shrink-0 items-center justify-center rounded-[26px] bg-white/92 p-3 shadow-2xl shadow-slate-900/15 ring-1 ring-white/70">
            <SwasthyaSewaAvatar />
          </motion.div>
        </div>
      </div>

      <SwasthyaSewaGuide ref={guideRef} className="pointer-events-none absolute -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0" prompt={guidePrompt} language={language} replayToken={guideReplayToken} onTranscript={(transcript) => { void handleMessage(transcript); }} autoSpeak autoListen={guideAutoListen} speechRate={1.25} />

      <ScrollArea className="min-h-0 flex-1 bg-[#f7faff]">
        <div className="space-y-4 px-4 py-5">
          <AnimatePresence initial={false}>
            {messages.map((message) => {
              const isAssistant = message.role === 'assistant';
              return (
                <motion.div key={message.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={cn('flex', isAssistant ? 'justify-start' : 'justify-end')}>
                  <div className={cn('max-w-[88%]', isAssistant ? 'pr-8' : 'pl-8')}>
                    {isAssistant && <div className="mb-2 flex items-center gap-2 px-1"><div className="h-8 w-8 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200"><SwasthyaSewaAvatar /></div><span className="text-xs font-semibold text-slate-500">Swasthya Sewa</span></div>}
                    <div className={cn('rounded-[26px] px-4 py-3 text-sm leading-relaxed shadow-sm', isAssistant ? 'bg-white text-slate-700 ring-1 ring-slate-200' : 'bg-gradient-to-br from-[#6c63ff] to-[#4d9fff] text-white')}>{message.text}</div>

                    {message.intent === 'BOOK_APPOINTMENT' && message.actionData?.centers && (
                      <div className="mt-3 grid gap-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                        {message.actionData.centers.map((center, index) => (
                          <button key={center.id} type="button" onClick={() => { void handleFacilityChoice(center.id); }} className="rounded-2xl bg-slate-50 px-3 py-3 text-left transition hover:bg-slate-100">
                            <p className="text-sm font-semibold text-slate-900">{index + 1}. {center.name}</p>
                            <p className="mt-1 text-xs leading-relaxed text-slate-500">{center.address}</p>
                            <p className="mt-1 text-[11px] font-medium text-slate-500">{[center.distance, center.type, center.cost].filter(Boolean).join(' · ')}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {message.intent === 'BOOK_APPOINTMENT' && message.actionData?.slot_options && (
                      <div className="mt-3 grid gap-2 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                        {message.actionData.slot_options.map((slot, index) => (
                          <button key={slot.id} type="button" onClick={() => {
                            if (bookingFlow.stage === 'awaiting_slot') {
                              openBooking(bookingFlow.facility, slot);
                            }
                          }} className="rounded-2xl border border-slate-200 px-3 py-3 text-left transition hover:border-primary/30 hover:bg-primary/5">
                            <p className="text-sm font-semibold text-slate-900">{index + 1}. {slot.dateLabel}</p>
                            <p className="text-xs text-slate-500">{slot.time}</p>
                            <p className="mt-1 text-[11px] text-slate-500">{slot.siteName}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {message.intent === 'VACCINE_SCHEDULE' && message.actionData?.vaccines && (
                      <div className="mt-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="grid gap-2">
                          {message.actionData.vaccines.slice(0, 4).map((vaccine) => (
                            <div key={`${vaccine.name}-${vaccine.scheduledDate}`} className="rounded-2xl bg-slate-50 px-3 py-3">
                              <p className="text-sm font-semibold text-slate-900">{vaccine.name}</p>
                              <p className="text-xs text-slate-500">{vaccine.scheduledDate} · {vaccine.ageLabel}</p>
                            </div>
                          ))}
                          <Link href="/schedule" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">{'Open Schedule'}<ArrowRight className="h-4 w-4" /></Link>
                        </div>
                      </div>
                    )}

                    {message.id === lastAssistantId && message.suggestions?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion) => (
                          <button key={suggestion} type="button" onClick={() => { void handleMessage(suggestion); }} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-medium text-primary transition hover:bg-primary/10">
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {loading && <div className="rounded-[24px] bg-white px-4 py-3 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200"><span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{assistantUi.loading}</span></div>}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-3">
        <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-2.5 shadow-sm">
          <form onSubmit={(event) => { event.preventDefault(); void handleMessage(input); }} className="flex items-center gap-2">
            <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder={assistantUi.placeholder} className="h-12 rounded-full border-slate-200 bg-white px-4 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-primary/30" />
            <Button type="submit" size="icon" className="h-12 w-12 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#4d9fff] shadow-lg shadow-primary/20" disabled={!input.trim() || loading}><SendHorizonal className="h-5 w-5" /></Button>
          </form>

          <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
            <button type="button" onClick={() => { void guideRef.current?.replay(); }} className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"><RotateCcw className="h-4 w-4" />{guideUi.hear}</button>
            <button type="button" onClick={() => { void guideRef.current?.listen(); }} className="inline-flex h-9 items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 text-sm font-semibold text-primary transition hover:bg-primary/10"><Mic className="h-4 w-4" />{guideUi.answer}</button>
            <button type="button" onClick={resetChat} className="ml-auto inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">{assistantUi.reset}</button>
          </div>
        </div>
      </div>

      {bookingFacility && bookingSelection && <BookingModalConnected facility={bookingFacility} initialSelection={bookingSelection} onClose={() => { setBookingFacility(null); setBookingSelection(null); }} />}
    </div>
  );
}
