/** NEA 2-hour weather forecast on data.gov.sg. */
export const CLOUD_DATASET_URL =
  "https://data.gov.sg/datasets/d_3f9e064e25005b0e42969944ccaf2e7a/view";

export type CloudKind = "clear" | "partly" | "cloudy" | "storm";

export type CloudArea = {
  name: string;
  latitude: number;
  longitude: number;
  forecast: string;
  coverage: number;
  kind: CloudKind;
};

export type CloudReading = {
  requestedDateTime: string;
  timestamp: string;
  updateTimestamp: string;
  validPeriod: { start: string; end: string };
  clampedToLatest: boolean;
  areas: CloudArea[];
};

const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function isDateTimeLocal(value: string): boolean {
  return DATE_TIME_PATTERN.test(value);
}

export function classifyForecast(forecast: string): {
  coverage: number;
  kind: CloudKind;
} {
  const text = forecast.toLowerCase();

  if (
    text.includes("thunder") ||
    text.includes("shower") ||
    text.includes("rain")
  ) {
    return {
      coverage: text.includes("heavy") ? 0.95 : 0.82,
      kind: "storm",
    };
  }

  if (text.includes("partly")) {
    return { coverage: 0.46, kind: "partly" };
  }

  if (
    text.includes("cloud") ||
    text.includes("fog") ||
    text.includes("mist") ||
    text.includes("haz")
  ) {
    return { coverage: 0.78, kind: "cloudy" };
  }

  if (text.includes("fair") || text.includes("windy")) {
    return { coverage: 0.16, kind: "clear" };
  }

  return { coverage: 0.4, kind: "partly" };
}

export function singaporeDateTimeLocal(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const minute = Number(value("minute"));
  const floored = String(Math.floor(minute / 30) * 30).padStart(2, "0");

  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${floored}`;
}

export function formatSingaporeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}
