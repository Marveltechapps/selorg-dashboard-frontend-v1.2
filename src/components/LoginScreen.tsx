import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, UserCircle, Lock, User, Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { login } from '../api/authApi';
import { useAuth } from '../contexts/AuthContext';
import { useDynamicFavicon } from '../hooks/useDynamicFavicon';
import { DASHBOARD_BRANDS } from '../utils/dashboardFavicon';

type RoleId = 'darkstore' | 'production' | 'merch' | 'rider' | 'finance' | 'vendor' | 'warehouse' | 'admin';

const ROLE_CONFIG: Record<RoleId, { name: string; color: string; bgSelected: string }> = {
  admin:      { name: 'Admin Operations',  color: '#e11d48', bgSelected: 'rgba(225,29,72,0.08)' },
  warehouse:  { name: 'Warehouse Ops',     color: '#0891b2', bgSelected: 'rgba(8,145,178,0.08)' },
  production: { name: 'Production',        color: '#16A34A', bgSelected: 'rgba(22,163,74,0.08)' },
  darkstore:  { name: 'Darkstore Ops',     color: '#3B82F6', bgSelected: 'rgba(59,130,246,0.08)' },
  rider:      { name: 'Rider Fleet',       color: '#F97316', bgSelected: 'rgba(249,115,22,0.08)' },
  vendor:     { name: 'Vendor & Supplier', color: '#4F46E5', bgSelected: 'rgba(79,70,229,0.08)' },
  finance:    { name: 'Finance',           color: '#14B8A6', bgSelected: 'rgba(20,184,166,0.08)' },
  merch:      { name: 'Merch & Promo',     color: '#7C3AED', bgSelected: 'rgba(124,58,237,0.08)' },
};

const ROLE_ORDER: RoleId[] = ['admin', 'warehouse', 'production', 'darkstore', 'rider', 'vendor', 'finance', 'merch'];

function DashboardBadge({ dashboardId, size = 40 }: { dashboardId: string; size?: number }) {
  const brand = DASHBOARD_BRANDS[dashboardId as keyof typeof DASHBOARD_BRANDS];
  if (!brand) return null;
  const [c1, c2] = brand.colors;
  const fontSize = Math.round(size * 0.45);
  return (
    <div
      className="rounded-lg flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
      }}
    >
      <span
        className="text-white select-none"
        style={{ fontFamily: "'Recursive', system-ui, sans-serif", fontWeight: 800, fontSize, lineHeight: 1 }}
      >
        {brand.initial}
      </span>
    </div>
  );
}

export function LoginScreen() {
  const navigate = useNavigate();
  const auth = useAuth();
  useDynamicFavicon();
  const [selectedRole, setSelectedRole] = useState<'darkstore' | 'production' | 'merch' | 'rider' | 'finance' | 'vendor' | 'warehouse' | 'admin' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelect = (role: 'darkstore' | 'production' | 'merch' | 'rider' | 'finance' | 'vendor' | 'warehouse' | 'admin') => {
    setSelectedRole(role);
    setEmail('');
    setPassword('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login({ 
        email, 
        password,
        role: selectedRole 
      });
      
      const canAccessAny = result.user.role === 'admin' || result.user.role === 'super_admin';
      if (!canAccessAny && result.user.role !== selectedRole) {
        toast.error('You do not have access to this dashboard');
        setIsLoading(false);
        return;
      }

      auth.login(result.token, {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        assignedStores: result.user.assignedStores ?? [],
        primaryStoreId: result.user.primaryStoreId ?? '',
      });

      const finalRole = canAccessAny ? selectedRole : result.user.role;
      toast.success(`Welcome to ${ROLE_CONFIG[selectedRole as keyof typeof ROLE_CONFIG]?.name || selectedRole}`);
      navigate(`/${finalRole}`);
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  const roleConfig = selectedRole ? ROLE_CONFIG[selectedRole as keyof typeof ROLE_CONFIG] : null;

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full overflow-hidden border border-[#E0E0E0] flex flex-col md:flex-row">
        
        {/* Left Side: Role Selection */}
        <div className="w-full md:w-2/3 p-6 md:p-8 bg-[#FAFAFA] md:border-r border-[#E0E0E0] overflow-y-auto max-h-[80vh] custom-scrollbar">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#212121]">Select Department</h1>
            <p className="text-[#757575] text-sm">Choose your operational unit to log in.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {ROLE_ORDER.map((role) => {
              const cfg = ROLE_CONFIG[role];
              const isActive = selectedRole === role;
              return (
                <button
                  key={role}
                  onClick={() => handleRoleSelect(role)}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all hover:shadow-md text-left group",
                    isActive
                      ? "ring-1"
                      : "border-[#E0E0E0] bg-white"
                  )}
                  style={isActive ? { borderColor: cfg.color, backgroundColor: cfg.bgSelected, boxShadow: `0 0 0 1px ${cfg.color}` } : undefined}
                >
                  <DashboardBadge dashboardId={role} />
                  <div>
                    <h3
                      className="font-bold text-sm"
                      style={{ color: isActive ? cfg.color : '#212121' }}
                    >
                      {cfg.name}
                    </h3>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-1/3 bg-white p-8 flex flex-col justify-center border-l border-[#E0E0E0]">
          {selectedRole ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="text-center mb-4">
                <div className="mx-auto mb-4 shadow-lg rounded-2xl overflow-hidden w-16 h-16">
                  <DashboardBadge dashboardId={selectedRole} size={64} />
                </div>
                <h2 className="text-2xl font-bold text-[#212121]">
                  {roleConfig?.name || selectedRole}
                </h2>
                <p className="text-sm text-[#757575]">
                  Secure Access Portal
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#757575] uppercase mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" size={18} />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#E0E0E0] focus:border-[#212121] focus:ring-1 focus:ring-[#212121] outline-none transition-all text-sm font-medium"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#757575] uppercase mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-12 py-3 rounded-lg border border-[#E0E0E0] focus:border-[#212121] focus:ring-1 focus:ring-[#212121] outline-none transition-all text-sm font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A3A3A3] hover:text-[#212121] transition-colors focus:outline-none"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    "w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all text-white shadow-lg",
                    isLoading ? "opacity-70 cursor-wait" : "hover:translate-y-[-1px]",
                    selectedRole === 'admin' ? "bg-[#e11d48] hover:bg-[#be123c]" :
                    selectedRole === 'warehouse' ? "bg-[#0891b2] hover:bg-[#0e7490]" :
                    selectedRole === 'production' ? "bg-[#16A34A] hover:bg-[#15803d]" :
                    selectedRole === 'darkstore' ? "bg-[#1677FF] hover:bg-[#0958d9]" :
                    selectedRole === 'rider' ? "bg-[#F97316] hover:bg-[#c2410c]" :
                    selectedRole === 'vendor' ? "bg-[#4F46E5] hover:bg-[#4338ca]" :
                    selectedRole === 'finance' ? "bg-[#14B8A6] hover:bg-[#0f766e]" : "bg-[#7C3AED] hover:bg-[#6d28d9]"
                  )}
                >
                  {isLoading ? "Authenticating..." : "Login to Dashboard"}
                  {!isLoading && <ArrowRight size={16} />}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-full opacity-50">
              <div className="w-16 h-16 bg-[#F5F5F5] rounded-full flex items-center justify-center mb-4">
                <UserCircle className="text-[#A3A3A3] w-8 h-8" />
              </div>
              <p className="font-medium text-[#212121]">No Department Selected</p>
              <p className="text-sm text-[#757575]">Please select your role to continue.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
