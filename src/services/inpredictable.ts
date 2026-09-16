import { TeamRating } from '../types';

/**
 * Inpredictable Generic Points Favored (GPF) Market Power Ratings
 * Directly sourced from https://stats.inpredictable.com/rankings/nfl.php
 * GPF represents points favored by against an average opponent on a neutral field.
 */
export const INPREDICTABLE_SOURCE_URL = 'https://stats.inpredictable.com/rankings/nfl.php';

// Verified GPF Ratings from https://stats.inpredictable.com/rankings/nfl.php (As of September 16, 2026)
export const INPREDICTABLE_GPF_RATINGS: Record<string, number> = {
  LAR: 4.8,
  BUF: 4.7,
  SF: 4.7,
  BAL: 4.3,
  CHI: 4.1,
  PHI: 3.9,
  KC: 3.4,
  SEA: 3.0,
  HOU: 2.6,
  CIN: 1.8,
  LAC: 1.8,
  DAL: 1.6,
  DEN: 1.0,
  JAX: 0.9,
  DET: 0.8,
  MIN: 0.7,
  NE: 0.5,
  TB: 0.2,
  GB: -0.2,
  NYG: -1.0,
  WAS: -1.0,
  IND: -1.6,
  NO: -1.9,
  CAR: -2.1,
  PIT: -2.2,
  ARI: -2.2,
  LV: -3.2,
  TEN: -5.1,
  NYJ: -5.2,
  ATL: -5.8,
  CLE: -6.6,
  MIA: -6.8,
};

// Mapping for any alias abbreviations between inpredictable and NFL standards
const INPREDICTABLE_ID_MAP: Record<string, string> = {
  LA: 'LAR',
  ARZ: 'ARI',
  JAC: 'JAX',
  WSH: 'WAS',
  SD: 'LAC',
  OAK: 'LV',
  STL: 'LAR',
};

export interface InpredictableFetchResult {
  ratings: Record<string, number>;
  source: 'live' | 'cached';
  timestamp: string;
  asOf?: string;
  details?: Record<string, { rank: number; gpf: number; ogpf?: number; dgpf?: number }>;
}

/**
 * Parse raw HTML from https://stats.inpredictable.com/rankings/nfl.php
 */
export function parseInpredictableHtml(html: string): {
  asOf?: string;
  ratings: Record<string, number>;
  details: Record<string, { rank: number; gpf: number; ogpf?: number; dgpf?: number }>;
} {
  const asOfMatch = html.match(/<th[^>]*>\s*As of\s+([^<]+)<\/th>/i);
  const asOf = asOfMatch ? asOfMatch[1].trim() : undefined;

  const rows = html.split('<tr>');
  const ratings: Record<string, number> = {};
  const details: Record<string, { rank: number; gpf: number; ogpf?: number; dgpf?: number }> = {};

  for (const r of rows) {
    const teamMatch = r.match(/&nbsp;?([A-Z]{2,3})<\/td>/i);
    const rankMatch = r.match(/<td>(\d{1,2})<\/td>/i);
    if (teamMatch) {
      let teamCode = teamMatch[1].toUpperCase();
      teamCode = INPREDICTABLE_ID_MAP[teamCode] || teamCode;

      const divides = [...r.matchAll(/<td class=divide>([+-]?\d+\.?\d*)<\/td>/gi)].map((m) =>
        parseFloat(m[1])
      );

      if (divides.length >= 1 && !isNaN(divides[0])) {
        const gpf = divides[0];
        const ogpf = divides[1];
        const dgpf = divides[2];

        ratings[teamCode] = gpf;
        details[teamCode] = {
          rank: rankMatch ? parseInt(rankMatch[1], 10) : 0,
          gpf,
          ogpf: !isNaN(ogpf) ? ogpf : undefined,
          dgpf: !isNaN(dgpf) ? dgpf : undefined,
        };
      }
    }
  }

  return { asOf, ratings, details };
}

/**
 * Fetch live ratings from inpredictable.com via our proxy server API or fallback to verified GPF dataset
 */
export async function fetchInpredictableRatings(): Promise<InpredictableFetchResult> {
  // 1. Try our internal serverless API route (/api/inpredictable) first (bypasses browser CORS)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('/api/inpredictable', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.ratings && Object.keys(data.ratings).length >= 28) {
        return {
          ratings: data.ratings,
          source: 'live',
          timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          asOf: data.asOf || 'Latest',
          details: data.details,
        };
      }
    }
  } catch (err) {
    console.warn('/api/inpredictable unavailable, trying fallback proxies...', err);
  }

  // 2. Try CORS proxy as secondary option
  const proxyUrls = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(INPREDICTABLE_SOURCE_URL)}`,
  ];

  for (const url of proxyUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        const parsed = parseInpredictableHtml(text);
        if (Object.keys(parsed.ratings).length >= 28) {
          return {
            ratings: parsed.ratings,
            source: 'live',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            asOf: parsed.asOf || 'Latest',
            details: parsed.details,
          };
        }
      }
    } catch {
      // Continue to next endpoint or fallback
    }
  }

  // 3. Graceful fallback to verified inpredictable GPF dataset
  return {
    ratings: INPREDICTABLE_GPF_RATINGS,
    source: 'cached',
    timestamp: new Date().toLocaleDateString(),
    asOf: 'September 16, 2026',
  };
}

/**
 * Merges inpredictable GPF ratings into the current TeamRating array
 */
export function applyInpredictableToRatings(
  currentRatings: TeamRating[],
  gpfMap: Record<string, number> = INPREDICTABLE_GPF_RATINGS,
  applyToUserRatings: boolean = false
): TeamRating[] {
  return currentRatings.map((rating) => {
    const marketGpf = gpfMap[rating.teamId];
    if (marketGpf !== undefined) {
      return {
        ...rating,
        marketRating: marketGpf,
        ...(applyToUserRatings ? { userRating: marketGpf } : {}),
      };
    }
    return rating;
  });
}
