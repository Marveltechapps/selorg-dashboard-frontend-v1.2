import React from 'react';
import { StoreRequiredGuard } from './StoreRequiredGuard';

/** Wraps operational screens that require an active store selection */
export function DarkstoreStoreScoped({
  children,
  title = 'Select a store',
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return <StoreRequiredGuard title={title}>{children}</StoreRequiredGuard>;
}
