import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

function foxSportsApiPlugin(): Plugin {
  return {
    name: 'fox-sports-odds-api',
    configureServer(server) {
      server.middlewares.use('/api/foxsports-odds', async (req, res) => {
        try {
          const parsedUrl = new URL(req.url || '', 'http://localhost:3000');
          const weekParam = parseInt(parsedUrl.searchParams.get('week') || '1', 10);
          const targetWeek = isNaN(weekParam) ? 1 : weekParam;

          const response = await fetch('https://www.foxsports.com/betting/nfl/games', {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              Accept: 'text/html,application/xhtml+xml',
            },
          });

          const html = await response.text();
          const match = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);

          let odds: Record<string, string> = {};

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

          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: true,
              week: targetWeek,
              source: 'https://www.foxsports.com/betting/nfl/games',
              odds,
            })
          );
        } catch (err: unknown) {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              success: false,
              error: err instanceof Error ? err.message : String(err),
            })
          );
        }
      });
    },
  };
}

function syncApiPlugin(): Plugin {
  const syncStore = new Map<string, unknown>();

  return {
    name: 'sync-room-api',
    configureServer(server) {
      server.middlewares.use('/api/sync', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }

        const parsedUrl = new URL(req.url || '', 'http://localhost:3000');

        if (req.method === 'GET') {
          const codeParam = parsedUrl.searchParams.get('code');
          const cleanCode = (codeParam || '').trim().toUpperCase();

          if (!cleanCode || cleanCode.length !== 6) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Invalid 6-character room code' }));
            return;
          }

          const stored = syncStore.get(cleanCode);
          res.setHeader('Content-Type', 'application/json');
          if (!stored) {
            res.statusCode = 404;
            res.end(JSON.stringify({ success: false, error: `Room ${cleanCode} not found` }));
            return;
          }

          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, code: cleanCode, data: stored, kvConnected: false }));
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              const cleanCode = (parsed.code || '').trim().toUpperCase();
              if (!cleanCode || cleanCode.length !== 6 || !parsed.data) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Invalid room code or missing data' }));
                return;
              }

              syncStore.set(cleanCode, parsed.data);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                code: cleanCode,
                updatedAt: parsed.data.updatedAt || new Date().toISOString(),
                kvConnected: false,
              }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: String(err) }));
            }
          });
          return;
        }

        res.statusCode = 405;
        res.end();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      foxSportsApiPlugin(),
      syncApiPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        manifestFilename: 'manifest.webmanifest',
        includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
        manifest: {
          id: '/',
          name: 'NFL Survivor Pool Strategy',
          short_name: 'NFLSurvivor',
          description: 'Interactive NFL Survivor Pool Strategy grid with dual ratings, market blending, future value metrics, and offline support.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,webmanifest}'],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
