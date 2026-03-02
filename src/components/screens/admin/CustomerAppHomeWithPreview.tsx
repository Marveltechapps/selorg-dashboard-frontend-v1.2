/**
 * Single page: left = preview (mobile replica), right = edit panels.
 * Preview auto-refreshes when data is saved or deleted. Click "Edit" in preview to jump to the right tab.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { fetchCustomerHomePayload, type CustomerHomePayload } from '@/api/customerAppAdminApi';
import { toast } from 'sonner';
import { HomePreviewPhone } from './HomePreviewPhone';
import { CustomerAppHome, type ResourceTab } from './CustomerAppHome';

export function CustomerAppHomeWithPreview() {
  const [payload, setPayload] = useState<CustomerHomePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<ResourceTab>('categories');

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomerHomePayload();
      setPayload(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load preview';
      setError(msg);
      toast.error(msg);
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreview();
  }, [loadPreview, refreshKey]);

  const handleDataChange = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleEditSection = useCallback((tab: ResourceTab) => {
    setActiveTab(tab);
  }, []);

  return (
    <div className="space-y-4 w-full min-w-0 max-w-full">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-[#18181b] truncate">
          Customer App Home
        </h1>
        <p className="text-sm text-[#71717a] mt-1">
          Left: live preview (matches the app). Right: edit content. Changes update the preview automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,360px)_1fr] gap-8 items-start">
        {/* LEFT: Preview – fixed order first so it appears on the left */}
        <div className="order-1 lg:sticky lg:top-24 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">Preview</span>
          </div>
          <HomePreviewPhone
            payload={payload}
            loading={loading}
            error={error}
            onRefresh={loadPreview}
            onEditSection={handleEditSection}
            compactHeader
          />
        </div>

        {/* RIGHT: Edit content */}
        <div className="order-2 min-w-0 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">Edit content</span>
          </div>
          <CustomerAppHome
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onDataChange={handleDataChange}
            hideTitle
          />
        </div>
      </div>
    </div>
  );
}
