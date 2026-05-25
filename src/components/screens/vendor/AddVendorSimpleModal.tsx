import React, { useState } from 'react';
import { createBackdropClickHandler } from "@/components/ui/modalOverlayGuards";
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { VENDOR_PAYMENT_TERMS } from './AddVendorModal';
import * as vendorApi from '../../../api/vendor/vendorManagement.api';

const EMPTY_FORM = {
  vendorCode: '',
  vendorName: '',
  gstin: '',
  paymentTerms: '30 days' as (typeof VENDOR_PAYMENT_TERMS)[number],
  currencyCode: 'INR',
  line1: '',
  line2: '',
  line3: '',
  city: '',
  state: '',
  country: 'India',
  zipCode: '',
  contactName: '',
  email: '',
  phone: '',
  category: '',
  rating: '',
};

export interface AddVendorSimpleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void | Promise<void>;
}

export function AddVendorSimpleModal({ isOpen, onClose, onCreated }: AddVendorSimpleModalProps) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setFormData(EMPTY_FORM);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category.trim()) {
      toast.error('Category is required (stored in metadata)');
      return;
    }

    try {
      setSaving(true);

      const metadata: Record<string, string> = { category: formData.category.trim() };
      if (formData.rating.trim()) metadata.rating = formData.rating.trim();

      const payload = {
        vendorCode: formData.vendorCode.trim(),
        vendorName: formData.vendorName.trim(),
        taxInfo: { gstin: formData.gstin.trim() },
        paymentTerms: formData.paymentTerms,
        currencyCode: (formData.currencyCode.trim().toUpperCase() || 'INR').slice(0, 3),
        address: {
          line1: formData.line1.trim(),
          line2: formData.line2.trim() || null,
          line3: formData.line3.trim() || null,
          city: formData.city.trim(),
          state: formData.state.trim(),
          country: formData.country.trim() || 'India',
          zipCode: formData.zipCode.trim(),
        },
        contact: {
          name: formData.contactName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
        },
        status: 'active' as const,
        metadata,
      };

      await vendorApi.createVendor(payload);
      toast.success('Vendor created successfully');
      setFormData(EMPTY_FORM);
      onClose();
      await onCreated?.();
    } catch (error: unknown) {
      console.error('Failed to save vendor:', error);
      const err = error as { message?: string; details?: { msg?: string; message?: string }[] };
      toast.error(err.message || 'Failed to save vendor. Please try again.');
      if (err.details && Array.isArray(err.details)) {
        const validationErrors = err.details.map((d) => d.msg || d.message).join(', ');
        toast.error(`Validation errors: ${validationErrors}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={createBackdropClickHandler(resetAndClose)}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-6 border-b border-[#E0E0E0]">
          <h3 className="font-bold text-[#212121] text-lg">Add New Vendor</h3>
          <button
            type="button"
            onClick={resetAndClose}
            className="text-[#616161] hover:text-[#212121] p-1 hover:bg-[#F5F5F5] rounded"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-[#212121] mb-2">
                Vendor code <span className="text-[#EF4444]">*</span>
              </label>
              <input
                value={formData.vendorCode}
                onChange={(e) => setFormData({ ...formData, vendorCode: e.target.value })}
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#212121] mb-2">
                Currency <span className="text-[#EF4444]">*</span>
              </label>
              <input
                value={formData.currencyCode}
                onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                required
                maxLength={3}
                minLength={3}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-[#212121] mb-2">
                Vendor name <span className="text-[#EF4444]">*</span>
              </label>
              <input
                value={formData.vendorName}
                onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                required
                maxLength={100}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-[#212121] mb-2">
                GSTIN / tax ID <span className="text-[#EF4444]">*</span>
              </label>
              <input
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-[#212121] mb-2">
                Payment terms <span className="text-[#EF4444]">*</span>
              </label>
              <select
                value={formData.paymentTerms}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    paymentTerms: e.target.value as (typeof VENDOR_PAYMENT_TERMS)[number],
                  })
                }
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm bg-white focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                required
              >
                {VENDOR_PAYMENT_TERMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-xs font-bold text-[#757575] uppercase">Address</p>
          <div>
            <label className="block text-sm font-bold text-[#212121] mb-2">
              Line 1 <span className="text-[#EF4444]">*</span>
            </label>
            <input
              value={formData.line1}
              onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-[#212121] mb-2">Line 2</label>
              <input
                value={formData.line2}
                onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#212121] mb-2">Line 3</label>
              <input
                value={formData.line3}
                onChange={(e) => setFormData({ ...formData, line3: e.target.value })}
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-[#212121] mb-2">
                City <span className="text-[#EF4444]">*</span>
              </label>
              <input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#212121] mb-2">
                State <span className="text-[#EF4444]">*</span>
              </label>
              <input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#212121] mb-2">
                Country <span className="text-[#EF4444]">*</span>
              </label>
              <input
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#212121] mb-2">
                ZIP / PIN <span className="text-[#EF4444]">*</span>
              </label>
              <input
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                required
              />
            </div>
          </div>

          <p className="text-xs font-bold text-[#757575] uppercase">Contact</p>
          <div>
            <label className="block text-sm font-bold text-[#212121] mb-2">
              Contact name <span className="text-[#EF4444]">*</span>
            </label>
            <input
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-[#212121] mb-2">
                Email <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#212121] mb-2">
                Phone <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                required
              />
            </div>
          </div>

          <p className="text-xs font-bold text-[#757575] uppercase">Internal</p>
          <div>
            <label className="block text-sm font-bold text-[#212121] mb-2">
              Category (metadata) <span className="text-[#EF4444]">*</span>
            </label>
            <input
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#212121] mb-2">Rating (metadata, optional)</label>
            <input
              value={formData.rating}
              onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={resetAndClose}
              className="flex-1 px-4 py-2 border border-[#E0E0E0] rounded-lg text-sm font-bold text-[#616161] hover:bg-[#F5F5F5] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-bold hover:bg-[#4338CA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Add Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
