import { useEffect } from 'react';
import { setFavicon, setDocumentTitle } from '../utils/dashboardFavicon';

export function useDynamicFavicon(dashboardId?: string) {
  useEffect(() => {
    setFavicon(dashboardId);
    setDocumentTitle(dashboardId);
  }, [dashboardId]);
}
