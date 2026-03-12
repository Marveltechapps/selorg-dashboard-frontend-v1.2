/**
 * Home Config – Manage homepage-level settings (hero video, search placeholder, section titles, etc.).
 * Data is included in bootstrap and used by the customer app TopSection.
 */
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchHomeConfig, updateHomeConfig, upsertHomeConfig, type HomeConfig } from '@/api/customerAppAdminApi';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

export function HomeConfigScreen() {
  const [config, setConfig] = useState<HomeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    heroVideoUrl: '',
    searchPlaceholder: '',
    categorySectionTitle: '',
    organicTagline: '',
    organicIconUrl: '',
    deliveryTypeLabel: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchHomeConfig();
      setConfig(data ?? null);
      if (data) {
        setFormData({
          heroVideoUrl: data.heroVideoUrl ?? '',
          searchPlaceholder: data.searchPlaceholder ?? '',
          categorySectionTitle: data.categorySectionTitle ?? '',
          organicTagline: data.organicTagline ?? '',
          organicIconUrl: data.organicIconUrl ?? '',
          deliveryTypeLabel: data.deliveryTypeLabel ?? '',
        });
      }
    } catch {
      toast.error('Failed to load home config');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (config?._id) {
        await updateHomeConfig(formData);
        toast.success('Home config updated');
      } else {
        await upsertHomeConfig({ ...formData, key: 'main' });
        toast.success('Home config saved');
      }
      load();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-[#71717a]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[#18181b]">Home Config</h1>
        <p className="text-sm text-[#71717a] mt-1">
          Homepage-level settings: hero video, search placeholder, section titles. These appear in the customer app TopSection.
        </p>
      </div>

      <div className="bg-white border border-[#e4e4e7] rounded-xl p-6 space-y-4">
        <div>
          <Label htmlFor="heroVideoUrl">Hero Video URL</Label>
          <Input
            id="heroVideoUrl"
            value={formData.heroVideoUrl}
            onChange={(e) => setFormData({ ...formData, heroVideoUrl: e.target.value })}
            placeholder="https://... (CDN or hosted video). Empty = local asset fallback"
          />
        </div>
        <div>
          <Label htmlFor="searchPlaceholder">Search Placeholder</Label>
          <Input
            id="searchPlaceholder"
            value={formData.searchPlaceholder}
            onChange={(e) => setFormData({ ...formData, searchPlaceholder: e.target.value })}
            placeholder="e.g. Search for products, Search for Dal"
          />
        </div>
        <div>
          <Label htmlFor="categorySectionTitle">Category Section Title</Label>
          <Input
            id="categorySectionTitle"
            value={formData.categorySectionTitle}
            onChange={(e) => setFormData({ ...formData, categorySectionTitle: e.target.value })}
            placeholder="e.g. Grocery & Kitchen"
          />
        </div>
        <div>
          <Label htmlFor="organicTagline">Organic Tagline</Label>
          <Input
            id="organicTagline"
            value={formData.organicTagline}
            onChange={(e) => setFormData({ ...formData, organicTagline: e.target.value })}
            placeholder="Organic products tagline"
          />
        </div>
        <div>
          <Label htmlFor="organicIconUrl">Organic Icon URL</Label>
          <Input
            id="organicIconUrl"
            value={formData.organicIconUrl}
            onChange={(e) => setFormData({ ...formData, organicIconUrl: e.target.value })}
            placeholder="https://... (icon image URL)"
          />
        </div>
        <div>
          <Label htmlFor="deliveryTypeLabel">Delivery Type Label</Label>
          <Input
            id="deliveryTypeLabel"
            value={formData.deliveryTypeLabel}
            onChange={(e) => setFormData({ ...formData, deliveryTypeLabel: e.target.value })}
            placeholder="e.g. Delivery (used as Delivery to Home)"
          />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save
        </Button>
      </div>
    </div>
  );
}
