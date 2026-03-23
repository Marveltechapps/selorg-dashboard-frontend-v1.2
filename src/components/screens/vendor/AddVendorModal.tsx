import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, AlertTriangle } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';

export const VENDOR_PAYMENT_TERMS = ['30 days', '45 days', '60 days'] as const;

/** Legacy payload type used by CSV bulk import and older vendor create flows. */
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

export type VendorPaymentTermsCode = 'advance' | 'net7' | 'net15' | 'net30' | 'net45' | 'cod';
export type VendorSubstitutionPolicyCode = 'allowed' | 'not_allowed' | 'case_by_case';
export type VendorReturnPolicyCode = 'full' | 'partial' | 'none';

export type QtyUnitCode = 'kg' | 'L' | 'Pieces' | 'Boxes';
export type LeadTimeBadgeTone = 'fast' | 'standard' | 'slow';

export type DeliveryWindowCode =
  | 'early_morning'
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'night';

export type VendorDocumentKey =
  | 'fssaiCertificate'
  | 'gstCertificate'
  | 'businessLicense'
  | 'isoCertificate'
  | 'insuranceCertificate'
  | 'coldChainCertificate';

export type EncodedFile = {
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl: string;
};

export type VendorDocumentUploads = Partial<Record<VendorDocumentKey, EncodedFile>>;

export type VendorCategoryLimit = {
  category: string;
  minQty: number;
  maxQty: number;
  unit: QtyUnitCode;
  leadTimeDays?: number;
};

export interface VendorWizardFormData {
  // Step 1
  vendorName: string;
  vendorType: string;
  tier: string;
  description: string;
  registrationNumber: string;
  onboardingSource: '' | 'direct' | 'referral' | 'field_sales' | 'platform' | 'existing';

  // Step 2
  contactPerson: string;
  email: string;
  phonePrimary: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  serviceableZones: string[];

  // Step 3
  gstNumber: string;
  panNumber: string;
  bankName: string;
  accountType: string;
  accountNo: string;
  ifscCode: string;
  accountHolder: string;
  paymentTermsBank: '' | VendorPaymentTermsCode;
  creditLimit: string;

  // Step 5 & 6
  selectedCategories: string[];
  productType: string;
  minQtyPerDay: string;
  maxQtyPerDay: string;
  qtyUnit: QtyUnitCode;
  leadTimeDays: string;
  minimumOrderValue: string;
  paymentTermsPreferred: '' | VendorPaymentTermsCode;

  // Step 7
  categoryLimits: VendorCategoryLimit[];

  // Step 8
  deliveryWindows: DeliveryWindowCode[];
  slaTargetPercent: number;
  substitutionPolicy: '' | VendorSubstitutionPolicyCode;
  returnPolicy: '' | VendorReturnPolicyCode;
  specialInstructions: string;

  // Documents (Step 4)
  documents: VendorDocumentUploads;
}

export type VendorWizardSubmitStatus = 'draft' | 'pending';

export type VendorWizardSubmitPayload = {
  status: VendorWizardSubmitStatus;
  vendorCode: string;
  vendorId?: string | null;
  formData: VendorWizardFormData;
};

interface AddVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: AddVendorModalMode;
  /** Required when mode is `edit` */
  editVendorId?: string | null;
  /** Hydrates the form when opening edit */
  initialPayload?: VendorWizardFormData | null;
  /** Used for both draft and pending in `add` mode */
  onSubmit?: (payload: VendorWizardSubmitPayload) => Promise<{ vendorId?: string } | void>;
  /** Used for both draft and pending in `edit` mode */
  onEditSubmit?: (vendorId: string, payload: VendorWizardSubmitPayload) => Promise<void>;
}

const DARKSTORE_OPTIONS = [
  'Anna Nagar Darkstore',
  'Ambattur Darkstore',
  'OMR Darkstore',
  'Velachery Darkstore',
  'Tambaram Darkstore',
  'T.Nagar Darkstore',
  'Porur Darkstore',
  'Guindy Darkstore',
] as const;

const VENDOR_TYPE_OPTIONS = ['Manufacturer', 'Distributor', 'Wholesaler', 'Retailer', 'Trader'] as const;
const TIER_OPTIONS = ['Gold', 'Silver', 'Bronze'] as const;

const CATEGORY_OPTIONS_22 = [
  'Vegetables',
  'Fruits',
  'Spices',
  'Dairy',
  'Dairy / Perishables',
  'Frozen Foods',
  'Packaged Goods',
  'Fresh Produce',
  'Packaging',
  'Rice & Grains',
  'Pulses & Lentils',
  'Edible Oils',
  'Sugar & Sweeteners',
  'Snacks & Bakery',
  'Beverages',
  'Tea & Coffee',
  'Breakfast & Cereals',
  'Household Supplies',
  'Personal Care',
  'Baby Care',
  'Pet Supplies',
  'General / Other',
] as const;

const PRODUCT_TYPE_OPTIONS = ['Raw', 'Finished'] as const;

const PDF_IMAGE_ACCEPT = '.pdf,.jpg,.jpeg,.png';
const MAX_DOC_BYTES = 5 * 1024 * 1024; // 5MB

function isRequiredNonEmpty(v: string) {
  return v.trim().length > 0;
}

function isValidGst15(value: string) {
  return /^[a-zA-Z0-9]{15}$/.test(value.trim());
}

function getLeadTimeTone(leadTimeDays: number): LeadTimeBadgeTone {
  if (leadTimeDays <= 2) return 'fast';
  if (leadTimeDays <= 5) return 'standard';
  return 'slow';
}

function fileToEncodedFile(file: File): Promise<EncodedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      resolve({
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        dataUrl: String(reader.result),
      });
    };
    reader.readAsDataURL(file);
  });
}

function ErrorText({ text }: { text: string }) {
  return <p className="text-xs text-[#EF4444] mt-1">{text}</p>;
}

