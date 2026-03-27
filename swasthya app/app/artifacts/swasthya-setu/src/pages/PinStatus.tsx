import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Loader2,
  MapPin,
  Radio,
  Search,
  ShieldAlert,
  ShieldCheck,
  Thermometer,
  Wifi,
  Lightbulb,
} from 'lucide-react';

import { useAppStore } from '@/store';

type MiddlewareInfo = {
  apiVersion?: string;
  integrationMode?: string;
  authRequired?: boolean;
  endpoints?: {
    pinLookup?: string;
  };
};

type MiddlewarePinPayload = {
  apiVersion?: string;
  lookup?: {
    type?: string;
    value?: string;
    matched?: boolean;
  };
  container?: {
    deviceId?: string;
    containerPin?: string;
    boxId?: string;
    shipmentId?: string;
    publicIdentityId?: string;
  };
  transit?: {
    routeId?: string | null;
    configVersion?: string | null;
    online?: boolean;
    lastUpdated?: string | null;
    currentCondition?: {
      severity?: string;
      label?: string;
      issues?: string[];
      activeAnomalyCount?: number;
    };
    useDecision?: {
      severity?: string;
      label?: string;
      issues?: string[];
      activeAnomalyCount?: number;
      recordedAnomalyCount?: number;
    };
    anomalyHistorySummary?: {
      totalCount?: number;
      activeCount?: number;
      latestDetectedAt?: string | null;
    };
  };
  latestTelemetrySnapshot?: {
    timestamp?: string | null;
    sensors?: {
      temperatureC?: number | null;
      lightLux?: number | null;
      gps?: {
        fix?: boolean;
        lat?: number | null;
        lng?: number | null;
        accuracyMeters?: number | null;
        capturedAt?: string | null;
      };
    };
    transport?: {
      connected?: boolean;
      medium?: string | null;
      ssid?: string | null;
      rssiDbm?: number | null;
      localIp?: string | null;
    };
  };
  latestRecordedAnomaly?: {
    eventId?: string;
    anomalyType?: string;
    anomalyCode?: string;
    anomalyLabel?: string;
    status?: string;
    detectedAt?: string | null;
    lastObservedAt?: string | null;
    resolvedAt?: string | null;
    source?: string | null;
    blockchain?: {
      status?: string | null;
      txHash?: string | null;
      explorerUrl?: string | null;
      network?: string | null;
      anchoredAt?: string | null;
    };
  } | null;
  outcome?: {
    code?: string;
    title?: string;
    message?: string;
    safeForUse?: boolean;
    shouldHighlightAnomaly?: boolean;
  };
  appDisplay?: {
    primaryStatus?: string;
    secondaryStatus?: string;
    shouldHighlightAnomaly?: boolean;
  };
};

const STORAGE_KEY = 'raksha-setu-container-pin';

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatNumber(value: number | null | undefined, digits = 2) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Not available';
  return value.toFixed(digits);
}

