import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { DarkstoreManagement } from './components/DarkstoreManagement';
import { ProductionManagement } from './components/ProductionManagement';
import { ProductionFactoryProvider } from './contexts/ProductionFactoryContext';
import { MerchManagement } from './components/MerchManagement';
import { RiderManagement } from './components/RiderManagement';
import { FinanceManagement } from './components/FinanceManagement';
import { VendorManagement } from './components/VendorManagement';
import { WarehouseManagement } from './components/WarehouseManagement';
import { AdminManagement } from './components/AdminManagement';
import { LoginScreen } from './components/LoginScreen';
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationHandler } from './components/NotificationHandler';
import { useDynamicFavicon } from './hooks/useDynamicFavicon';

const VALID_DASHBOARDS = ['darkstore', 'production', 'merch', 'rider', 'finance', 'vendor', 'warehouse', 'admin'] as const;

function DashboardRedirect() {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase();
  if (role === 'admin' || role === 'super_admin') {
    return <Navigate to="/admin" replace />;
  }
  const target = role && VALID_DASHBOARDS.includes(role as any) ? role : 'darkstore';
  return <Navigate to={`/${target}`} replace />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function RedirectDashboardAdmin() {
  const { screen } = useParams<{ screen?: string }>();
  const to = screen ? `/admin/${screen}` : '/admin';
  return <Navigate to={to} replace />;
}

function RedirectLegacyDashboard() {
  const { type, screen } = useParams<{ type?: string; screen?: string }>();
  if (type && VALID_DASHBOARDS.includes(type as any)) {
    const to = screen ? `/${type}/${screen}` : `/${type}`;
    return <Navigate to={to} replace />;
  }
  return <Navigate to="/login" replace />;
}

function DashboardRoute({ 
  component: Component, 
  allowedRoles,
  dashboardId,
}: { 
  component: React.ComponentType<{ onLogout: () => void }>;
  allowedRoles: string[];
  dashboardId: string;
}) {
  const { user, logout } = useAuth();
  useDynamicFavicon(dashboardId);
  
  if (user && !allowedRoles.includes(user.role)) {
    const role = user.role?.toLowerCase();
    if (role === 'super_admin') return <Navigate to="/admin" replace />;
    const target = role && VALID_DASHBOARDS.includes(role as any) ? `/${role}` : '/login';
    return <Navigate to={target} replace />;
  }

  return (
    <Component onLogout={logout} />
  );
}

function LoginRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) {
    const role = user?.role?.toLowerCase();
    if (role === 'super_admin') return <Navigate to="/admin" replace />;
    const target = role && VALID_DASHBOARDS.includes(role as any) ? role : 'admin';
    return <Navigate to={`/${target}`} replace />;
  }
  return <LoginScreen />;
}


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NotificationHandler />
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          
          <Route 
            path="/darkstore/:screen?" 
            element={
              <ProtectedRoute>
                <DashboardRoute 
                  component={(props) => <DarkstoreManagement {...props} />} 
                  allowedRoles={['darkstore']}
                  dashboardId="darkstore"
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/production/:screen?" 
            element={
              <ProtectedRoute>
                <ProductionFactoryProvider>
                  <DashboardRoute 
                    component={(props) => <ProductionManagement {...props} />} 
                    allowedRoles={['production']}
                    dashboardId="production"
                  />
                </ProductionFactoryProvider>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/merch/:screen?" 
            element={
              <ProtectedRoute>
                <DashboardRoute 
                  component={(props) => <MerchManagement {...props} />} 
                  allowedRoles={['merch']}
                  dashboardId="merch"
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/rider/:screen?" 
            element={
              <ProtectedRoute>
                <DashboardRoute 
                  component={(props) => <RiderManagement {...props} />} 
                  allowedRoles={['rider']}
                  dashboardId="rider"
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/finance/:screen?" 
            element={
              <ProtectedRoute>
                <DashboardRoute 
                  component={(props) => <FinanceManagement {...props} />} 
                  allowedRoles={['finance']}
                  dashboardId="finance"
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/vendor/:screen?" 
            element={
              <ProtectedRoute>
                <DashboardRoute 
                  component={(props) => <VendorManagement {...props} />} 
                  allowedRoles={['vendor']}
                  dashboardId="vendor"
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/warehouse/:screen?" 
            element={
              <ProtectedRoute>
                <DashboardRoute 
                  component={(props) => <WarehouseManagement {...props} />} 
                  allowedRoles={['warehouse']}
                  dashboardId="warehouse"
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <Navigate to="/admin/citywide" replace />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/:screen?" 
            element={
              <ProtectedRoute>
                <DashboardRoute 
                  component={(props) => <AdminManagement {...props} />} 
                  allowedRoles={['admin', 'super_admin']}
                  dashboardId="admin"
                />
              </ProtectedRoute>
            } 
          />
          
          {/* Legacy /dashboard/* redirects */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
          <Route path="/dashboard/:type" element={<RedirectLegacyDashboard />} />
          <Route path="/dashboard/:type/:screen" element={<RedirectLegacyDashboard />} />
          
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
