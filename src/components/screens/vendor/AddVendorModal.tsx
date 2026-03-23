import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export const VENDOR_PAYMENT_TERMS = ['30 days', '45 days', '60 days'] as const;

/** Procurement list / filters — optional on create, shown on edit when present. */
export const VENDOR_CATEGORY_OPTIONS = [
  'Vegetables',
  'Fruits',
  'Spices',
  'Dairy / Perishables',
  'Packaged Goods',
  'Fresh Produce',
  'Packaging',
] as const;

export interface VendorCreatePayload {
  vendorCode: string;
  vendorName: string;
  taxInfo: { gstin: string };
  paymentTerms: (typeof VENDOR_PAYMENT_TERMS)[number];
  address: {
    line1: string;
    line2: string | null;
    line3: string | null;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  contact: {
    name: string;
    phone: string;
    email: string;
  };
  currencyCode: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export type AddVendorModalMode = 'add' | 'edit';

interface AddVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: AddVendorModalMode;
  /** Required when mode is `edit` */
  editVendorId?: string | null;
  /** Hydrates the form when opening edit (from GET vendor by id). */
  initialPayload?: VendorCreatePayload | null;
  onSubmit?: (payload: VendorCreatePayload) => void | Promise<void>;
  onEditSubmit?: (vendorId: string, payload: VendorCreatePayload) => void | Promise<void>;
}

export function AddVendorModal({
  isOpen,
  onClose,
  mode = 'add',
  editVendorId = null,
  initialPayload = null,
  onSubmit,
  onEditSubmit,
}: AddVendorModalProps) {
  const [vendorCode, setVendorCode] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [gstin, setGstin] = useState('');
  const [paymentTerms, setPaymentTerms] = useState<(typeof VENDOR_PAYMENT_TERMS)[number]>('30 days');
  const [currencyCode, setCurrencyCode] = useState('INR');
  const [category, setCategory] = useState('');
  const [recordStatus, setRecordStatus] = useState<string | undefined>(undefined);

  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [line3, setLine3] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [zipCode, setZipCode] = useState('');

  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setVendorCode('');
    setVendorName('');
    setGstin('');
    setPaymentTerms('30 days');
    setCurrencyCode('INR');
    setCategory('');
    setRecordStatus(undefined);
    setLine1('');
    setLine2('');
    setLine3('');
    setCity('');
    setState('');
    setCountry('India');
    setZipCode('');
    setContactName('');
    setPhone('');
    setEmail('');
  };

  const applyPayload = (p: VendorCreatePayload) => {
    setVendorCode(p.vendorCode || '');
    setVendorName(p.vendorName || '');
    setGstin(p.taxInfo?.gstin || '');
    const t = p.paymentTerms;
    setPaymentTerms(
      (VENDOR_PAYMENT_TERMS as readonly string[]).includes(t) ? t : '30 days',
    );
    setCurrencyCode((p.currencyCode || 'INR').toUpperCase().slice(0, 3));
    const cat =
      typeof p.metadata?.category === 'string' && p.metadata.category !== '—'
        ? p.metadata.category
        : '';
    setCategory(cat);
    setRecordStatus(p.status);
    setLine1(p.address?.line1 || '');
    setLine2(p.address?.line2 || '');
    setLine3(p.address?.line3 || '');
    setCity(p.address?.city || '');
    setState(p.address?.state || '');
    setCountry(p.address?.country || 'India');
    setZipCode(p.address?.zipCode || '');
    setContactName(p.contact?.name || '');
    setPhone(p.contact?.phone || '');
    setEmail(p.contact?.email || '');
  };

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && initialPayload) {
      applyPayload(initialPayload);
    } else if (mode === 'add') {
      reset();
    }
  }, [isOpen, mode, initialPayload]); // eslint-disable-line react-hooks/exhaustive-deps -- hydrate on open / new initialPayload only

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const metadata: Record<string, unknown> = {};
    if (category.trim()) metadata.category = category.trim();

    const payload: VendorCreatePayload = {
      vendorCode: vendorCode.trim(),
      vendorName: vendorName.trim(),
      taxInfo: { gstin: gstin.trim() },
      paymentTerms,
      address: {
        line1: line1.trim(),
        line2: line2.trim() || null,
        line3: line3.trim() || null,
        city: city.trim(),
        state: state.trim(),
        country: country.trim() || 'India',
        zipCode: zipCode.trim(),
      },
      contact: {
        name: contactName.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
      },
      currencyCode: (currencyCode.trim().toUpperCase() || 'INR').slice(0, 3),
    };

    if (Object.keys(metadata).length) payload.metadata = metadata;
    if (mode === 'edit' && recordStatus !== undefined && recordStatus !== '') {
      payload.status = recordStatus;
    } else if (mode === 'add') {
      payload.status = 'pending';
    }

    try {
      setSubmitting(true);
      if (mode === 'edit') {
        if (!editVendorId || !onEditSubmit) return;
        await onEditSubmit(editVendorId, payload);
      } else {
        if (!onSubmit) return;
        await onSubmit(payload);
        reset();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const title = mode === 'edit' ? 'Edit vendor' : 'Add Vendor';
  const subtitle =
    mode === 'edit'
      ? 'Update the same fields as when adding a vendor. All * fields are stored on the vendor record.'
      : 'All fields marked * are stored on the vendor record.';
  const submitLabel = submitting ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create vendor';

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 p-4" onClick={handleClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[#E5E7EB] flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-[#1F2937]">{title}</h2>
            <p className="text-sm text-[#6B7280] mt-1">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-[#6B7280] hover:text-[#1F2937] p-1 hover:bg-[#F3F4F6] rounded"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-[#374151] uppercase tracking-wide">Vendor</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Vendor code <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    value={vendorCode}
                    onChange={(e) => setVendorCode(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    required
                    maxLength={64}
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Currency <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    required
                    maxLength={3}
                    minLength={3}
                    title="ISO 4217 code, e.g. INR"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Vendor name <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    required
                    maxLength={100}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Category <span className="text-[#6B7280] font-normal">(optional)</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm bg-white focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    <option value="">— None —</option>
                    {VENDOR_CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    GSTIN / tax ID <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Payment terms <span className="text-[#EF4444]">*</span>
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value as (typeof VENDOR_PAYMENT_TERMS)[number])}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm bg-white focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
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
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-bold text-[#374151] uppercase tracking-wide">Address</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Line 1 <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">Line 2</label>
                    <input
                      value={line2}
                      onChange={(e) => setLine2(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">Line 3</label>
                    <input
                      value={line3}
                      onChange={(e) => setLine3(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      City <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      State <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      Country <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      ZIP / PIN <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      required
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-bold text-[#374151] uppercase tracking-wide">Contact</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Contact name <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      Phone <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      Email <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      required
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="p-6 border-t border-[#E5E7EB] bg-[#F9FAFB] flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 border border-[#D1D5DB] rounded-lg text-sm font-bold text-[#1F2937] hover:bg-[#F3F4F6]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-bold hover:bg-[#4338CA] disabled:opacity-50"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
