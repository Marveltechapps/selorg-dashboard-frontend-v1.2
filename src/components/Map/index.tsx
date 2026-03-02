/**
 * Map stub for web (Vite or Expo web). Use this path instead of 'react-native-maps'
 * so the web bundle never loads native-only react-native-maps.
 * Native builds (Expo) use index.native.tsx which re-exports the real map.
 */
import React from 'react';

const containerStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 200,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#f0f0f0',
};

const textStyle: React.CSSProperties = {
  color: '#666',
  fontSize: 14,
};

export function MapViewStub(props: { style?: React.CSSProperties }) {
  return (
    <div style={{ ...containerStyle, ...props.style }} data-testid="map-stub">
      <span style={textStyle}>Map available in the app</span>
    </div>
  );
}

export function MarkerStub() {
  return null;
}

export const Callout = () => null;
export const Polygon = () => null;
export const Polyline = () => null;
export const Circle = () => null;
export const Overlay = () => null;
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = 'default';

export default MapViewStub;
export const Marker = MarkerStub;
