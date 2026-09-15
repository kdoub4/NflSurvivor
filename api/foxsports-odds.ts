// Vercel Serverless Function for proxying FOX Sports closing odds

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
    const weekParam = req.query?.week || new URL(req.url, 'http://localhost').searchParams.get('week');
    const parsedWeek = parseInt(weekParam || '1', 10);
    const targetWeek = isNaN(parsedWeek) ? 1 : parsedWeek;

    const response = await fetch('https://www.foxsports.com/betting/nfl/games', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    const html = await response.text();
    const match = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);

    const odds: Record<string, string> = {};

    if (match) {
      const arr = JSON.parse(match[1]);
      const resolve = (val: unknown): unknown =>
        typeof val === 'number' && val >= 0 && val < arr.length ? arr[val] : val;

      let weekModules: unknown[] | null = null;
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const name = resolve(item.name);
          const title = resolve(item.title);
          const str = `${typeof name === 'string' ? name : ''} ${typeof title === 'string' ? title : ''}`;
          if (new RegExp(`WEEK\\s*${targetWeek}\\s*ODDS`, 'i').test(str) && item.modules) {
            weekModules = resolve(item.modules) as unknown[];
            break;
          }
        }
      }

      if (weekModules && Array.isArray(weekModules)) {
        for (const modIdx of weekModules) {
          const mod = resolve(modIdx) as Record<string, unknown> | undefined;
          if (!mod) continue;
          const model = resolve(mod.model) as Record<string, unknown> | undefined;
          if (!model) continue;
          const oddsObj = resolve(model.odds) as Record<string, unknown> | undefined;
          if (!oddsObj) continue;
          const rows = resolve(oddsObj.rows) as unknown[] | undefined;
          if (!rows || rows.length < 2) continue;

          const r1 = resolve(rows[0]) as Record<string, unknown> | undefined;
          const r2 = resolve(rows[1]) as Record<string, unknown> | undefined;
          if (!r1 || !r2) continue;

          const t1 = resolve(r1.text);
          const t2 = resolve(r2.text);

          const r1Vals = resolve(r1.values) as unknown[] | undefined;
          const r2Vals = resolve(r2.values) as unknown[] | undefined;

          const s1Obj = r1Vals && r1Vals.length > 0 ? (resolve(r1Vals[0]) as Record<string, unknown>) : null;
          const s2Obj = r2Vals && r2Vals.length > 0 ? (resolve(r2Vals[0]) as Record<string, unknown>) : null;

          const s1 = s1Obj ? resolve(s1Obj.odds) : null;
          const s2 = s2Obj ? resolve(s2Obj.odds) : null;

          if (typeof t1 === 'string' && typeof s1 === 'string') odds[t1] = s1;
          if (typeof t2 === 'string' && typeof s2 === 'string') odds[t2] = s2;
        }
      }
    }

    res.status(200).json({
      success: true,
      week: targetWeek,
      source: 'https://www.foxsports.com/betting/nfl/games',
      odds,
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
