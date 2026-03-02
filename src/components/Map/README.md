# Map (react-native-maps stub for web)

- **`index.tsx`** — Web stub (React/DOM). Used by this Vite app and by Expo web when you use this folder in the Expo project.
- **`index.web.tsx`** — Re-exports the stub for Expo/Metro web builds.
- **`index.native.tsx`** — Re-exports from `react-native-maps` for Expo native builds only.

In the Expo app, replace `from 'react-native-maps'` with `from '@/components/Map'` (or your path to this folder) so the web export and Docker build succeed.
