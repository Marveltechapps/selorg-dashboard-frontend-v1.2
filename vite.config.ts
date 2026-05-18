
  import { defineConfig, loadEnv, createLogger } from 'vite';
  import type { Logger } from 'vite';

  const PROXY_ERROR_LOG_INTERVAL_MS = 45_000;

  function createThrottledProxyLogger(): Logger {
    const base = createLogger();
    let lastProxyNoiseAt = 0;

    return {
      ...base,
      error(msg, options) {
        const text = typeof msg === 'string' ? msg : String(msg);
        const isProxyNoise =
          text.includes('http proxy error') ||
          text.includes('ws proxy error') ||
          text.includes('ws proxy socket error');

        if (isProxyNoise) {
          const now = Date.now();
          if (now - lastProxyNoiseAt < PROXY_ERROR_LOG_INTERVAL_MS) {
            return;
          }
          lastProxyNoiseAt = now;
          base.warn(
            '[Vite Proxy] Backend unreachable — repeated proxy errors are suppressed for ~45s. Start backend: cd selorg-dashboard-backend-v1.1 && npm run dev'
          );
          return;
        }

        base.error(msg, options);
      },
    };
  }
  import react from '@vitejs/plugin-react-swc';
  import path from 'path';
  import { indexHtmlMemoryPlugin } from './scripts/vite-index-html-memory';

  const resolveOrigin = (value: string, fallback: string) => {
    if (!value) return fallback;
    try {
      return new URL(value).origin;
    } catch {
      return fallback;
    }
  };

  const normalizeLegacyLocalProxy = (target: string, canonicalPort: string) => {
    try {
      const parsed = new URL(target);
      const isLegacyLocal =
        parsed.port === '5001' &&
        (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
      return isLegacyLocal ? `http://localhost:${canonicalPort}` : target;
    } catch {
      return target;
    }
  };

  export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const apiBaseUrl = env.VITE_API_BASE_URL?.trim() || '';
    // Keep fallback aligned with backend `.env` default used in this workspace.
    const canonicalBackendPort = '3333';
    const defaultBackendPort = env.VITE_PROXY_PORT || canonicalBackendPort;
    const configuredDevProxyTarget = resolveOrigin(env.VITE_PROXY_TARGET?.trim() || '', `http://localhost:${defaultBackendPort}`);
    // Backward compatibility: older dashboards hardcoded local port 5001.
    const devProxyTarget = normalizeLegacyLocalProxy(configuredDevProxyTarget, canonicalBackendPort);
    const proxyTarget = mode === 'development'
      ? devProxyTarget
      : resolveOrigin(apiBaseUrl, devProxyTarget);
    const wsServerUrl = env.VITE_WS_URL?.trim() || proxyTarget;
    const devServerPort = Number(env.VITE_DEV_PORT || '5173');

    const projectRoot = path.resolve(__dirname);

    return {
      root: projectRoot,
      customLogger: createThrottledProxyLogger(),
      plugins: [indexHtmlMemoryPlugin(projectRoot), react()],
      resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        alias: {
          'vaul@1.1.2': 'vaul',
          'sonner@2.0.3': 'sonner',
          'recharts@2.15.2': 'recharts',
          'react-resizable-panels@2.1.7': 'react-resizable-panels',
          'react-hook-form@7.55.0': 'react-hook-form',
          'react-day-picker@8.10.1': 'react-day-picker',
          'lucide-react@0.487.0': 'lucide-react',
          'input-otp@1.4.2': 'input-otp',
          'embla-carousel-react@8.6.0': 'embla-carousel-react',
          'cmdk@1.1.1': 'cmdk',
          'class-variance-authority@0.7.1': 'class-variance-authority',
          '@radix-ui/react-tooltip@1.1.8': '@radix-ui/react-tooltip',
          '@radix-ui/react-toggle@1.1.2': '@radix-ui/react-toggle',
          '@radix-ui/react-toggle-group@1.1.2': '@radix-ui/react-toggle-group',
          '@radix-ui/react-tabs@1.1.3': '@radix-ui/react-tabs',
          '@radix-ui/react-switch@1.1.3': '@radix-ui/react-switch',
          '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
          '@radix-ui/react-slider@1.2.3': '@radix-ui/react-slider',
          '@radix-ui/react-separator@1.1.2': '@radix-ui/react-separator',
          '@radix-ui/react-select@2.1.6': '@radix-ui/react-select',
          '@radix-ui/react-scroll-area@1.2.3': '@radix-ui/react-scroll-area',
          '@radix-ui/react-radio-group@1.2.3': '@radix-ui/react-radio-group',
          '@radix-ui/react-progress@1.1.2': '@radix-ui/react-progress',
          '@radix-ui/react-popover@1.1.6': '@radix-ui/react-popover',
          '@radix-ui/react-navigation-menu@1.2.5': '@radix-ui/react-navigation-menu',
          '@radix-ui/react-menubar@1.1.6': '@radix-ui/react-menubar',
          '@radix-ui/react-label@2.1.2': '@radix-ui/react-label',
          '@radix-ui/react-hover-card@1.1.6': '@radix-ui/react-hover-card',
          '@radix-ui/react-dropdown-menu@2.1.6': '@radix-ui/react-dropdown-menu',
          '@radix-ui/react-dialog@1.1.6': '@radix-ui/react-dialog',
          '@radix-ui/react-context-menu@2.2.6': '@radix-ui/react-context-menu',
          '@radix-ui/react-collapsible@1.1.3': '@radix-ui/react-collapsible',
          '@radix-ui/react-checkbox@1.1.4': '@radix-ui/react-checkbox',
          '@radix-ui/react-avatar@1.1.3': '@radix-ui/react-avatar',
          '@radix-ui/react-aspect-ratio@1.1.2': '@radix-ui/react-aspect-ratio',
          '@radix-ui/react-alert-dialog@1.1.6': '@radix-ui/react-alert-dialog',
          '@radix-ui/react-accordion@1.2.3': '@radix-ui/react-accordion',
          '@': path.resolve(__dirname, './src'),
          '@ui': path.resolve(__dirname, './src/libs/ui'),
          '@utils': path.resolve(__dirname, './src/libs/utils'),
        },
      },
      build: {
        target: 'esnext',
        outDir: 'build',
      },
      server: {
        port: devServerPort,
        strictPort: true,
        host: true,
        open: true,
        proxy: {
        '/health': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err: NodeJS.ErrnoException, _req, res) => {
              if (res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'unreachable', error: 'Backend not running' }));
              }
            });
          },
        },
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          // http-proxy default timeout is 120s; CMS mastersheet imports often run longer (large XLSX + DB).
          timeout: 1_800_000,
          proxyTimeout: 1_800_000,
          configure: (proxy) => {
            proxy.on('error', (err: NodeJS.ErrnoException, _req, res) => {
              const code = err?.code ?? (err?.cause as NodeJS.ErrnoException)?.code;
              if (res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Backend unreachable', code: code ?? 'UNKNOWN' }));
              }
            });
          },
        },
        '/socket.io': {
          target: wsServerUrl,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/hhd-socket.io': {
          target: wsServerUrl,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        },
      },
    };
  });