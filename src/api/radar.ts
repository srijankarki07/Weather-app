/**
 * Radar tile manifest.
 *
 * RainViewer publishes free, keyless radar and infrared-satellite tiles. The
 * manifest lists every available timestamp; the tiles themselves are plain
 * `{z}/{x}/{y}` PNGs that Leaflet can consume directly, so nothing here needs
 * to decode imagery.
 *
 * PLAN 4.1 wants the user to scrub through time and watch precipitation move.
 * That means holding the whole frame list and swapping the tile URL as the
 * scrubber moves, which is why the manifest is fetched separately from the map.
 */

import { RAINVIEWER_MANIFEST } from "../config";
import { getJson } from "./http";

export interface RadarFrame {
  /** Unix seconds. */
  time: number;
  /** Path fragment, e.g. "/v2/radar/60fdbbf2ec2f". */
  path: string;
}

export interface RadarManifest {
  host: string;
  radar: {
    past: RadarFrame[];
    nowcast: RadarFrame[];
  };
  satellite: {
    infrared: RadarFrame[];
  };
}

export interface RadarFrames {
  host: string;
  /** Past and forecast frames, in ascending time order. */
  radar: RadarFrame[];
  infrared: RadarFrame[];
  /** Index of the frame closest to now, for the scrubber's initial position. */
  nowIndex: number;
  generatedAt: number;
}

/** Universal Blue reads clearly over both the light and dark basemaps. */
const COLOR_SCHEME = 4;
/** `1_1` = smoothed tiles, snow shown separately from rain. */
const OPTIONS = "1_1";

/**
 * RainViewer's tile URL template, ready for Leaflet. The frame's timestamp is
 * baked in, so advancing time means handing Leaflet a new URL.
 */
export function radarTileUrl(
  host: string,
  frame: RadarFrame,
  layer: "radar" | "infrared"
): string {
  if (layer === "infrared") {
    return `${host}${frame.path}/256/{z}/{x}/{y}/0/0_0.png`;
  }
  return `${host}${frame.path}/256/{z}/{x}/{y}/${COLOR_SCHEME}/${OPTIONS}.png`;
}

export async function fetchRadarFrames(signal?: AbortSignal): Promise<RadarFrames> {
  const raw = await getJson<RadarManifest>(RAINVIEWER_MANIFEST, {
    signal,
    timeoutMs: 8000,
  });

  const past = raw.radar?.past ?? [];
  const nowcast = raw.radar?.nowcast ?? [];
  const radar = [...past, ...nowcast].sort((a, b) => a.time - b.time);
  const infrared = (raw.satellite?.infrared ?? []).slice().sort(
    (a, b) => a.time - b.time
  );

  /*
   * The scrubber should start at "now", which is the last past frame — not the
   * middle of the combined list, because nowcast frames are predictions and
   * opening on a forecast would present a guess as an observation.
   */
  const lastPast = past[past.length - 1];
  const nowIndex = lastPast
    ? Math.max(
        0,
        radar.findIndex((frame) => frame.time === lastPast.time)
      )
    : 0;

  return {
    host: raw.host,
    radar,
    infrared,
    nowIndex,
    generatedAt: Date.now(),
  };
}
