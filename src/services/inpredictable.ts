import { TeamRating } from '../types';

/**
 * Inpredictable Generic Points Favored (GPF) Market Power Ratings
 * Directly sourced from https://stats.inpredictable.com/rankings/nfl.php
 * GPF represents points favored by against an average opponent on a neutral field.
 */
export const INPREDICTABLE_SOURCE_URL = 'https://stats.inpredictable.com/rankings/nfl.php';

export const INPREDICTABLE_GPF_RATINGS: Record<string, number> = {
  LAR: 5.8,
  BUF: 4.4,
  SEA: 4.1,
  BAL: 3.4,
  KC: 3.1,
  NE: 2.9,
  PHI: 2.6,
  DET: 2.5,
  SF: 2.3,
  DAL: 2.2,
  CHI: 2.1,
  LAC: 1.9,
  DEN: 1.9,
  GB: 1.5,
  CIN: 1.5,
  MIN: 1.3,
  JAX: 1.2,
  HOU: 1.2,
  TB: -0.3,
  WAS: -1.1,
  PIT: -1.2,
  IND: -1.8,
  NYG: -2.5,
  CAR: -2.7,
  NO: -2.8,
  ATL: -3.0,
  LV: -4.1,
  NYJ: -4.2,
  TEN: -4.4,
  CLE: -5.6,
  MIA: -5.9,
  ARI: -6.3,
};

// Mapping for any alias abbreviations between inpredictable and NFL standards
const INPREDICTABLE_ID_MAP: Record<string, string> = {
  LA: 'LAR',
  ARZ: 'ARI',
  JAC: 'JAX',
};

/**
 * Parse raw HTML from https://stats.inpredictable.com/rankings/nfl.php
 */
export function parseInpredictableHtml(html: string): Record<string, number> {
  const regex = />&nbsp;?([A-Z]{2,3})<\/td>[\s\S]*?<td class=divide>([+-]?\d+\.?\d*)<\/td>/gi;
  let match: RegExpExecArray | null;
  const results: Record<string, number> = {};

  while ((match = regex.exec(html)) !== null) {
    const rawId = match[1];
    const teamId = INPREDICTABLE_ID_MAP[rawId] || rawId;
    const gpf = parseFloat(match[2]);
    if (!isNaN(gpf)) {
      results[teamId] = gpf;
    }
  }

  return results;
}

/**
 * Fetch live ratings from inpredictable.com or fallback to official GPF dataset
 */
export async function fetchInpredictableRatings(): Promise<{
  ratings: Record<string, number>;
  source: 'live' | 'cached';
  timestamp: string;
}> {
  // Try fetching via direct fetch or CORS proxy
  const endpoints = [
    INPREDICTABLE_SOURCE_URL,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(INPREDICTABLE_SOURCE_URL)}`,
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        const parsed = parseInpredictableHtml(text);
        if (Object.keys(parsed).length >= 30) {
          return {
            ratings: parsed,
            source: 'live',
            timestamp: new Date().toLocaleTimeString(),
          };
        }
      }
    } catch {
      // Continue to next endpoint or fallback
    }
  }

  // Graceful fallback to verified inpredictable GPF dataset
  return {
    ratings: INPREDICTABLE_GPF_RATINGS,
    source: 'cached',
    timestamp: new Date().toLocaleDateString(),
  };
}

/**
 * Merges inpredictable GPF ratings into the current TeamRating array
 */
export function applyInpredictableToRatings(
  currentRatings: TeamRating[],
  gpfMap: Record<string, number> = INPREDICTABLE_GPF_RATINGS
): TeamRating[] {
  return currentRatings.map((rating) => {
    const marketGpf = gpfMap[rating.teamId];
    if (marketGpf !== undefined) {
      return {
        ...rating,
        marketRating: marketGpf,
      };
    }
    return rating;
  });
}