function getOutcomeTone(code: string | undefined) {
  if (code === 'SAFE_FOR_USE') {
    return {
      icon: ShieldCheck,
      card: 'border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/30 dark:text-green-100',
      badge: 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300',
      label: 'No breach recorded',
    };
  }

  if (code === 'ANOMALY_RECORDED') {
    return {
      icon: ShieldAlert,
      card: 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100',
      badge: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300',
      label: 'Breach recorded',
    };
  }

  return {
    icon: AlertTriangle,
    card: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    label: 'Review needed',
  };
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-3 last:border-b-0 dark:border-gray-800">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <div className="max-w-[62%] text-right text-sm font-medium text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

function IssuePill({ issue }: { issue: string }) {
  return (
    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      {issue.replace(/_/g, ' ')}
    </span>
  );
}

export default function PinStatus() {
  const language = useAppStore((state) => state.language);
  const locale = language === 'en' ? 'en-IN' : `${language}-IN`;
  const apiBase = useMemo(() => import.meta.env.BASE_URL.replace(/\/$/, ''), []);

  const [pin, setPin] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [serviceInfo, setServiceInfo] = useState<MiddlewareInfo | null>(null);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<MiddlewarePinPayload | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    fetch(`${apiBase}/api/hardware/middleware/info`)
      .then(async (response) => {
        const text = await response.text();
        const parsed = text ? JSON.parse(text) : {};
        if (!response.ok) {
          throw new Error(parsed?.error || `Middleware info request failed (${response.status})`);
        }
        if (alive) setServiceInfo(parsed as MiddlewareInfo);
      })
      .catch((error) => {
        if (alive) setServiceError(error instanceof Error ? error.message : 'Unable to connect to middleware');
      });

    return () => {
      alive = false;
    };
  }, [apiBase]);

  const handleLookup = async (nextPin?: string) => {
    const trimmedPin = (nextPin ?? pin).trim();
    if (!trimmedPin) {
      setLookupError('Enter the container PIN first.');
      setPayload(null);
      return;
    }

    setLoading(true);
    setLookupError(null);

    try {
      const response = await fetch(
        `${apiBase}/api/hardware/middleware/pins/${encodeURIComponent(trimmedPin)}`,
      );
      const text = await response.text();
      const parsed = text ? JSON.parse(text) : {};

      if (!response.ok) {
        throw new Error(parsed?.error || `PIN lookup failed (${response.status})`);
      }

      setPayload(parsed as MiddlewarePinPayload);
      try {
        localStorage.setItem(STORAGE_KEY, trimmedPin);
      } catch {
        // Ignore local persistence issues.
      }
    } catch (error) {
      setPayload(null);
      setLookupError(error instanceof Error ? error.message : 'Unable to fetch PIN status right now.');
    } finally {
      setLoading(false);
    }
  };

  const tone = getOutcomeTone(payload?.outcome?.code);
  const StatusIcon = tone.icon;
  const issues = payload?.transit?.useDecision?.issues ?? [];
  const liveGps = payload?.latestTelemetrySnapshot?.sensors?.gps;
  const transport = payload?.latestTelemetrySnapshot?.transport;
  const anomaly = payload?.latestRecordedAnomaly;

  return (
    <div className="min-h-full bg-gray-50 px-4 py-4 dark:bg-gray-950">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
            <ArrowLeft size={16} />
            Back to home
          </Link>
          <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-400">
            Raksha Setu hardware status
          </div>
        </div>

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-400">
                Vaccine box safety
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                Check breach status by container PIN
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                Enter the vaccine container PIN to see safe-for-use status, latest breach or anomaly details,
                telemetry snapshot, and blockchain proof when available.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs dark:border-gray-700 dark:bg-gray-800/80">
              <p className="font-semibold text-gray-700 dark:text-gray-200">Middleware</p>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                {serviceError
                  ? 'Unavailable'
                  : serviceInfo
                    ? `Connected${serviceInfo.authRequired ? ' (auth enabled)' : ''}`
                    : 'Checking connection...'}
              </p>
              {serviceInfo?.apiVersion && (
                <p className="mt-1 text-gray-400 dark:text-gray-500">API {serviceInfo.apiVersion}</p>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 md:flex-row">
            <label className="flex-1">
              <span className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                Container PIN
              </span>
              <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-blue-500 focus-within:bg-white dark:border-gray-700 dark:bg-gray-800 dark:focus-within:bg-gray-900">
                <Search size={18} className="text-gray-400" />
                <input
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void handleLookup();
                    }
                  }}
                  inputMode="numeric"
                  placeholder="Example: 472901"
                  className="w-full bg-transparent text-base font-semibold text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                />
              </div>
            </label>

            <div className="flex gap-2 md:items-end">
              <button
                type="button"
                onClick={() => void handleLookup()}
                disabled={loading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                Check status
              </button>
              <button
                type="button"
                onClick={() => {
                  setPin('472901');
                  void handleLookup('472901');
                }}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Use demo PIN
              </button>
            </div>
          </div>

          {serviceError && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              {serviceError}
            </div>
          )}

          {lookupError && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
              {lookupError}
            </div>
          )}
        </section>

        {!payload && !loading && !lookupError && (
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <ShieldCheck size={18} className="text-green-600 dark:text-green-400" />
              <h2 className="mt-3 text-sm font-bold text-gray-900 dark:text-white">Safe for use</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                Shows whether the vaccine box is currently safe to use or if manual review is needed.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <ShieldAlert size={18} className="text-red-600 dark:text-red-400" />
              <h2 className="mt-3 text-sm font-bold text-gray-900 dark:text-white">Breach details</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                Displays the latest recorded anomaly, when it happened, and whether blockchain proof exists.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <Activity size={18} className="text-blue-600 dark:text-blue-400" />
              <h2 className="mt-3 text-sm font-bold text-gray-900 dark:text-white">Live telemetry</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                Includes temperature, light exposure, GPS snapshot, transport connection, and latest update time.
              </p>
            </div>
          </section>
        )}

        {payload && (
          <>
            <section className={`rounded-3xl border p-5 shadow-sm ${tone.card}`}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white/70 p-3 dark:bg-black/10">
                    <StatusIcon size={24} />
                  </div>
                  <div>
                    <div className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${tone.badge}`}>
                      {tone.label}
                    </div>
                    <h2 className="mt-3 text-2xl font-black tracking-tight">
                      {payload.appDisplay?.primaryStatus || payload.outcome?.title || 'Container status'}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6">
                      {payload.appDisplay?.secondaryStatus || payload.outcome?.message || 'Latest middleware response received successfully.'}
                    </p>
                  </div>
                </div>

                <div className="grid min-w-[220px] grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-white/70 px-3 py-3 text-sm dark:bg-black/10">
                    <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">PIN</p>
                    <p className="mt-1 font-bold">{payload.container?.containerPin || payload.lookup?.value || '-'}</p>
                  </div>
                  <div className="rounded-2xl bg-white/70 px-3 py-3 text-sm dark:bg-black/10">
                    <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Outcome</p>
                    <p className="mt-1 font-bold">{payload.outcome?.code || '-'}</p>
                  </div>
                  <div className="rounded-2xl bg-white/70 px-3 py-3 text-sm dark:bg-black/10">
                    <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Safe for use</p>
                    <p className="mt-1 font-bold">{payload.outcome?.safeForUse ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="rounded-2xl bg-white/70 px-3 py-3 text-sm dark:bg-black/10">
                    <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Last updated</p>
                    <p className="mt-1 font-bold">
                      {formatDateTime(payload.transit?.lastUpdated || payload.latestTelemetrySnapshot?.timestamp, locale)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Container details</h3>
                <div className="mt-3">
                  <DetailRow label="Device ID" value={payload.container?.deviceId || 'Not available'} />
                  <DetailRow label="Box ID" value={payload.container?.boxId || 'Not available'} />
                  <DetailRow label="Shipment ID" value={payload.container?.shipmentId || 'Not available'} />
                  <DetailRow label="Public identity" value={payload.container?.publicIdentityId || 'Not available'} />
                  <DetailRow label="Route ID" value={payload.transit?.routeId || 'Not available'} />
                  <DetailRow label="Config version" value={payload.transit?.configVersion || 'Not available'} />
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Breach status</h3>
                <div className="mt-3">
                  <DetailRow label="Current condition" value={payload.transit?.currentCondition?.label || 'Not available'} />
                  <DetailRow label="Use decision" value={payload.transit?.useDecision?.label || 'Not available'} />
                  <DetailRow label="Box online" value={payload.transit?.online ? 'Online' : 'Offline'} />
                  <DetailRow
                    label="Recorded anomalies"
                    value={String(payload.transit?.anomalyHistorySummary?.totalCount ?? payload.transit?.useDecision?.recordedAnomalyCount ?? 0)}
                  />
                  <DetailRow
                    label="Active anomalies"
                    value={String(payload.transit?.anomalyHistorySummary?.activeCount ?? payload.transit?.useDecision?.activeAnomalyCount ?? 0)}
                  />
                </div>

                {issues.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Flags</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {issues.map((issue) => (
                        <IssuePill key={issue} issue={issue} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.05fr,0.95fr]">
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center gap-2">
                  <Thermometer size={18} className="text-rose-500" />
                  <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Live telemetry</h3>
                </div>
                <div className="mt-3">
                  <DetailRow
                    label="Temperature"
                    value={payload.latestTelemetrySnapshot?.sensors?.temperatureC != null
                      ? `${formatNumber(payload.latestTelemetrySnapshot?.sensors?.temperatureC, 2)} C`
                      : 'Not available'}
                  />
                  <DetailRow
                    label="Light"
                    value={payload.latestTelemetrySnapshot?.sensors?.lightLux != null
                      ? `${formatNumber(payload.latestTelemetrySnapshot?.sensors?.lightLux, 2)} lux`
                      : 'Not available'}
                  />
                  <DetailRow
                    label="GPS fix"
                    value={liveGps?.fix ? 'Available' : 'Not available'}
                  />
                  <DetailRow
                    label="Coordinates"
                    value={liveGps?.lat != null && liveGps?.lng != null
                      ? `${formatNumber(liveGps.lat, 5)}, ${formatNumber(liveGps.lng, 5)}`
                      : 'Not available'}
                  />
                  <DetailRow
                    label="GPS accuracy"
                    value={liveGps?.accuracyMeters != null ? `${Math.round(liveGps.accuracyMeters)} m` : 'Not available'}
                  />
                  <DetailRow
                    label="Telemetry time"
                    value={formatDateTime(payload.latestTelemetrySnapshot?.timestamp, locale)}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center gap-2">
                  <Wifi size={18} className="text-blue-500" />
                  <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Transport and link</h3>
                </div>
                <div className="mt-3">
                  <DetailRow label="Connected" value={transport?.connected ? 'Yes' : 'No'} />
                  <DetailRow label="Medium" value={transport?.medium || 'Not available'} />
                  <DetailRow label="SSID" value={transport?.ssid || 'Not available'} />
                  <DetailRow label="RSSI" value={transport?.rssiDbm != null ? `${transport.rssiDbm} dBm` : 'Not available'} />
                  <DetailRow label="Local IP" value={transport?.localIp || 'Not available'} />
                  <DetailRow
                    label="Latest anomaly time"
                    value={formatDateTime(payload.transit?.anomalyHistorySummary?.latestDetectedAt, locale)}
                  />
                </div>
              </div>
            </section>

            {anomaly && (
              <section className="rounded-3xl border border-red-200 bg-white p-5 shadow-sm dark:border-red-900 dark:bg-gray-900">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-red-700 dark:bg-red-950/50 dark:text-red-300">
                      <Lightbulb size={12} />
                      Latest recorded anomaly
                    </div>
                    <h3 className="mt-3 text-xl font-black tracking-tight text-gray-900 dark:text-white">
                      {anomaly.anomalyLabel || anomaly.anomalyCode || 'Anomaly recorded'}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                      This section shows the latest breach or anomaly captured for the container PIN.
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm md:min-w-[240px]">
                    <div className="rounded-2xl bg-red-50 px-3 py-2 dark:bg-red-950/30">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-300">Status</p>
                      <p className="mt-1 font-bold text-red-900 dark:text-red-100">{anomaly.status || 'Not available'}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 px-3 py-2 dark:bg-gray-800">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Source</p>
                      <p className="mt-1 font-bold text-gray-900 dark:text-white">{anomaly.source || 'Not available'}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                    <DetailRow label="Event ID" value={anomaly.eventId || 'Not available'} />
                    <DetailRow label="Type" value={anomaly.anomalyType || 'Not available'} />
                    <DetailRow label="Detected at" value={formatDateTime(anomaly.detectedAt, locale)} />
                    <DetailRow label="Last observed" value={formatDateTime(anomaly.lastObservedAt, locale)} />
                    <DetailRow label="Resolved at" value={formatDateTime(anomaly.resolvedAt, locale)} />
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                    <DetailRow label="Blockchain status" value={anomaly.blockchain?.status || 'Not available'} />
                    <DetailRow label="Network" value={anomaly.blockchain?.network || 'Not available'} />
                    <DetailRow label="Anchored at" value={formatDateTime(anomaly.blockchain?.anchoredAt, locale)} />
                    <DetailRow
                      label="Explorer"
                      value={anomaly.blockchain?.explorerUrl ? (
                        <a
                          href={anomaly.blockchain.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Open proof <ExternalLink size={13} />
                        </a>
                      ) : 'Not available'}
                    />
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <Radio size={16} className="text-blue-500" />
                    <h3 className="text-sm font-bold">Connection check</h3>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    Middleware endpoint is being used as the stable source instead of directly coupling the app to device internals.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <MapPin size={16} className="text-emerald-500" />
                    <h3 className="text-sm font-bold">GPS snapshot</h3>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    {liveGps?.lat != null && liveGps?.lng != null
                      ? `Latest box coordinates: ${formatNumber(liveGps.lat, 5)}, ${formatNumber(liveGps.lng, 5)}`
                      : 'No recent GPS coordinates were provided in the latest telemetry snapshot.'}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <Activity size={16} className="text-amber-500" />
                    <h3 className="text-sm font-bold">Decision summary</h3>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    {payload.transit?.useDecision?.label || payload.outcome?.message || 'No decision summary available.'}
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
