"use client";

import { useEffect, useState } from "react";
import CloudSidebar from "./cloud-sidebar";
import SingaporeMap from "./singapore-map";
import {
  singaporeDateTimeLocal,
  type CloudReading,
} from "@/app/lib/cloud";

export default function CloudViewer() {
  const [dateTime, setDateTime] = useState("");
  const [maxDateTime, setMaxDateTime] = useState("");
  const [reading, setReading] = useState<CloudReading | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  useEffect(() => {
    const now = singaporeDateTimeLocal();
    setDateTime(now);
    setMaxDateTime(now);
  }, []);

  useEffect(() => {
    if (!dateTime) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/cloud?dateTime=${encodeURIComponent(dateTime)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json()) as CloudReading & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(body.error || "Could not load the cloud forecast.");
        }
        setReading(body);
        setSelectedArea(null);
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) return;
        setReading(null);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Could not load the cloud forecast.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [dateTime]);

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <CloudSidebar
        dateTime={dateTime}
        maxDateTime={maxDateTime}
        reading={reading}
        loading={loading}
        error={error}
        onDateTimeChange={setDateTime}
        onSelectArea={setSelectedArea}
      />
      <div className="min-h-0 flex-1">
        <SingaporeMap areas={reading?.areas ?? []} focusArea={selectedArea} />
      </div>
    </div>
  );
}
