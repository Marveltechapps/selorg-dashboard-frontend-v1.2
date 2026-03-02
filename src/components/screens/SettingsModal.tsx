import React, { useState, useEffect, useRef } from 'react';
import { X, Save, RefreshCw, Bell, Clock, Store, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import * as settingsApi from '../../api/utilities/settingsApi';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AppSettings {
  // Auto-refresh intervals (in seconds)
  refreshIntervals: {
    dashboard: number;
    alerts: number;
    orders: number;
    inventory: number;
    analytics: number;
  };
  // Store mode
  storeMode: 'online' | 'pause' | 'maintenance';
  // Notifications
  notifications: {
    enabled: boolean;
    sound: boolean;
    criticalOnly: boolean;
    email: boolean;
  };
  // Display preferences
  display: {
    theme: 'light' | 'dark' | 'auto';
    timeFormat: '12h' | '24h';
    dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  };
  // Performance
  performance: {
    enableRealTimeUpdates: boolean;
    enableOptimisticUpdates: boolean;
    cacheTimeout: number; // in seconds
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  refreshIntervals: {
    dashboard: 30,
    alerts: 15,
    orders: 10,
    inventory: 20,
    analytics: 30,
  },
  storeMode: 'online',
  notifications: {
    enabled: true,
    sound: true,
    criticalOnly: false,
    email: false,
  },
  display: {
    theme: 'light',
    timeFormat: '24h',
    dateFormat: 'MM/DD/YYYY',
  },
  performance: {
    enableRealTimeUpdates: true,
    enableOptimisticUpdates: true,
    cacheTimeout: 60,
  },
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const originalSettingsRef = useRef<AppSettings>(DEFAULT_SETTINGS);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (isOpen) {
      loadSettings();
    }
    return () => {
      isMounted.current = false;
    };
  }, [isOpen]);

  // Auto-refresh settings every 30 seconds while modal is open
  useEffect(() => {
    if (!isOpen) return;
    
    const interval = setInterval(() => {
      if (isMounted.current && !saving && !hasChanges) {
        loadSettings(true); // Silent refresh
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOpen, saving, hasChanges]);

  const loadSettings = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const data = await settingsApi.getSettings();
      if (isMounted.current) {
        const loadedSettings = { ...DEFAULT_SETTINGS, ...data };
        setSettings(loadedSettings);
        originalSettingsRef.current = JSON.parse(JSON.stringify(loadedSettings));
        setHasChanges(false);
        if (!isSilent) {
          toast.success('Settings loaded');
        }
      }
    } catch (error: any) {
      console.error('Failed to load settings:', error);
      if (isMounted.current && !isSilent) {
        toast.error('Failed to load settings');
      }
    } finally {
      if (isMounted.current && !isSilent) {
        setLoading(false);
      }
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await settingsApi.updateSettings(settings);
      
      if (response.success) {
        originalSettingsRef.current = JSON.parse(JSON.stringify(settings));
        setHasChanges(false);
        setLastSaved(new Date());
        toast.success('✅ Settings saved successfully');
        
        // Emit event for other components to react to settings changes
        window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: settings }));
      }
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (path: string, value: any) => {
    setSettings((prev) => {
      const newSettings = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let current: any = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      
      // Check if settings have changed
      const hasChanged = JSON.stringify(newSettings) !== JSON.stringify(originalSettingsRef.current);
      setHasChanges(hasChanged);
      
      return newSettings;
    });
  };

  const handleReset = () => {
    setSettings(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
    setHasChanges(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E0E0E0] bg-[#FAFAFA]">
          <div>
            <h2 className="text-xl font-bold text-[#212121]">Application Settings</h2>
            <p className="text-sm text-[#757575] mt-1">
              Configure real-time updates, notifications, and preferences
              {lastSaved && (
                <span className="ml-2 text-[#16A34A]">
                  • Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadSettings}
              disabled={loading || saving}
              className="p-2 text-[#616161] hover:text-[#212121] hover:bg-[#F5F5F5] rounded-lg transition-colors"
              title="Refresh settings"
            >
              <RefreshCw size={18} className={cn(loading && 'animate-spin')} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#616161] hover:text-[#212121] hover:bg-[#F5F5F5] rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && !settings ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 size={24} className="animate-spin text-[#1677FF]" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Auto-Refresh Intervals */}
              <SettingsSection
                title="Auto-Refresh Intervals"
                icon={Clock}
                description="Configure how often each screen refreshes data (in seconds)"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(settings.refreshIntervals).map(([key, value]) => (
                    <div key={key}>
                      <label className="text-xs font-bold text-[#616161] uppercase mb-1 block">
                        {key.charAt(0).toUpperCase() + key.slice(1)} Screen
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="5"
                          max="300"
                          step="5"
                          value={value}
                          onChange={(e) => handleChange(`refreshIntervals.${key}`, parseInt(e.target.value) || 5)}
                          className="flex-1 px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:border-[#1677FF] focus:outline-none"
                        />
                        <span className="text-xs text-[#757575] w-12">seconds</span>
                      </div>
                    </div>
                  ))}
                </div>
              </SettingsSection>

              {/* Store Mode */}
              <SettingsSection
                title="Store Operating Mode"
                icon={Store}
                description="Control the operational status of the store"
              >
                <div className="bg-white border border-[#E0E0E0] p-1.5 rounded-lg shadow-sm flex items-center gap-1">
                  {(['online', 'pause', 'maintenance'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => handleChange('storeMode', mode)}
                      className={cn(
                        "px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-all flex-1",
                        settings.storeMode === mode
                          ? mode === 'online'
                            ? "bg-[#DCFCE7] text-[#16A34A] shadow-sm"
                            : mode === 'pause'
                            ? "bg-[#FEF3C7] text-[#D97706] shadow-sm"
                            : "bg-[#F3F4F6] text-[#4B5563] shadow-sm"
                          : "text-[#757575] hover:bg-[#F5F5F5]"
                      )}
                    >
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          settings.storeMode === mode
                            ? mode === 'online'
                              ? "bg-[#16A34A]"
                              : mode === 'pause'
                              ? "bg-[#D97706]"
                              : "bg-[#4B5563]"
                            : "bg-[#E0E0E0]"
                        )}
                      />
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </SettingsSection>

              {/* Notifications */}
              <SettingsSection
                title="Notifications"
                icon={Bell}
                description="Configure notification preferences"
              >
                <div className="space-y-4">
                  <ToggleSetting
                    label="Enable Notifications"
                    value={settings.notifications.enabled}
                    onChange={(val) => handleChange('notifications.enabled', val)}
                  />
                  <ToggleSetting
                    label="Sound Alerts"
                    value={settings.notifications.sound}
                    onChange={(val) => handleChange('notifications.sound', val)}
                    disabled={!settings.notifications.enabled}
                  />
                  <ToggleSetting
                    label="Critical Alerts Only"
                    value={settings.notifications.criticalOnly}
                    onChange={(val) => handleChange('notifications.criticalOnly', val)}
                    disabled={!settings.notifications.enabled}
                  />
                  <ToggleSetting
                    label="Email Notifications"
                    value={settings.notifications.email}
                    onChange={(val) => handleChange('notifications.email', val)}
                    disabled={!settings.notifications.enabled}
                  />
                </div>
              </SettingsSection>

              {/* Display Preferences */}
              <SettingsSection
                title="Display Preferences"
                icon={Clock}
                description="Customize how data is displayed"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[#616161] uppercase mb-1 block">Theme</label>
                    <select
                      value={settings.display.theme}
                      onChange={(e) => handleChange('display.theme', e.target.value)}
                      className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:border-[#1677FF] focus:outline-none bg-white"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#616161] uppercase mb-1 block">Time Format</label>
                    <select
                      value={settings.display.timeFormat}
                      onChange={(e) => handleChange('display.timeFormat', e.target.value)}
                      className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:border-[#1677FF] focus:outline-none bg-white"
                    >
                      <option value="12h">12 Hour</option>
                      <option value="24h">24 Hour</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#616161] uppercase mb-1 block">Date Format</label>
                    <select
                      value={settings.display.dateFormat}
                      onChange={(e) => handleChange('display.dateFormat', e.target.value)}
                      className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:border-[#1677FF] focus:outline-none bg-white"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </SettingsSection>

              {/* Performance */}
              <SettingsSection
                title="Performance Settings"
                icon={RefreshCw}
                description="Optimize application performance"
              >
                <div className="space-y-4">
                  <ToggleSetting
                    label="Enable Real-Time Updates"
                    value={settings.performance.enableRealTimeUpdates}
                    onChange={(val) => handleChange('performance.enableRealTimeUpdates', val)}
                    description="Automatically refresh data at configured intervals"
                  />
                  <ToggleSetting
                    label="Enable Optimistic Updates"
                    value={settings.performance.enableOptimisticUpdates}
                    onChange={(val) => handleChange('performance.enableOptimisticUpdates', val)}
                    description="Update UI immediately before API confirmation"
                  />
                  <div>
                    <label className="text-xs font-bold text-[#616161] uppercase mb-1 block">
                      Cache Timeout (seconds)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="300"
                      step="10"
                      value={settings.performance.cacheTimeout}
                      onChange={(e) => handleChange('performance.cacheTimeout', parseInt(e.target.value) || 60)}
                      className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:border-[#1677FF] focus:outline-none"
                    />
                  </div>
                </div>
              </SettingsSection>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[#E0E0E0] bg-[#FAFAFA]">
          <button
            onClick={handleReset}
            className="text-sm text-[#757575] hover:text-[#212121] font-medium"
          >
            Reset to Defaults
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-[#E0E0E0] text-[#212121] font-medium rounded-lg hover:bg-[#F5F5F5]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={cn(
                "px-4 py-2 bg-[#1677FF] text-white font-medium rounded-lg hover:bg-[#409EFF] flex items-center gap-2",
                (saving || !hasChanges) && "opacity-50 cursor-not-allowed"
              )}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({
  title,
  icon: Icon,
  description,
  children,
}: {
  title: string;
  icon: React.ElementType;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl p-6 shadow-sm">
      <div className="flex items-start gap-4 mb-4">
        <div className="p-2 bg-[#E6F7FF] text-[#1677FF] rounded-lg">
          <Icon size={20} />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-[#212121] mb-1">{title}</h3>
          {description && <p className="text-xs text-[#757575]">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function ToggleSetting({
  label,
  value,
  onChange,
  disabled = false,
  description,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="font-medium text-[#212121]">{label}</div>
        {description && <div className="text-xs text-[#757575] mt-0.5">{description}</div>}
      </div>
      <button
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors",
          value ? "bg-[#1677FF]" : "bg-[#E0E0E0]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform",
            value && "translate-x-5"
          )}
        />
      </button>
    </div>
  );
}

