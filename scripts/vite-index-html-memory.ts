/**
 * Serves index.html from memory so Vite's default middleware does not re-read
 * index.html on every SPA navigation (avoids EPERM on macOS Desktop/TCC).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';

export const VITE_INDEX_CACHE_PATH = path.join(os.tmpdir(), 'selorg-dashboard-index.html');

function readIndexOrThrow(indexPath: string): string {
  try {
    return fs.readFileSync(indexPath, 'utf-8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'EPERM' && fs.existsSync(VITE_INDEX_CACHE_PATH)) {
      return fs.readFileSync(VITE_INDEX_CACHE_PATH, 'utf-8');
    }
    throw err;
  }
}

function writeIndexCache(content: string): void {
  try {
    fs.writeFileSync(VITE_INDEX_CACHE_PATH, content, { encoding: 'utf-8', mode: 0o644 });
  } catch {
    /* best-effort — tmp is readable even when Desktop is not */
  }
}

/** Load index.html once; mirror to os.tmpdir() when the project copy is readable. */
export function loadIndexHtmlForVite(projectRoot: string): string {
  const indexPath = path.join(projectRoot, 'index.html');
  const html = readIndexOrThrow(indexPath);
  writeIndexCache(html);
  return html;
}

function shouldServeSpaIndex(url: string): boolean {
  const pathname = url.split('?')[0] ?? '/';
  if (pathname === '/' || pathname.endsWith('.html')) return true;
  if (
    pathname.startsWith('/@') ||
    pathname.startsWith('/__') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/health') ||
    pathname.startsWith('/socket.io') ||
    pathname.startsWith('/hhd-socket.io') ||
    pathname.startsWith('/src/') ||
    pathname.startsWith('/node_modules/')
  ) {
    return false;
  }
  // Asset paths (e.g. /favicon.ico, /src/main.tsx)
  if (/\.[a-zA-Z0-9]+($|[?#])/.test(pathname)) return false;
  return true;
}

export function indexHtmlMemoryPlugin(projectRoot: string): Plugin {
  let cachedHtml = '';

  return {
    name: 'selorg-index-html-memory',
    enforce: 'pre',
    configResolved() {
      cachedHtml = loadIndexHtmlForVite(projectRoot);
    },
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        const accept = req.headers.accept ?? '';
        if (!accept.includes('text/html')) return next();

        const url = req.url ?? '/';
        if (!shouldServeSpaIndex(url)) return next();

        try {
          const transformed = await server.transformIndexHtml(url, cachedHtml, req.originalUrl);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html');
          if (req.method === 'HEAD') {
            res.end();
          } else {
            res.end(transformed);
          }
        } catch (err) {
          next(err);
        }
      });
    },
  };
}
