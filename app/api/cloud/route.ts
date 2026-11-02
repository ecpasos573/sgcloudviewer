import { NextRequest } from "next/server";
import {
  findStoredCloudReading,
  saveCloudReading,
} from "@/app/database/cloud-store";
import {
  classifyForecast,
  isDateTimeLocal,
  type CloudArea,
  type CloudReading,
} from "@/app/lib/cloud";

type ForecastPayload = {
  area_metadata?: {
    name: string;
    label_location: { latitude: number; longitude: number };
  }[];
  items?: {
    update_timestamp?: string;
    timestamp?: string;
    valid_period?: { start: string; end: string };
    forecasts?: { area: string; forecast: string }[];
  }[];
};

export async function GET(request: NextRequest) {
  const dateTime = request.nextUrl.searchParams.get("dateTime") ?? "";

  if (!isDateTimeLocal(dateTime)) {
    return Response.json(
      { error: "Choose a valid date and time." },
      { status: 400 },
    );
  }

  try {
    const stored = await findStoredCloudReading(dateTime);
    if (stored) return Response.json(stored);
  } catch (error) {
    console.error("Could not read the stored cloud reading.", error);
  }

  const source = new URL(
    "https://api.data.gov.sg/v1/environment/2-hour-weather-forecast",
  );
  source.searchParams.set("date_time", `${dateTime}:00`);

  let payload: ForecastPayload;
  try {
    const response = await fetch(source, { cache: "no-store" });
    if (!response.ok) {
      return Response.json(
        { error: "Weather data is unavailable right now." },
        { status: 502 },
      );
    }
    payload = (await response.json()) as ForecastPayload;
  } catch {
    return Response.json(
      { error: "Weather data is unavailable right now." },
      { status: 502 },
    );
  }

  const item = payload.items?.[0];
  const forecasts = item?.forecasts ?? [];
  const areas = payload.area_metadata ?? [];

  if (!item?.timestamp || forecasts.length === 0 || areas.length === 0) {
    return Response.json(
      { error: "No cloud forecast was published for that date and time." },
      { status: 404 },
    );
  }

  const forecastByArea = new Map(
    forecasts.map((forecast) => [forecast.area, forecast.forecast]),
  );

  const cloudAreas: CloudArea[] = areas
    .flatMap((area) => {
      const forecast = forecastByArea.get(area.name);
      if (!forecast) return [];
      const classified = classifyForecast(forecast);
      return [
        {
          name: area.name,
          latitude: area.label_location.latitude,
          longitude: area.label_location.longitude,
          forecast,
          coverage: classified.coverage,
          kind: classified.kind,
        },
      ];
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const requested = Date.parse(`${dateTime}:00+08:00`);
  const observed = Date.parse(item.timestamp);

  const reading: CloudReading = {
    requestedDateTime: dateTime,
    timestamp: item.timestamp,
    updateTimestamp: item.update_timestamp ?? item.timestamp,
    validPeriod: item.valid_period ?? {
      start: item.timestamp,
      end: item.timestamp,
    },
    clampedToLatest: requested - observed > 45 * 60 * 1000,
    areas: cloudAreas,
  };

  try {
    await saveCloudReading(reading);
  } catch (error) {
    console.error("Could not store the cloud reading.", error);
  }

  return Response.json(reading);
}
