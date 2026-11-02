"use client";

import {
  CLOUD_DATASET_URL,
  formatSingaporeTime,
  type CloudKind,
  type CloudReading,
} from "@/app/lib/cloud";

const KIND_LABEL: Record<CloudKind, string> = {
  clear: "Fair",
  partly: "Partly cloudy",
  cloudy: "Cloudy",
  storm: "Showers",
};

const KIND_SWATCH: Record<CloudKind, string> = {
  clear: "bg-white ring-1 ring-zinc-300",
  partly: "bg-zinc-200",
  cloudy: "bg-zinc-300",
  storm: "bg-slate-500",
};

type CloudSidebarProps = {
  dateTime: string;
  maxDateTime: string;
  reading: CloudReading | null;
  loading: boolean;
  error: string | null;
  onDateTimeChange: (value: string) => void;
  onSelectArea: (name: string) => void;
};

export default function CloudSidebar({
  dateTime,
  maxDateTime,
  reading,
  loading,
  error,
  onDateTimeChange,
  onSelectArea,
}: CloudSidebarProps) {
  const counts = new Map<string, number>();
  for (const area of reading?.areas ?? []) {
    counts.set(area.forecast, (counts.get(area.forecast) ?? 0) + 1);
  }

  return (
    <aside className="flex max-h-80 w-full shrink-0 flex-col gap-4 overflow-y-auto border-b border-zinc-200 bg-white p-4 md:max-h-none md:w-80 md:border-r md:border-b-0 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          Cloud formation
        </h2>
        <p className="mt-1 text-sm leading-6 text-zinc-500">
          Cloud cover for each forecast area, from the NEA 2-hour weather
          forecast on{" "}
          <a
            href={CLOUD_DATASET_URL}
            className="font-medium text-zinc-800 underline decoration-zinc-300 underline-offset-2 dark:text-zinc-200"
            target="_blank"
            rel="noopener noreferrer"
          >
            data.gov.sg
          </a>
          .
        </p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Date and time
        <input
          type="datetime-local"
          value={dateTime}
          min="2016-03-01T00:00"
          max={maxDateTime || undefined}
          step={1800}
          onChange={(event) => onDateTimeChange(event.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 font-normal text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <span className="font-normal text-zinc-500">Singapore time (SGT)</span>
      </label>

      <p className="text-sm text-zinc-600 dark:text-zinc-400" aria-live="polite">
        {loading
          ? "Loading cloud forecast…"
          : error
            ? error
            : reading
              ? `Showing clouds for ${formatSingaporeTime(reading.timestamp)}.`
              : "Choose a date and time."}
      </p>

      {reading?.clampedToLatest ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          That time is ahead of the latest forecast. The map is using the
          newest published reading.
        </p>
      ) : null}

      {reading ? (
        <p className="text-sm text-zinc-500">
          Valid {formatSingaporeTime(reading.validPeriod.start)} to{" "}
          {formatSingaporeTime(reading.validPeriod.end)}.
        </p>
      ) : null}

      {counts.size > 0 ? (
        <ul className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          {[...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([forecast, count]) => (
              <li key={forecast} className="flex justify-between gap-3">
                <span>{forecast}</span>
                <span className="text-zinc-500">{count}</span>
              </li>
            ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
        {(Object.keys(KIND_LABEL) as CloudKind[]).map((kind) => (
          <span key={kind} className="flex items-center gap-1.5">
            <span
              className={`inline-block size-3 rounded-full ${KIND_SWATCH[kind]}`}
            />
            {KIND_LABEL[kind]}
          </span>
        ))}
      </div>

      {reading && reading.areas.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {reading.areas.map((area) => (
            <li key={area.name}>
              <button
                type="button"
                onClick={() => onSelectArea(area.name)}
                className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`inline-block size-2.5 shrink-0 rounded-full ${KIND_SWATCH[area.kind]}`}
                  />
                  {area.name}
                </span>
                <span className="text-right text-zinc-500">{area.forecast}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}