function BadgeTone({
  tone,
}: {
  tone: 'green' | 'amber' | 'red' | 'success' | 'warning' | 'danger';
}) {
  const cls =
    tone === 'amber' || tone === 'warning'
      ? 'bg-[#FEF3C7] text-[#92400E]'
      : tone === 'red' || tone === 'danger'
        ? 'bg-[#FEE2E2] text-[#7F1D1D]'
        : 'bg-[#D1FAE5] text-[#065F46]';
  return `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${cls}`;
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
  const steps = useMemo(
    () => [
      { title: 'Basic Info', subtitle: 'Vendor identity and onboarding basics' },
      { title: 'Contact & Address', subtitle: 'Reachability and service coverage' },
      { title: 'Bank & Financial', subtitle: 'Payments, limits, and company identifiers' },
      { title: 'Documents', subtitle: 'Licenses and compliance certificates' },
      { title: 'Categories', subtitle: 'What the vendor can supply' },
      { title: 'Purchase Limits', subtitle: 'Quantities, lead times, and order minimums' },
      { title: 'Category Limits', subtitle: 'Fine-grained per-category constraints' },
      { title: 'SLA & Operations', subtitle: 'Delivery expectations and policies' },
    ],
    [],
  );

  const [activeStep, setActiveStep] = useState(1);
  const [vendorCode, setVendorCode] = useState('');
  const [draftVendorId, setDraftVendorId] = useState<string | null>(null);
  const [submittingDraft, setSubmittingDraft] = useState(false);
  const [submitWarnings, setSubmitWarnings] = useState<string[]>([]);

  const defaultFormData = useMemo<VendorWizardFormData>(
    () => ({
      // Step 1
      vendorName: '',
      vendorType: '',
      tier: '',
      description: '',
      registrationNumber: '',
      onboardingSource: '',

      // Step 2
      contactPerson: '',
      email: '',
      phonePrimary: '',
      addressLine1: '',
      city: '',
      state: '',
      postalCode: '',
      serviceableZones: [],

      // Step 3
      gstNumber: '',
      panNumber: '',
      bankName: '',
      accountType: '',
      accountNo: '',
      ifscCode: '',
      accountHolder: '',
      paymentTermsBank: 'net15',
      creditLimit: '',

      // Step 5 & 6
      selectedCategories: [],
      productType: '',
      minQtyPerDay: '',
      maxQtyPerDay: '',
      qtyUnit: 'kg',
      leadTimeDays: '2',
      minimumOrderValue: '',
      paymentTermsPreferred: '',

      // Step 7
      categoryLimits: [],

      // Step 8
      deliveryWindows: [],
      slaTargetPercent: 90,
      substitutionPolicy: '',
      returnPolicy: '',
      specialInstructions: '',

      // Documents
      documents: {},
    }),
    [],
  );

  const [formData, setFormData] = useState<VendorWizardFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const coldChainRequiredCategories = useMemo(
    () => new Set(['Dairy', 'Dairy / Perishables', 'Frozen Foods']),
    [],
  );

  const selectedIsColdChainRequired = useMemo(() => {
    return formData.selectedCategories.some((c) => coldChainRequiredCategories.has(c));
  }, [formData.selectedCategories, coldChainRequiredCategories]);

  useEffect(() => {
    if (!isOpen) return;

    setActiveStep(1);
    setErrors({});
    setSubmitWarnings([]);

    if (mode === 'edit') {
      setDraftVendorId(null);
      setVendorCode(initialPayload?.vendorName ? `VND-${Date.now()}` : '');
      setFormData(initialPayload ? initialPayload : defaultFormData);
    } else {
      setDraftVendorId(null);
      // Generate a stable code for the whole wizard lifetime (required by backend uniqueness/index).
      setVendorCode(`VND-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
      setFormData(defaultFormData);
    }
  }, [isOpen, mode, initialPayload, defaultFormData]);

  useEffect(() => {
    // Auto-populate Preferred Payment Terms from Bank Details (step 3) if not set yet.
    if (!formData.paymentTermsPreferred && formData.paymentTermsBank) {
      setFormData((prev) => ({ ...prev, paymentTermsPreferred: prev.paymentTermsBank }));
    }
  }, [formData.paymentTermsBank]); // eslint-disable-line react-hooks/exhaustive-deps

  const validateStep = (step: number): Record<string, string> => {
    const nextErrors: Record<string, string> = {};

    if (step === 1) {
      if (!isRequiredNonEmpty(formData.vendorName)) nextErrors.vendorName = 'Vendor name is required';
      if (!isRequiredNonEmpty(formData.vendorType)) nextErrors.vendorType = 'Vendor type is required';
      if (!formData.onboardingSource) nextErrors.onboardingSource = 'Onboarding source is required';
    }

    if (step === 2) {
      if (!isRequiredNonEmpty(formData.contactPerson)) nextErrors.contactPerson = 'Contact person is required';
      if (!isRequiredNonEmpty(formData.email)) nextErrors.email = 'Email is required';
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        nextErrors.email = 'Enter a valid email';
      }
      if (!isRequiredNonEmpty(formData.phonePrimary)) nextErrors.phonePrimary = 'Phone is required';
      if (!isRequiredNonEmpty(formData.addressLine1)) nextErrors.addressLine1 = 'Address is required';
      if (!isRequiredNonEmpty(formData.city)) nextErrors.city = 'City is required';
      if (!isRequiredNonEmpty(formData.state)) nextErrors.state = 'State is required';
      if (!isRequiredNonEmpty(formData.postalCode)) nextErrors.postalCode = 'Postal code is required';
      if (formData.serviceableZones.length < 1) {
        nextErrors.serviceableZones = 'Select at least 1 darkstore';
      }
    }

    if (step === 3) {
      if (!isRequiredNonEmpty(formData.gstNumber)) nextErrors.gstNumber = 'GST number is required';
      else if (!isValidGst15(formData.gstNumber)) nextErrors.gstNumber = 'GST must be 15 alphanumeric characters';
      if (!isRequiredNonEmpty(formData.bankName)) nextErrors.bankName = 'Bank name is required';
      if (!isRequiredNonEmpty(formData.accountNo)) nextErrors.accountNo = 'Account no is required';
      if (!isRequiredNonEmpty(formData.ifscCode)) nextErrors.ifscCode = 'IFSC is required';
      if (!isRequiredNonEmpty(formData.accountHolder)) nextErrors.accountHolder = 'Account holder is required';
      if (!formData.paymentTermsBank) nextErrors.paymentTermsBank = 'Payment terms are required';
    }

    if (step === 4) {
      // No required docs - optional with warning behavior.
    }

    if (step === 5) {
      if (formData.selectedCategories.length < 1) nextErrors.selectedCategories = 'Select at least 1 category';
      if (!isRequiredNonEmpty(formData.productType)) nextErrors.productType = 'Product type is required';
    }

    if (step === 6) {
      const lead = Number(formData.leadTimeDays);
      if (!Number.isFinite(lead)) nextErrors.leadTimeDays = 'Lead time is required';
      else if (lead < 1) nextErrors.leadTimeDays = 'Lead time must be at least 1';
      else if (lead > 30) nextErrors.leadTimeDays = 'Lead time must be at most 30';

      if (!isRequiredNonEmpty(formData.minimumOrderValue))
        nextErrors.minimumOrderValue = 'Minimum order value is required';

      if (!formData.paymentTermsPreferred) nextErrors.paymentTermsPreferred = 'Preferred payment terms are required';

      if (!isRequiredNonEmpty(formData.minQtyPerDay)) nextErrors.minQtyPerDay = 'Min qty is required';
      if (!isRequiredNonEmpty(formData.maxQtyPerDay)) nextErrors.maxQtyPerDay = 'Max qty is required';

      const minQty = Number(formData.minQtyPerDay);
      const maxQty = Number(formData.maxQtyPerDay);
      if (Number.isFinite(minQty) && Number.isFinite(maxQty) && maxQty <= minQty) {
        nextErrors.maxQtyPerDay = 'Max qty must be greater than min qty';
      }
    }

    if (step === 7) {
      // no required fields
    }

    if (step === 8) {
      if (formData.deliveryWindows.length < 1) nextErrors.deliveryWindows = 'Select at least 1 delivery window';
      if (!Number.isFinite(formData.slaTargetPercent)) nextErrors.slaTargetPercent = 'SLA target is required';
      if (!formData.substitutionPolicy) nextErrors.substitutionPolicy = 'Substitution policy is required';
      if (!formData.returnPolicy) nextErrors.returnPolicy = 'Return policy is required';
    }

    return nextErrors;
  };

  const handleNext = async () => {
    const nextErrors = validateStep(activeStep);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setActiveStep((s) => Math.min(8, s + 1));
  };

  const handleCancel = () => {
    setErrors({});
    setSubmitWarnings([]);
    setFormData(defaultFormData);
    onClose();
  };

  const handleSaveAsDraft = async () => {
    setSubmitWarnings([]);

    if (!formData.vendorName.trim()) {
      sonnerToast.error('Vendor name is required to save a draft');
      return;
    }
    if (!vendorCode.trim()) {
      sonnerToast.error('Vendor code is missing');
      return;
    }

    setSubmittingDraft(true);
    try {
      const payloadToSend: VendorWizardFormData = {
        ...formData,
        documents: formData.documents || {},
      };

      const result = await (mode === 'edit' && editVendorId
        ? onEditSubmit?.(editVendorId, {
            status: 'draft',
            vendorCode,
            vendorId: editVendorId,
            formData: payloadToSend,
          })
        : onSubmit?.({
            status: 'draft',
            vendorCode,
            vendorId: draftVendorId,
            formData: payloadToSend,
          }));

      if (mode === 'add') {
        const vendorIdFromResult = (result && typeof result === 'object' && 'vendorId' in result && (result as any).vendorId) || undefined;
        if (vendorIdFromResult) setDraftVendorId(String(vendorIdFromResult));
      }

      sonnerToast.success('Draft saved. You can continue later.');
    } catch (err: any) {
      sonnerToast.error(err?.message || 'Failed to save draft');
    } finally {
      setSubmittingDraft(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitWarnings([]);
    // Backend requires (for non-draft) GST, paymentTerms, and address fields.
    // Users can jump between steps via the step indicator, so validate all
    // required steps here (not just Step 8) before allowing a "pending" submit.
    const pendingValidationSteps = [1, 2, 3, 5, 6, 8] as const;
    let firstErrorStep: number | null = null;
    const combinedErrors: Record<string, string> = {};

    for (const s of pendingValidationSteps) {
      const stepErrors = validateStep(s);
      if (Object.keys(stepErrors).length && firstErrorStep == null) {
        firstErrorStep = s;
      }
      Object.assign(combinedErrors, stepErrors);
    }

    if (Object.keys(combinedErrors).length) {
      setErrors(combinedErrors);
      if (firstErrorStep != null) setActiveStep(firstErrorStep);
      return;
    }

    setErrors({});

    const warnings: string[] = [];
    if (selectedIsColdChainRequired && !formData.documents.coldChainCertificate) {
      warnings.push('Cold Chain Certificate is recommended/required for selected Dairy/Frozen categories.');
    }
    setSubmitWarnings(warnings);

    // On submit we still proceed even if warnings exist.
    try {
      const payloadToSend: VendorWizardFormData = {
        ...formData,
        documents: formData.documents || {},
      };

      if (mode === 'edit' && editVendorId && onEditSubmit) {
        await onEditSubmit(editVendorId, {
          status: 'pending',
          vendorCode,
          vendorId: editVendorId,
          formData: payloadToSend,
        });
      } else {
        const result = await onSubmit?.({
          status: 'pending',
          vendorCode,
          vendorId: draftVendorId,
          formData: payloadToSend,
        });
        const vendorIdFromResult =
          result && typeof result === 'object' && 'vendorId' in (result as any) ? (result as any).vendorId : undefined;
        if (vendorIdFromResult && !draftVendorId) setDraftVendorId(String(vendorIdFromResult));
      }

      sonnerToast.success(`Vendor "${formData.vendorName}" created successfully!`);
      onClose();
    } catch (err: any) {
      sonnerToast.error(err?.message || 'Failed to create vendor');
    }
  };

  const deliveryWindowOptions = useMemo(
    () =>
      [
        { code: 'early_morning' as const, label: 'Early Morning (5 AM – 8 AM)', icon: '🌅' },
        { code: 'morning' as const, label: 'Morning (8 AM – 12 PM)', icon: '☀️' },
        { code: 'afternoon' as const, label: 'Afternoon (12 PM – 4 PM)', icon: '🌤️' },
        { code: 'evening' as const, label: 'Evening (4 PM – 8 PM)', icon: '🌇' },
        { code: 'night' as const, label: 'Night (8 PM – 11 PM)', icon: '🌙' },
      ] as const,
    [],
  );

  const leadTimeDaysNum = Number(formData.leadTimeDays);
  const leadTimeTone = Number.isFinite(leadTimeDaysNum) ? getLeadTimeTone(leadTimeDaysNum) : 'standard';

  const updateDoc = async (key: VendorDocumentKey, file: File | null) => {
    if (!file) {
      setFormData((prev) => {
        const { [key]: _removed, ...rest } = prev.documents;
        return { ...prev, documents: rest };
      });
      return;
    }
    if (![ 'application/pdf', 'image/jpeg', 'image/jpg', 'image/png' ].includes(file.type)) {
      sonnerToast.error('Invalid file type. Upload PDF, JPG, or PNG.');
      return;
    }
    if (file.size > MAX_DOC_BYTES) {
      sonnerToast.error('File size exceeds 5MB limit.');
      return;
    }

    const encoded = await fileToEncodedFile(file);
    setFormData((prev) => ({
      ...prev,
      documents: { ...prev.documents, [key]: encoded },
    }));
  };

  const canRender = isOpen;
  if (!canRender) return null;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-start justify-center overflow-y-auto bg-black/50 px-4 pb-8 pt-[88px]"
      onClick={handleCancel}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[#E5E7EB] bg-[#F9FAFB]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-[#1F2937]">
                {mode === 'edit' ? 'Edit vendor' : 'Add Vendor'}
              </h2>
              <p className="text-sm text-[#6B7280] mt-1">{steps[activeStep - 1]?.subtitle}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {steps.map((s, idx) => {
              const stepNo = idx + 1;
              const isCompleted = stepNo < activeStep;
              const isActive = stepNo === activeStep;
              const cls = isActive
                ? 'bg-[#4F46E5] text-white'
                : isCompleted
                  ? 'bg-[#D1FAE5] text-[#065F46]'
                  : 'bg-[#F3F4F6] text-[#6B7280]';
              return (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => setActiveStep(stepNo)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left ${cls}`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span className="font-bold">{stepNo}</span>
                  <span className="text-xs font-semibold truncate max-w-[140px]">{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto bg-[#FFFFFF]">
          {submitWarnings.length ? (
            <div className="mb-4 bg-[#FEF3C7] border border-[#FDE68A] rounded-lg p-3 text-sm text-[#92400E]">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5" />
                <div>
                  <p className="font-medium">Please review before finalizing</p>
                  <ul className="mt-1 space-y-1">
                    {submitWarnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          {activeStep === 1 && (
            <section className="space-y-6">
              <h3 className="text-sm font-bold text-[#374151] uppercase tracking-wide">Basic Info</h3>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Vendor Name <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    value={formData.vendorName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, vendorName: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    maxLength={100}
                  />
                  {errors.vendorName ? <ErrorText text={errors.vendorName} /> : null}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      Vendor Type <span className="text-[#EF4444]">*</span>
                    </label>
                    <select
                      value={formData.vendorType}
                      onChange={(e) => setFormData((prev) => ({ ...prev, vendorType: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm bg-white focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    >
                      <option value="">Select type</option>
                      {VENDOR_TYPE_OPTIONS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                    {errors.vendorType ? <ErrorText text={errors.vendorType} /> : null}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">Tier</label>
                    <select
                      value={formData.tier}
                      onChange={(e) => setFormData((prev) => ({ ...prev, tier: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm bg-white focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    >
                      <option value="">Select tier</option>
                      {TIER_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Short vendor description"
                    rows={4}
                    maxLength={500}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                  <p className="text-xs text-[#6B7280] mt-1">Optional</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Registration / CIN Number <span className="text-[#6B7280] font-normal">(optional)</span>
                  </label>
                  <input
                    value={formData.registrationNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, registrationNumber: e.target.value }))
                    }
                    placeholder="e.g. U74999TN2020PTC123456"
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                  <p className="text-xs text-[#6B7280] mt-1">Company registration or CIN number</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Onboarding Source <span className="text-[#EF4444]">*</span>
                  </label>
                  <select
                    value={formData.onboardingSource}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        onboardingSource: e.target.value as VendorWizardFormData['onboardingSource'],
                      }))
                    }
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm bg-white focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    <option value="" disabled>
                      How did this vendor come to us?
                    </option>
                    <option value="direct">Direct / Self-Applied</option>
                    <option value="referral">Referral</option>
                    <option value="field_sales">Field Sales Team</option>
                    <option value="platform">Platform / Marketplace</option>
                    <option value="existing">Existing Relationship</option>
                  </select>
                  {errors.onboardingSource ? <ErrorText text={errors.onboardingSource} /> : null}
                </div>
              </div>
            </section>
          )}

          {activeStep === 2 && (
            <section className="space-y-6">
              <h3 className="text-sm font-bold text-[#374151] uppercase tracking-wide">Contact & Address</h3>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Contact Person <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    value={formData.contactPerson}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, contactPerson: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                  {errors.contactPerson ? <ErrorText text={errors.contactPerson} /> : null}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      Email <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    />
                    {errors.email ? <ErrorText text={errors.email} /> : null}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      Phone <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phonePrimary}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, phonePrimary: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    />
                    {errors.phonePrimary ? <ErrorText text={errors.phonePrimary} /> : null}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Address <span className="text-[#EF4444]">*</span>
                  </label>
                  <textarea
                    value={formData.addressLine1}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, addressLine1: e.target.value }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                  {errors.addressLine1 ? <ErrorText text={errors.addressLine1} /> : null}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      City <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      value={formData.city}
                      onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    />
                    {errors.city ? <ErrorText text={errors.city} /> : null}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      State <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      value={formData.state}
                      onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    />
                    {errors.state ? <ErrorText text={errors.state} /> : null}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Postal Code <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, postalCode: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                  {errors.postalCode ? <ErrorText text={errors.postalCode} /> : null}
                </div>

                <div className="bg-[#F9FAFB] rounded-xl p-4 border border-[#E5E7EB]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <label className="block text-sm font-bold text-[#1F2937] mb-2">
                        Serviceable Darkstores / Zones <span className="text-[#EF4444]">*</span>
                      </label>
                      <p className="text-xs text-[#6B7280] mt-1">
                        Select all darkstores this vendor can supply to based on proximity
                      </p>
                      {errors.serviceableZones ? <ErrorText text={errors.serviceableZones} /> : null}
                    </div>
                    <div className="text-xs font-semibold text-[#4F46E5] whitespace-nowrap">
                      {formData.serviceableZones.length} darkstores selected
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {DARKSTORE_OPTIONS.map((z) => {
                      const checked = formData.serviceableZones.includes(z);
                      return (
                        <label
                          key={z}
                          className="flex items-center gap-2 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setFormData((prev) => ({
                                ...prev,
                                serviceableZones: isChecked
                                  ? [...prev.serviceableZones, z]
                                  : prev.serviceableZones.filter((x) => x !== z),
                              }));
                            }}
                            className="w-4 h-4 border-[#D1D5DB] rounded text-[#4F46E5] focus:ring-[#4F46E5]"
                          />
                          <span className="text-sm text-[#1F2937]">{z.replace('Darkstore', '').trim()}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeStep === 3 && (
            <section className="space-y-6">
              <h3 className="text-sm font-bold text-[#374151] uppercase tracking-wide">Bank & Financial</h3>

              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      GST Number <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      value={formData.gstNumber}
                      onChange={(e) => setFormData((prev) => ({ ...prev, gstNumber: e.target.value }))}
                      placeholder="e.g. 27ABCDE1234F2Z5"
                      maxLength={15}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    />
                    {errors.gstNumber ? <ErrorText text={errors.gstNumber} /> : null}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">PAN <span className="text-[#6B7280] font-normal">(optional)</span></label>
                    <input
                      value={formData.panNumber}
                      onChange={(e) => setFormData((prev) => ({ ...prev, panNumber: e.target.value }))}
                      placeholder="e.g. ABCDE1234F"
                      maxLength={10}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      Bank Name <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      value={formData.bankName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, bankName: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    />
                    {errors.bankName ? <ErrorText text={errors.bankName} /> : null}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">Account Type</label>
                    <input
                      value={formData.accountType}
                      onChange={(e) => setFormData((prev) => ({ ...prev, accountType: e.target.value }))}
                      placeholder="e.g. Current / Savings"
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      Account No <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      value={formData.accountNo}
                      onChange={(e) => setFormData((prev) => ({ ...prev, accountNo: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    />
                    {errors.accountNo ? <ErrorText text={errors.accountNo} /> : null}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      IFSC <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      value={formData.ifscCode}
                      onChange={(e) => setFormData((prev) => ({ ...prev, ifscCode: e.target.value }))}
                      placeholder="e.g. HDFC0001234"
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    />
                    {errors.ifscCode ? <ErrorText text={errors.ifscCode} /> : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      Account Holder Name <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      value={formData.accountHolder}
                      onChange={(e) => setFormData((prev) => ({ ...prev, accountHolder: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    />
                    {errors.accountHolder ? <ErrorText text={errors.accountHolder} /> : null}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Payment Terms <span className="text-[#EF4444]">*</span>
                  </label>
                  <select
                    value={formData.paymentTermsBank}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentTermsBank: e.target.value as VendorWizardFormData['paymentTermsBank'],
                      }))
                    }
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm bg-white focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    <option value="" disabled>
                      Select payment terms
                    </option>
                    <option value="advance">Advance Payment</option>
                    <option value="net7">Net 7 (pay within 7 days)</option>
                    <option value="net15">Net 15 (pay within 15 days)</option>
                    <option value="net30">Net 30 (pay within 30 days)</option>
                    <option value="net45">Net 45 (pay within 45 days)</option>
                    <option value="cod">COD (Cash on Delivery)</option>
                  </select>
                  {errors.paymentTermsBank ? <ErrorText text={errors.paymentTermsBank} /> : null}
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Credit Limit (₹) <span className="text-[#6B7280] font-normal">(optional)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#1F2937]">₹</span>
                    <input
                      value={formData.creditLimit}
                      onChange={(e) => setFormData((prev) => ({ ...prev, creditLimit: e.target.value }))}
                      placeholder="e.g. 50000"
                      inputMode="numeric"
                      className="flex-1 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    />
                  </div>
                  <p className="text-xs text-[#6B7280] mt-1">Maximum credit this vendor can extend to us</p>
                </div>
              </div>
            </section>
          )}

          {activeStep === 4 && (
            <section className="space-y-6">
              <h3 className="text-sm font-bold text-[#374151] uppercase tracking-wide">Documents</h3>

              <p className="text-xs text-[#6B7280]">
                Upload documents (optional). Cold Chain warning is shown on final submit if needed.
              </p>

              <div className="grid grid-cols-1 gap-4">
                <DocUpload
                  title="FSSAI"
                  docKey="fssaiCertificate"
                  file={formData.documents.fssaiCertificate}
                  onFile={(f) => updateDoc('fssaiCertificate', f)}
                />
                <DocUpload
                  title="GST Certificate"
                  docKey="gstCertificate"
                  file={formData.documents.gstCertificate}
                  onFile={(f) => updateDoc('gstCertificate', f)}
                />
                <DocUpload
                  title="Business License"
                  docKey="businessLicense"
                  file={formData.documents.businessLicense}
                  onFile={(f) => updateDoc('businessLicense', f)}
                />
                <DocUpload
                  title="ISO"
                  docKey="isoCertificate"
                  file={formData.documents.isoCertificate}
                  onFile={(f) => updateDoc('isoCertificate', f)}
                />
                <DocUpload
                  title="Insurance Certificate"
                  docKey="insuranceCertificate"
                  file={formData.documents.insuranceCertificate}
                  onFile={(f) => updateDoc('insuranceCertificate', f)}
                />

                {selectedIsColdChainRequired ? (
                  <DocUpload
                    title="Cold Chain Certificate"
                    requiredBadge
                    docKey="coldChainCertificate"
                    file={formData.documents.coldChainCertificate}
                    onFile={(f) => updateDoc('coldChainCertificate', f)}
                  />
                ) : null}
              </div>
            </section>
          )}

          {activeStep === 5 && (
            <section className="space-y-6">
              <h3 className="text-sm font-bold text-[#374151] uppercase tracking-wide">Categories & Products</h3>

              <div className="bg-[#F9FAFB] rounded-xl p-4 border border-[#E5E7EB]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      Categories <span className="text-[#EF4444]">*</span>
                    </label>
                    <p className="text-xs text-[#6B7280]">Select all categories this vendor can supply</p>
                    {errors.selectedCategories ? <ErrorText text={errors.selectedCategories} /> : null}
                  </div>
                  <div className="text-xs font-semibold text-[#4F46E5] whitespace-nowrap">
                    {formData.selectedCategories.length} selected
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {CATEGORY_OPTIONS_22.map((c) => {
                    const checked = formData.selectedCategories.includes(c);
                    return (
                      <label key={c} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setFormData((prev) => ({
                              ...prev,
                              selectedCategories: isChecked
                                ? [...prev.selectedCategories, c]
                                : prev.selectedCategories.filter((x) => x !== c),
                            }));
                          }}
                          className="w-4 h-4 border-[#D1D5DB] rounded text-[#4F46E5] focus:ring-[#4F46E5]"
                        />
                        <span className="text-sm text-[#1F2937]">{c}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#1F2937] mb-2">
                  Product Type <span className="text-[#EF4444]">*</span>
                </label>
                <select
                  value={formData.productType}
                  onChange={(e) => setFormData((prev) => ({ ...prev, productType: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm bg-white focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="" disabled>
                    Select product type
                  </option>
                  {PRODUCT_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {errors.productType ? <ErrorText text={errors.productType} /> : null}
              </div>
            </section>
          )}

          {activeStep === 6 && (
            <section className="space-y-6">
              <h3 className="text-sm font-bold text-[#374151] uppercase tracking-wide">Purchase Limits</h3>

              <div className="bg-[#F9FAFB] rounded-xl p-4 border border-[#E5E7EB] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      Min Qty per day <span className="text-[#EF4444]">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        value={formData.minQtyPerDay}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, minQtyPerDay: e.target.value }))
                        }
                        type="number"
                        inputMode="numeric"
                        className="flex-1 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      />
                      <select
                        value={formData.qtyUnit}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, qtyUnit: e.target.value as QtyUnitCode }))
                        }
                        className="px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm bg-white focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      >
                        <option value="kg">kg</option>
                        <option value="L">L</option>
                        <option value="Pieces">Pieces</option>
                        <option value="Boxes">Boxes</option>
                      </select>
                    </div>
                    {errors.minQtyPerDay ? <ErrorText text={errors.minQtyPerDay} /> : null}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      Max Qty per day <span className="text-[#EF4444]">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        value={formData.maxQtyPerDay}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, maxQtyPerDay: e.target.value }))
                        }
                        type="number"
                        inputMode="numeric"
                        className="flex-1 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      />
                      <select
                        value={formData.qtyUnit}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, qtyUnit: e.target.value as QtyUnitCode }))
                        }
                        className="px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm bg-white focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      >
                        <option value="kg">kg</option>
                        <option value="L">L</option>
                        <option value="Pieces">Pieces</option>
                        <option value="Boxes">Boxes</option>
                      </select>
                    </div>
                    {errors.maxQtyPerDay ? <ErrorText text={errors.maxQtyPerDay} /> : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      Lead Time (Days) <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      value={formData.leadTimeDays}
                      onChange={(e) => setFormData((prev) => ({ ...prev, leadTimeDays: e.target.value }))}
                      type="number"
                      min={1}
                      max={30}
                      placeholder="e.g. 2"
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    />
                    <p className="text-xs text-[#6B7280] mt-1">
                      How many days from PO creation to delivery at darkstore?
                    </p>
                    <div className="mt-2">
                      <span
                        className={
                          leadTimeTone === 'fast'
                            ? BadgeTone({ tone: 'success' })
                            : leadTimeTone === 'standard'
                              ? BadgeTone({ tone: 'warning' })
                              : BadgeTone({ tone: 'danger' })
                        }
                      >
                        {leadTimeTone === 'fast' ? 'Fast' : leadTimeTone === 'standard' ? 'Standard' : 'Slow'}
                      </span>
                    </div>
                    {errors.leadTimeDays ? <ErrorText text={errors.leadTimeDays} /> : null}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      Minimum Order Value (₹) <span className="text-[#EF4444]">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1F2937]">₹</span>
                      <input
                        value={formData.minimumOrderValue}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, minimumOrderValue: e.target.value }))
                        }
                        type="number"
                        inputMode="numeric"
                        placeholder="e.g. 5000"
                        className="flex-1 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      />
                    </div>
                    <p className="text-xs text-[#6B7280] mt-1">
                      Minimum invoice value per purchase order
                    </p>
                    {errors.minimumOrderValue ? <ErrorText text={errors.minimumOrderValue} /> : null}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Preferred Payment Terms <span className="text-[#EF4444]">*</span>
                  </label>
                  <select
                    value={formData.paymentTermsPreferred}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentTermsPreferred: e.target.value as VendorWizardFormData['paymentTermsPreferred'],
                      }))
                    }
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm bg-white focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    <option value="" disabled>
                      Select preferred payment terms
                    </option>
                    <option value="advance">Advance Payment</option>
                    <option value="net7">Net 7 (pay within 7 days)</option>
                    <option value="net15">Net 15 (pay within 15 days)</option>
                    <option value="net30">Net 30 (pay within 30 days)</option>
                    <option value="net45">Net 45 (pay within 45 days)</option>
                    <option value="cod">COD (Cash on Delivery)</option>
                  </select>
                  {errors.paymentTermsPreferred ? (
                    <ErrorText text={errors.paymentTermsPreferred} />
                  ) : null}
                  <p className="text-xs text-[#6B7280] mt-1">
                    This was set in Bank Details. You can override here.
                  </p>
                </div>
              </div>
            </section>
          )}

          {activeStep === 7 && (
            <section className="space-y-6">
              <h3 className="text-sm font-bold text-[#374151] uppercase tracking-wide">Category Limits</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-[#6B7280]">
                    Overrides global purchase limits for each selected category.
                  </p>
                  <span className="text-xs font-semibold text-[#4F46E5]">
                    {formData.categoryLimits.length} limits added
                  </span>
                </div>

                <CategoryLimitInlineForm
                  selectedCategories={formData.selectedCategories}
                  globalUnit={formData.qtyUnit}
                  onAdd={(row) =>
                    setFormData((prev) => ({
                      ...prev,
                      categoryLimits: [...prev.categoryLimits, row],
                    }))
                  }
                />

                <div className="space-y-3">
                  {formData.categoryLimits.length === 0 ? (
                    <p className="text-sm text-[#9CA3AF] py-6">No category limits added.</p>
                  ) : (
                    formData.categoryLimits.map((l, idx) => (
                      <div
                        key={`${l.category}-${idx}`}
                        className="flex items-center justify-between p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1F2937] truncate">{l.category}</p>
                          <p className="text-xs text-[#6B7280] mt-1">
                            Min: {l.minQty} {l.unit} | Max: {l.maxQty} {l.unit}
                            {typeof l.leadTimeDays === 'number' ? ` | Lead Time: ${l.leadTimeDays} days` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              categoryLimits: prev.categoryLimits.filter((_, i) => i !== idx),
                            }))
                          }
                          className="px-3 py-1.5 text-xs font-bold text-[#EF4444] hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          )}

          {activeStep === 8 && (
            <section className="space-y-6">
              <h3 className="text-sm font-bold text-[#374151] uppercase tracking-wide">SLA & Operations</h3>

              <div className="space-y-4">
                <div className="bg-[#F9FAFB] rounded-xl p-4 border border-[#E5E7EB]">
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Delivery Window <span className="text-[#EF4444]">*</span>
                  </label>
                  {errors.deliveryWindows ? <ErrorText text={errors.deliveryWindows} /> : null}
                  <p className="text-xs text-[#6B7280] mt-1">
                    When can this vendor deliver to your darkstores?
                  </p>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {deliveryWindowOptions.map((o) => {
                      const checked = formData.deliveryWindows.includes(o.code);
                      return (
                        <label key={o.code} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setFormData((prev) => ({
                                ...prev,
                                deliveryWindows: isChecked
                                  ? [...prev.deliveryWindows, o.code]
                                  : prev.deliveryWindows.filter((x) => x !== o.code),
                              }));
                            }}
                            className="w-4 h-4 border-[#D1D5DB] rounded text-[#4F46E5] focus:ring-[#4F46E5]"
                          />
                          <span className="flex items-center gap-2 text-sm text-[#1F2937]">
                            <span aria-hidden>{o.icon}</span>
                            {o.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-[#F9FAFB] rounded-xl p-4 border border-[#E5E7EB]">
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    SLA Compliance Target % <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs text-[#6B7280]">On-time delivery target for this vendor</p>
                    </div>
                    <div className="text-sm font-bold text-[#1F2937] whitespace-nowrap">
                      {formData.slaTargetPercent}%
                    </div>
                  </div>
                  <div className="mt-3">
                    <input
                      type="range"
                      min={70}
                      max={100}
                      step={5}
                      value={formData.slaTargetPercent}
                      onChange={(e) => setFormData((prev) => ({ ...prev, slaTargetPercent: Number(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  {errors.slaTargetPercent ? <ErrorText text={errors.slaTargetPercent} /> : null}

                  <div className="mt-2">
                    <span
                      className={
                        formData.slaTargetPercent >= 90
                          ? BadgeTone({ tone: 'success' })
                          : formData.slaTargetPercent >= 80
                            ? BadgeTone({ tone: 'warning' })
                            : BadgeTone({ tone: 'danger' })
                      }
                    >
                      {formData.slaTargetPercent >= 90
                        ? 'Green'
                        : formData.slaTargetPercent >= 80
                          ? 'Amber'
                          : 'Red'}
                    </span>
                  </div>
                </div>

                <div className="bg-[#F9FAFB] rounded-xl p-4 border border-[#E5E7EB]">
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Substitution Policy <span className="text-[#EF4444]">*</span>
                  </label>
                  {errors.substitutionPolicy ? <ErrorText text={errors.substitutionPolicy} /> : null}

                  <div className="space-y-2 mt-4">
                    {[
                      {
                        code: 'allowed' as const,
                        label: 'Yes — vendor can substitute with similar items if OOS',
                      },
                      {
                        code: 'not_allowed' as const,
                        label: 'No — vendor must fulfill exact items only',
                      },
                      {
                        code: 'case_by_case' as const,
                        label: 'Case by case — requires approval before substituting',
                      },
                    ].map((r) => (
                      <label key={r.code} className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="substitutionPolicy"
                          checked={formData.substitutionPolicy === r.code}
                          onChange={() => setFormData((prev) => ({ ...prev, substitutionPolicy: r.code }))}
                          className="mt-1"
                        />
                        <span className="text-sm text-[#1F2937]">{r.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-[#F9FAFB] rounded-xl p-4 border border-[#E5E7EB]">
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Return Policy <span className="text-[#EF4444]">*</span>
                  </label>
                  {errors.returnPolicy ? <ErrorText text={errors.returnPolicy} /> : null}

                  <div className="space-y-2 mt-4">
                    {[
                      { code: 'full' as const, label: 'Full returns accepted (within 24 hours)' },
                      { code: 'partial' as const, label: 'Partial returns only (damaged/expired items)' },
                      { code: 'none' as const, label: 'No returns — all sales final' },
                    ].map((r) => (
                      <label key={r.code} className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="returnPolicy"
                          checked={formData.returnPolicy === r.code}
                          onChange={() => setFormData((prev) => ({ ...prev, returnPolicy: r.code }))}
                          className="mt-1"
                        />
                        <span className="text-sm text-[#1F2937]">{r.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Special Instructions <span className="text-[#6B7280] font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={formData.specialInstructions}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        specialInstructions: e.target.value.slice(0, 300),
                      }))
                    }
                    placeholder="Any special handling, delivery instructions, or notes..."
                    rows={4}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                  <div className="text-xs text-[#6B7280] mt-1 text-right">
                    {formData.specialInstructions.length}/300 characters
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="p-6 border-t border-[#E5E7EB] bg-[#F9FAFB] flex justify-between items-center gap-3">
          <button
            type="button"
            disabled={submittingDraft}
            onClick={handleSaveAsDraft}
            className="px-4 py-2 border border-[#D1D5DB] rounded-lg text-sm font-bold text-[#1F2937] hover:bg-[#F3F4F6] disabled:opacity-50"
          >
            {submittingDraft ? 'Saving Draft…' : 'Save as Draft'}
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 border border-[#D1D5DB] rounded-lg text-sm font-bold text-[#1F2937] hover:bg-[#F3F4F6]"
            >
              Cancel
            </button>

            {activeStep < 8 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-bold hover:bg-[#4338CA]"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-bold hover:bg-[#4338CA]"
              >
                Submit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DocUpload({
  title,
  requiredBadge,
  docKey,
  file,
  onFile,
}: {
  title: string;
  requiredBadge?: boolean;
  docKey: VendorDocumentKey;
  file?: EncodedFile;
  onFile: (file: File | null) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <label className="block text-sm font-bold text-[#1F2937] mb-2">
            {title}
            {requiredBadge ? (
              <span className="ml-3 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#FEF3C7] text-[#92400E]">
                Required for Dairy/Frozen
              </span>
            ) : null}
          </label>
          <p className="text-xs text-[#6B7280]">PDF, JPG, or PNG (max 5MB)</p>
        </div>
      </div>

      <label className="block">
        <input
          type="file"
          accept={PDF_IMAGE_ACCEPT}
          className="hidden"
          ref={inputRef}
          onChange={async (e) => {
            const f = e.target.files?.[0] || null;
            await onFile(f);
          }}
        />
        <div
          className={`border-2 border-dashed rounded-lg p-4 cursor-pointer hover:border-[#4F46E5] transition-colors ${
            file ? 'border-[#10B981] bg-[#ECFDF5]' : 'border-[#D1D5DB] bg-[#F9FAFB]'
          }`}
          onClick={() => {
            inputRef.current?.click();
          }}
          role="button"
          tabIndex={0}
        >
          {file ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#065F46] truncate">{file.fileName}</p>
                <p className="text-xs text-[#6B7280] mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFile(null);
                }}
                className="text-xs font-bold text-[#EF4444] hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="text-center">
              <Upload size={20} className="mx-auto text-[#6B7280] mb-2" />
              <p className="text-sm font-medium text-[#1F2937]">Click to upload</p>
              <p className="text-xs text-[#6B7280] mt-1">or drag and drop (browser supported)</p>
            </div>
          )}
        </div>
      </label>
    </div>
  );
}

function CategoryLimitInlineForm({
  selectedCategories,
  globalUnit,
  onAdd,
}: {
  selectedCategories: string[];
  globalUnit: QtyUnitCode;
  onAdd: (row: VendorCategoryLimit) => void;
}) {
  const [open, setOpen] = useState(false);

  const [draftCategory, setDraftCategory] = useState('');
  const [minQty, setMinQty] = useState('');
  const [maxQty, setMaxQty] = useState('');
  const [unit, setUnit] = useState<QtyUnitCode>(globalUnit);
  const [leadTimeOverride, setLeadTimeOverride] = useState('');

  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraftCategory(selectedCategories[0] || '');
      setMinQty('');
      setMaxQty('');
      setUnit(globalUnit);
      setLeadTimeOverride('');
      setLocalError(null);
    }
  }, [open, selectedCategories, globalUnit]);

  const canAdd = selectedCategories.length > 0;

  return (
    <div>
      <button
        type="button"
        disabled={!canAdd}
        onClick={() => setOpen(true)}
        className="mt-3 text-sm text-[#4F46E5] hover:underline disabled:opacity-50"
      >
        + Add Category Limit
      </button>

      {open ? (
        <div className="mt-4 p-4 bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl space-y-4">
          <div>
            <label className="block text-sm font-bold text-[#1F2937] mb-2">Category</label>
            <select
              value={draftCategory}
              onChange={(e) => setDraftCategory(e.target.value)}
              className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm bg-white focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
            >
              {selectedCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-[#1F2937] mb-2">Min Qty per day</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={minQty}
                  onChange={(e) => setMinQty(e.target.value)}
                  placeholder="Min"
                  className="flex-1 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as QtyUnitCode)}
                  className="px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm bg-white focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="kg">kg</option>
                  <option value="L">L</option>
                  <option value="Pieces">Pieces</option>
                  <option value="Boxes">Boxes</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1F2937] mb-2">Max Qty per day</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={maxQty}
                  onChange={(e) => setMaxQty(e.target.value)}
                  placeholder="Max"
                  className="flex-1 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as QtyUnitCode)}
                  className="px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm bg-white focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="kg">kg</option>
                  <option value="L">L</option>
                  <option value="Pieces">Pieces</option>
                  <option value="Boxes">Boxes</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1F2937] mb-2">
                Lead Time override (days)
              </label>
              <input
                type="number"
                value={leadTimeOverride}
                onChange={(e) => setLeadTimeOverride(e.target.value)}
                placeholder="Optional"
                min={1}
                max={30}
                className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
          </div>

          {localError ? <p className="text-xs text-[#EF4444]">{localError}</p> : null}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setLocalError(null);

                const min = Number(minQty);
                const max = Number(maxQty);
                if (!draftCategory) return setLocalError('Category is required');
                if (!Number.isFinite(min) || !Number.isFinite(max)) return setLocalError('Min/Max quantities are required');
                if (max <= min) return setLocalError('Max qty must be greater than min qty');

                const limit: VendorCategoryLimit = {
                  category: draftCategory,
                  minQty: min,
                  maxQty: max,
                  unit,
                };

                const lt = leadTimeOverride.trim() ? Number(leadTimeOverride) : undefined;
                if (typeof lt === 'number' && Number.isFinite(lt)) limit.leadTimeDays = lt;

                onAdd(limit);
                setOpen(false);
              }}
              className="flex-1 px-3 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-bold hover:bg-[#4338CA]"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm font-bold text-[#1F2937] hover:bg-[#F3F4F6]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// These exports are preserved for any legacy callers expecting the original category list.
export const VENDOR_CATEGORY_OPTIONS = [
  'Vegetables',
  'Fruits',
  'Spices',
  'Dairy / Perishables',
  'Packaged Goods',
  'Fresh Produce',
  'Packaging',
] as const;

