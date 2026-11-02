"use client";

import { useEffect, useRef, useState } from "react";
import type { Layer, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CloudArea } from "@/app/lib/cloud";

/** Required by OneMap terms when using the basemap. */
const ONE_MAP_ATTRIBUTION =
  '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:20px;width:20px;" alt="OneMap"/>&nbsp;<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a>&nbsp;&copy;&nbsp;contributors&nbsp;&#124;&nbsp;<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>';

type LeafletModule = typeof import("leaflet");

type CloudCanvasLayer = Layer & {
  _map: LeafletMap;
  _canvas: HTMLCanvasElement;
  _buffer: HTMLCanvasElement;
  _draw: () => void;
};

function pixelsPerMeter(map: LeafletMap, L: LeafletModule): number {
  const center = map.getCenter();
  const start = map.latLngToLayerPoint(center);
  const end = map.latLngToLayerPoint(L.latLng(center.lat, center.lng + 0.01));
  const meters =
    0.01 * 111_320 * Math.cos((center.lat * Math.PI) / 180);
  return Math.abs(end.x - start.x) / meters;
}

function paintCloud(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  area: CloudArea,
  pxPerMeter: number,
) {
  const reach = (1600 + area.coverage * 3200) * pxPerMeter;
  const scattered = area.kind === "clear" || area.kind === "partly";
  const puffs: [number, number, number][] = scattered
    ? [
        [0, 0, 0.62],
        [-0.42, 0.12, 0.4],
        [0.38, -0.08, 0.36],
      ]
    : [
        [0, 0, 1],
        [-0.48, 0.08, 0.74],
        [0.52, 0.04, 0.7],
        [-0.12, -0.36, 0.58],
        [0.22, -0.28, 0.52],
        [0.04, 0.34, 0.48],
      ];

  const tone = {
    clear: { rgb: "198, 210, 224", peak: 0.34 },
    partly: { rgb: "176, 190, 206", peak: 0.58 },
    cloudy: { rgb: "132, 150, 170", peak: 0.66 },
    storm: { rgb: "62, 76, 96", peak: 0.72 },
  }[area.kind];
  const angle = (hashName(area.name) % 360) * (Math.PI / 180);

  for (const [ox, oy, scale] of puffs) {
    const rotatedX = ox * Math.cos(angle) - oy * Math.sin(angle);
    const rotatedY = ox * Math.sin(angle) + oy * Math.cos(angle);
    const centerX = x + rotatedX * reach;
    const centerY = y + rotatedY * reach;
    const radius = reach * scale * (area.kind === "clear" ? 0.5 : 1);
    const gradient = context.createRadialGradient(
      centerX,
      centerY,
      radius * 0.08,
      centerX,
      centerY,
      radius,
    );
    gradient.addColorStop(0, `rgba(${tone.rgb}, ${tone.peak})`);
    gradient.addColorStop(0.42, `rgba(${tone.rgb}, ${tone.peak * 0.82})`);
    gradient.addColorStop(0.75, `rgba(${tone.rgb}, ${tone.peak * 0.28})`);
    gradient.addColorStop(1, `rgba(${tone.rgb}, 0)`);
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fill();
  }
}

function hashName(name: string): number {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

function createCloudLayer(L: LeafletModule, areas: CloudArea[]): Layer {
  const LayerClass = L.Layer.extend({
    onAdd(this: CloudCanvasLayer, map: LeafletMap) {
      this._map = map;
      const canvas = L.DomUtil.create(
        "canvas",
        "leaflet-cloud-layer",
      ) as HTMLCanvasElement;
      canvas.setAttribute("aria-hidden", "true");
      this._canvas = canvas;
      map.getPanes().overlayPane?.appendChild(canvas);

      this._draw = () => {
        const size = map.getSize();
        const topLeft = map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(canvas, topLeft);

        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.floor(size.x * ratio));
        canvas.height = Math.max(1, Math.floor(size.y * ratio));
        canvas.style.width = `${size.x}px`;
        canvas.style.height = `${size.y}px`;

        const context = canvas.getContext("2d");
        const buffer =
          this._buffer ??
          (this._buffer = document.createElement("canvas"));
        if (buffer.width !== canvas.width || buffer.height !== canvas.height) {
          buffer.width = canvas.width;
          buffer.height = canvas.height;
        }
        const bufferContext = buffer.getContext("2d");
        if (!context || !bufferContext) return;

        bufferContext.setTransform(ratio, 0, 0, ratio, 0, 0);
        bufferContext.clearRect(0, 0, size.x, size.y);

        const scale = pixelsPerMeter(map, L);
        for (const area of areas) {
          const point = map.latLngToLayerPoint([
            area.latitude,
            area.longitude,
          ]);
          paintCloud(
            bufferContext,
            point.x - topLeft.x,
            point.y - topLeft.y,
            area,
            scale,
          );
        }

        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.globalAlpha = 0.42;
        context.drawImage(buffer, 0, 0);
        context.globalAlpha = 1;
      };

      map.on("move zoom resize", this._draw);
      this._draw();
    },
    onRemove(this: CloudCanvasLayer, map: LeafletMap) {
      map.off("move zoom resize", this._draw);
      this._canvas.remove();
    },
  });

  return new LayerClass();
}

type SingaporeMapProps = {
  areas: CloudArea[];
  focusArea: string | null;
};

export default function SingaporeMap({ areas, focusArea }: SingaporeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<LeafletMap | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let instance: LeafletMap | undefined;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      const southWest = L.latLng(1.144, 103.535);
      const northEast = L.latLng(1.494, 104.502);

      instance = L.map(containerRef.current, {
        center: L.latLng(1.3521, 103.8198),
        zoom: 12,
        minZoom: 11,
        maxZoom: 19,
        maxBounds: L.latLngBounds(southWest, northEast),
      });

      L.tileLayer(
        "https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png",
        {
          detectRetina: true,
          maxZoom: 19,
          minZoom: 11,
          attribution: ONE_MAP_ATTRIBUTION,
        },
      ).addTo(instance);

      setMap(instance);
    })();

    return () => {
      cancelled = true;
      instance?.remove();
      setMap(null);
    };
  }, []);

  useEffect(() => {
    if (!map) return;

    let cancelled = false;
    let cloudLayer: Layer | undefined;
    let markers: Layer | undefined;

    (async () => {
      const L = await import("leaflet");
      if (cancelled) return;

      cloudLayer = createCloudLayer(L, areas).addTo(map);
      const group = L.layerGroup();
      for (const area of areas) {
        L.circleMarker([area.latitude, area.longitude], {
          radius: 22,
          opacity: 0,
          fillOpacity: 0,
          interactive: true,
        })
          .bindTooltip(`${area.name}: ${area.forecast}`, {
            direction: "top",
            opacity: 0.95,
          })
          .addTo(group);
      }
      group.addTo(map);
      markers = group;
    })();

    return () => {
      cancelled = true;
      cloudLayer?.remove();
      markers?.remove();
    };
  }, [map, areas]);

  useEffect(() => {
    if (!map || !focusArea) return;
    const area = areas.find((item) => item.name === focusArea);
    if (!area) return;
    map.flyTo([area.latitude, area.longitude], Math.max(map.getZoom(), 13), {
      duration: 0.6,
    });
  }, [map, areas, focusArea]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      role="application"
      aria-label="Singapore map from OneMap with cloud cover"
    />
  );
}
