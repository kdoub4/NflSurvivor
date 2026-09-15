// Vercel Serverless Function for 6-character room code synchronization
// Supports Vercel KV (Upstash Redis) automatically when provisioned in Vercel Dashboard

// In-memory container fallback when Vercel KV is not yet provisioned
const memoryStore = (globalThis as unknown as { __survivorRooms?: Map<string, unknown> }).__survivorRooms || new Map<string, unknown>();
(globalThis as unknown as { __survivorRooms?: Map<string, unknown> }).__survivorRooms = memoryStore;

function setCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
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

  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  const hasKv = Boolean(kvUrl && kvToken);

  try {
    if (req.method === 'GET') {
      const codeParam = req.query?.code || (new URL(req.url, 'http://localhost').searchParams.get('code'));
      const cleanCode = typeof codeParam === 'string' ? codeParam.trim().toUpperCase() : '';

      if (!cleanCode || cleanCode.length !== 6) {
        res.status(400).json({ success: false, error: 'Invalid 6-character room code' });
        return;
      }

      if (hasKv) {
        const kvRes = await fetch(`${kvUrl}/get/survivor_room_${cleanCode}`, {
          headers: {
            Authorization: `Bearer ${kvToken}`,
          },
        });

        if (kvRes.ok) {
          const kvData = await kvRes.json();
          let parsed = kvData?.result;
          if (typeof parsed === 'string') {
            try {
              parsed = JSON.parse(parsed);
            } catch {
              // keep as string
            }
          }

          if (!parsed) {
            res.status(404).json({ success: false, error: `Room ${cleanCode} not found on Vercel KV` });
            return;
          }

          res.status(200).json({
            success: true,
            code: cleanCode,
            data: parsed,
            kvConnected: true,
          });
          return;
        }
      }

      // In-memory fallback
      const inMem = memoryStore.get(cleanCode);
      if (!inMem) {
        res.status(404).json({
          success: false,
          error: `Room ${cleanCode} not found. (Vercel KV not yet linked, using container memory).`,
          kvConnected: false,
        });
        return;
      }

      res.status(200).json({
        success: true,
        code: cleanCode,
        data: inMem,
        kvConnected: false,
      });
      return;
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          // ignore
        }
      }

      const code = body?.code;
      const data = body?.data;
      const cleanCode = typeof code === 'string' ? code.trim().toUpperCase() : '';

      if (!cleanCode || cleanCode.length !== 6 || !data) {
        res.status(400).json({ success: false, error: 'Missing 6-character code or data payload' });
        return;
      }

      if (hasKv) {
        // Save to Vercel KV / Upstash with 180 days TTL
        const serialized = JSON.stringify(data);
        const kvRes = await fetch(`${kvUrl}/set/survivor_room_${cleanCode}?ex=15552000`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${kvToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(serialized),
        });

        if (!kvRes.ok) {
          const errText = await kvRes.text();
          console.error('Vercel KV write error:', errText);
        }
      }

      // Also store in memory cache
      memoryStore.set(cleanCode, data);

      res.status(200).json({
        success: true,
        code: cleanCode,
        updatedAt: data.updatedAt || new Date().toISOString(),
        kvConnected: hasKv,
      });
      return;
    }

    res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  } catch (err: unknown) {
    console.error('API /api/sync error:', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
