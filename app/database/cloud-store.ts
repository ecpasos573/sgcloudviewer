import { prisma } from "@/app/database/client";
import type { CloudArea, CloudKind, CloudReading } from "@/app/lib/cloud";

const CLOUD_KINDS = new Set<CloudKind>(["clear", "partly", "cloudy", "storm"]);

function cloudKind(value: string): CloudKind {
  return CLOUD_KINDS.has(value as CloudKind) ? (value as CloudKind) : "partly";
}

function areaData(areas: CloudArea[]) {
  return areas.map((area) => ({
    name: area.name,
    latitude: area.latitude,
    longitude: area.longitude,
    forecast: area.forecast,
    coverage: area.coverage,
    kind: area.kind,
  }));
}

export async function findStoredCloudReading(
  requestedDateTime: string,
): Promise<CloudReading | null> {
  const row = await prisma.cloudReading.findUnique({
    where: { requestedDateTime },
    include: { areas: { orderBy: { name: "asc" } } },
  });

  if (!row || row.clampedToLatest) return null;

  return {
    requestedDateTime: row.requestedDateTime,
    timestamp: row.timestamp.toISOString(),
    updateTimestamp: row.updateTimestamp.toISOString(),
    validPeriod: {
      start: row.validFrom.toISOString(),
      end: row.validTo.toISOString(),
    },
    clampedToLatest: row.clampedToLatest,
    areas: row.areas.map((area) => ({
      name: area.name,
      latitude: area.latitude,
      longitude: area.longitude,
      forecast: area.forecast,
      coverage: area.coverage,
      kind: cloudKind(area.kind),
    })),
  };
}

export async function saveCloudReading(reading: CloudReading) {
  const areas = areaData(reading.areas);
  const data = {
    timestamp: new Date(reading.timestamp),
    updateTimestamp: new Date(reading.updateTimestamp),
    validFrom: new Date(reading.validPeriod.start),
    validTo: new Date(reading.validPeriod.end),
    clampedToLatest: reading.clampedToLatest,
  };

  await prisma.cloudReading.upsert({
    where: { requestedDateTime: reading.requestedDateTime },
    create: {
      requestedDateTime: reading.requestedDateTime,
      ...data,
      areas: { create: areas },
    },
    update: {
      ...data,
      areas: {
        deleteMany: {},
        create: areas,
      },
    },
  });
}
