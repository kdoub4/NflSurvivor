// Vercel Serverless Function for proxying inpredictable.com market ratings
// Bypasses browser CORS restrictions to fetch real-time GPF power ratings

const ID_MAP: Record<string, string> = {
  LA: 'LAR',
  ARZ: 'ARI',
  JAC: 'JAX',
  WSH: 'WAS',
  SD: 'LAC',
  OAK: 'LV',
  STL: 'LAR',
};

function setCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
}

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const response = await fetch('https://stats.inpredictable.com/rankings/nfl.php', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`stats.inpredictable.com returned HTTP status ${response.status}`);
    }

    const html = await response.text();

    const asOfMatch = html.match(/<th[^>]*>\s*As of\s+([^<]+)<\/th>/i);
    const asOf = asOfMatch ? asOfMatch[1].trim() : 'Latest';

    const rows = html.split('<tr>');
    const ratings: Record<string, number> = {};
    const details: Record<string, { rank: number; gpf: number; ogpf?: number; dgpf?: number }> = {};

    for (const r of rows) {
      const teamMatch = r.match(/&nbsp;?([A-Z]{2,3})<\/td>/i);
      const rankMatch = r.match(/<td>(\d{1,2})<\/td>/i);
      if (teamMatch) {
        let teamCode = teamMatch[1].toUpperCase();
        teamCode = ID_MAP[teamCode] || teamCode;

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

    if (Object.keys(ratings).length < 28) {
      throw new Error(`Incomplete parse: only found ${Object.keys(ratings).length} teams in HTML.`);
    }

    res.status(200).json({
      success: true,
      source: 'live',
      asOf,
      updatedAt: new Date().toISOString(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      teamCount: Object.keys(ratings).length,
      ratings,
      details,
    });
  } catch (err: unknown) {
    console.error('Error fetching stats.inpredictable.com:', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
