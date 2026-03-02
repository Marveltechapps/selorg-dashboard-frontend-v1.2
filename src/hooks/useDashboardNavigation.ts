import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useCallback } from 'react';

/**
 * Hook for URL-driven navigation within dashboards.
 * activeTab is derived directly from the URL :screen param (single source of truth)
 * to avoid race conditions between React Router state and component state.
 */
export function useDashboardNavigation(defaultTab: string = 'overview') {
  const { screen } = useParams<{ screen?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = screen || defaultTab;

  useEffect(() => {
    if (!screen) {
      const pathParts = location.pathname.split('/').filter(Boolean);
      const dashboardType = pathParts[0];
      if (dashboardType) {
        navigate(`/${dashboardType}/${defaultTab}`, { replace: true });
      }
    }
  }, [screen, defaultTab, navigate, location.pathname]);

  const setActiveTab = useCallback((tab: string) => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const dashboardType = pathParts[0];
    if (dashboardType) {
      navigate(`/${dashboardType}/${tab}`);
    }
  }, [navigate, location.pathname]);

  return { activeTab, setActiveTab };
}
