import React, { useState } from 'react';
import { X, Plus, Trash2, ChevronDown } from 'lucide-react';

interface AddVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => void;
}

interface CategoryLimit {
  category: string;
  min: string;
  max: string;
  unit: string;
}

const ALL_CATEGORIES = [
  'Fruits', 'Vegetables', 'Atta', 'Rice', 'Oil', 'Dals', 'Dairy', 'Bread', 
  'Eggs', 'Masalas', 'Whole Spices', 'Salt', 'Sugar', 'Jaggery', 
  'Dry Fruits', 'Seeds', 'Grains Pulses', 'Millets', 'Tea', 'Coffee', 
  'Breakfast', 'Spreads'
];

export function AddVendorModal({ isOpen, onClose, onSubmit }: AddVendorModalProps) {
  const [currentStep, setCurrentStep] = useState<'basic' | 'contact' | 'bank' | 'documents' | 'categories' | 'limits' | 'categoryLimits'>('basic');
  
  // Form data states
  const [vendorName, setVendorName] = useState('');
  const [vendorType, setVendorType] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [productType, setProductType] = useState('both');
  const [tier, setTier] = useState('');
  const [description, setDescription] = useState('');
  
  const [contactPerson, setContactPerson] = useState('');
  const [phonePrimary, setPhonePrimary] = useState('');
  const [phoneAlternate, setPhoneAlternate] = useState('');
  const [email, setEmail] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Tamil Nadu');
  const [postalCode, setPostalCode] = useState('');
  
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankName, setBankName] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountType, setAccountType] = useState('');
  
  // Purchase Limits states
  const [minQuantity, setMinQuantity] = useState('100');
  const [maxQuantity, setMaxQuantity] = useState('500');
  const [unit, setUnit] = useState('kg');
  
  // Category-specific limits
  const [categoryLimits, setCategoryLimits] = useState<CategoryLimit[]>([]);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const addCategoryLimit = () => {
    setCategoryLimits([...categoryLimits, { category: '', min: '', max: '', unit: 'kg' }]);
  };

  const removeCategoryLimit = (index: number) => {
    setCategoryLimits(categoryLimits.filter((_, i) => i !== index));
  };

  const updateCategoryLimit = (index: number, field: keyof CategoryLimit, value: string) => {
    const updated = [...categoryLimits];
    updated[index][field] = value;
    setCategoryLimits(updated);
  };

  const handleNext = () => {
    const stepOrder: Array<'basic' | 'contact' | 'bank' | 'documents' | 'categories' | 'limits' | 'categoryLimits'> = [
      'basic', 'contact', 'bank', 'documents', 'categories', 'limits', 'categoryLimits'
    ];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If not on the last section, go to next section
    if (currentStep !== 'categoryLimits') {
      handleNext();
      return;
    }
    
    // Only submit when on the last section
    const formData = {
      vendorName,
      vendorType,
      selectedCategories,
      productType,
      tier,
      description,
      contactPerson,
      phonePrimary,
      phoneAlternate,
      email,
      fullAddress,
      city,
      state,
      postalCode,
      gstNumber,
      panNumber,
      bankAccount,
      bankName,
      ifscCode,
      accountHolder,
      accountType,
      purchaseLimits: {
        min: minQuantity,
        max: maxQuantity,
        unit
      },
      categoryLimits
    };
    
    onSubmit(formData);
  };

  if (!isOpen) return null;

  const steps = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'contact', label: 'Contact & Address' },
    { id: 'bank', label: 'Bank & Financial' },
    { id: 'documents', label: 'Documents' },
    { id: 'categories', label: 'Categories' },
    { id: 'limits', label: 'Purchase Limits' },
    { id: 'categoryLimits', label: 'Category Limits' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#E5E7EB]">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-[#1F2937]">Add New Vendor</h2>
              <p className="text-sm text-[#6B7280] mt-1">Fill in vendor details to get started</p>
            </div>
            <button 
              onClick={onClose}
              className="text-[#6B7280] hover:text-[#1F2937] p-1 hover:bg-[#F3F4F6] rounded"
            >
              <X size={20} />
            </button>
          </div>

          {/* Step Navigation */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id as any)}
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  currentStep === step.id 
                    ? 'bg-[#4F46E5] text-white' 
                    : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
                }`}
              >
                {index + 1}. {step.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* SECTION A: Basic Information */}
            {currentStep === 'basic' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Vendor Name <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="text"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="Enter vendor name"
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Vendor Type <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Farmer', 'Distributor', 'Aggregator', 'Third-party'].map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="vendorType"
                          value={type}
                          checked={vendorType === type}
                          onChange={(e) => setVendorType(e.target.value)}
                          className="w-4 h-4 text-[#4F46E5]"
                          required
                        />
                        <span className="text-sm text-[#1F2937]">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Vendor Tier <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="flex gap-3">
                    {['Preferred', 'Standard', 'New'].map((t) => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="tier"
                          value={t}
                          checked={tier === t}
                          onChange={(e) => setTier(e.target.value)}
                          className="w-4 h-4 text-[#4F46E5]"
                          required
                        />
                        <span className="text-sm text-[#1F2937]">{t}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter vendor description..."
                    rows={3}
                    maxLength={500}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                  <div className="text-xs text-[#6B7280] text-right mt-1">{description.length}/500</div>
                </div>
              </div>
            )}

            {/* SECTION B: Contact & Address */}
            {currentStep === 'contact' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      Contact Person <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="Full name"
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
                      placeholder="vendor@example.com"
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      Primary Phone <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phonePrimary}
                      onChange={(e) => setPhonePrimary(e.target.value)}
                      placeholder="+91-9876543210"
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      Alternate Phone
                    </label>
                    <input
                      type="tel"
                      value={phoneAlternate}
                      onChange={(e) => setPhoneAlternate(e.target.value)}
                      placeholder="+91-9876543211"
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Full Address <span className="text-[#EF4444]">*</span>
                  </label>
                  <textarea
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                    placeholder="Street address, building, landmark..."
                    rows={2}
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      City <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Chennai"
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      State <span className="text-[#EF4444]">*</span>
                    </label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      required
                    >
                      <option value="Tamil Nadu">Tamil Nadu</option>
                      <option value="Karnataka">Karnataka</option>
                      <option value="Kerala">Kerala</option>
                      <option value="Andhra Pradesh">Andhra Pradesh</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      Postal Code <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="600001"
                      maxLength={6}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION C: Bank & Financial */}
            {currentStep === 'bank' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      GST Number <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      placeholder="33AABCU6034K2Z5"
                      maxLength={15}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      PAN Number
                    </label>
                    <input
                      type="text"
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value)}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      Bank Name <span className="text-[#EF4444]">*</span>
                    </label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      required
                    >
                      <option value="">Select bank</option>
                      <option value="ICICI Bank">ICICI Bank</option>
                      <option value="HDFC Bank">HDFC Bank</option>
                      <option value="SBI">State Bank of India</option>
                      <option value="Axis Bank">Axis Bank</option>
                      <option value="Kotak Mahindra">Kotak Mahindra</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      Account Type <span className="text-[#EF4444]">*</span>
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="accountType"
                          value="Savings"
                          checked={accountType === 'Savings'}
                          onChange={(e) => setAccountType(e.target.value)}
                          className="w-4 h-4 text-[#4F46E5]"
                          required
                        />
                        <span className="text-sm text-[#1F2937]">Savings</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="accountType"
                          value="Current"
                          checked={accountType === 'Current'}
                          onChange={(e) => setAccountType(e.target.value)}
                          className="w-4 h-4 text-[#4F46E5]"
                        />
                        <span className="text-sm text-[#1F2937]">Current</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      Bank Account Number <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="1234567890123456"
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">
                      IFSC Code <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value)}
                      placeholder="ICIC0000001"
                      maxLength={11}
                      className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Account Holder Name <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="As per bank records"
                    className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    required
                  />
                </div>
              </div>
            )}

            {/* SECTION D: Documents */}
            {currentStep === 'documents' && (
              <div className="space-y-4">
                <p className="text-sm text-[#6B7280] mb-4">Upload required vendor documents (optional during initial setup)</p>
                
                {['FSSAI License', 'GST Certificate', 'Business License', 'ISO Certificate', 'Insurance Certificate'].map((doc) => (
                  <div key={doc} className="border-2 border-dashed border-[#D1D5DB] rounded-lg p-4 hover:border-[#4F46E5] transition-colors">
                    <label className="block text-sm font-bold text-[#1F2937] mb-2">{doc}</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="w-full text-sm text-[#6B7280]"
                    />
                    <p className="text-xs text-[#6B7280] mt-1">PDF, JPG, PNG (Max 5MB)</p>
                  </div>
                ))}
              </div>
            )}

            {/* SECTION E: Categories & Products */}
            {currentStep === 'categories' && (
              <div className="space-y-4">
                <div className="bg-[#F0F7FF] border border-[#BFDBFE] rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-bold text-[#1E40AF] mb-2">Select Categories</h4>
                  <p className="text-xs text-[#1E40AF]">Choose one or more categories that this vendor can supply</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {ALL_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedCategories.includes(category)
                          ? 'bg-[#4F46E5] text-white shadow-md'
                          : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB] border border-[#E5E7EB]'
                      }`}
                    >
                      {selectedCategories.includes(category) && '✓ '}
                      {category}
                    </button>
                  ))}
                </div>

                {selectedCategories.length > 0 && (
                  <div className="mt-6 p-4 bg-[#F9FAFB] rounded-lg">
                    <label className="block text-sm font-bold text-[#1F2937] mb-3">
                      Product Types <span className="text-[#EF4444]">*</span>
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="productType"
                          value="raw"
                          checked={productType === 'raw'}
                          onChange={(e) => setProductType(e.target.value)}
                          className="w-4 h-4 text-[#4F46E5]"
                        />
                        <span className="text-sm text-[#1F2937]">Raw products (unprocessed)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="productType"
                          value="finished"
                          checked={productType === 'finished'}
                          onChange={(e) => setProductType(e.target.value)}
                          className="w-4 h-4 text-[#4F46E5]"
                        />
                        <span className="text-sm text-[#1F2937]">Finished products (processed)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="productType"
                          value="both"
                          checked={productType === 'both'}
                          onChange={(e) => setProductType(e.target.value)}
                          className="w-4 h-4 text-[#4F46E5]"
                        />
                        <span className="text-sm text-[#1F2937]">Both raw and finished</span>
                      </label>
                    </div>
                  </div>
                )}

                <p className="text-xs text-[#6B7280] italic">
                  Selected {selectedCategories.length} of {ALL_CATEGORIES.length} categories
                </p>
              </div>
            )}

            {/* SECTION F: Purchase Limits */}
            {currentStep === 'limits' && (
              <div className="space-y-6">
                <div className="bg-[#F0F7FF] border border-[#BFDBFE] rounded-lg p-4">
                  <h4 className="text-sm font-bold text-[#1E40AF] mb-2">Purchase Limits</h4>
                  <p className="text-xs text-[#1E40AF]">Set global daily purchase constraints for this vendor</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Minimum Quantity Per Day <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={minQuantity}
                      onChange={(e) => setMinQuantity(e.target.value)}
                      placeholder="50"
                      min="0"
                      className="flex-1 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      required
                    />
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-32 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                    >
                      <option value="kg">kg</option>
                      <option value="L">Litre (L)</option>
                      <option value="pcs">Pieces</option>
                      <option value="boxes">Boxes</option>
                    </select>
                  </div>
                  <p className="text-xs text-[#6B7280] italic mt-1">Vendor can supply minimum {minQuantity} {unit} per day</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#1F2937] mb-2">
                    Maximum Quantity Per Day <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={maxQuantity}
                      onChange={(e) => setMaxQuantity(e.target.value)}
                      placeholder="500"
                      min="0"
                      className="flex-1 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                      required
                    />
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-32 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                    >
                      <option value="kg">kg</option>
                      <option value="L">Litre (L)</option>
                      <option value="pcs">Pieces</option>
                      <option value="boxes">Boxes</option>
                    </select>
                  </div>
                  <p className="text-xs text-[#6B7280] italic mt-1">Vendor can supply maximum {maxQuantity} {unit} per day</p>
                </div>
              </div>
            )}

            {/* SECTION G: Category-Specific Limits */}
            {currentStep === 'categoryLimits' && (
              <div className="space-y-4">
                <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-lg p-4">
                  <h4 className="text-sm font-bold text-[#92400E] mb-2">Category-Specific Limits (Optional)</h4>
                  <p className="text-xs text-[#92400E]">Set different limits for specific categories. Leave empty to use global limits.</p>
                </div>

                {categoryLimits.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-[#E5E7EB] rounded-lg">
                    <p className="text-sm text-[#9CA3AF] mb-3">No category limits added</p>
                    <button
                      type="button"
                      onClick={addCategoryLimit}
                      className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-medium hover:bg-[#4338CA] flex items-center gap-2 mx-auto"
                    >
                      <Plus size={16} />
                      Add Category Limit
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {categoryLimits.map((limit, index) => (
                      <div key={index} className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                        <div className="grid grid-cols-4 gap-3">
                          <select
                            value={limit.category}
                            onChange={(e) => updateCategoryLimit(index, 'category', e.target.value)}
                            className="px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                          >
                            <option value="">Select category</option>
                            {selectedCategories.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>

                          <input
                            type="number"
                            value={limit.min}
                            onChange={(e) => updateCategoryLimit(index, 'min', e.target.value)}
                            placeholder="Min"
                            className="px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                          />

                          <input
                            type="number"
                            value={limit.max}
                            onChange={(e) => updateCategoryLimit(index, 'max', e.target.value)}
                            placeholder="Max"
                            className="px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                          />

                          <div className="flex gap-2">
                            <select
                              value={limit.unit}
                              onChange={(e) => updateCategoryLimit(index, 'unit', e.target.value)}
                              className="flex-1 px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:border-[#4F46E5]"
                            >
                              <option value="kg">kg</option>
                              <option value="L">L</option>
                              <option value="pcs">pcs</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => removeCategoryLimit(index)}
                              className="p-2 text-[#EF4444] hover:bg-[#FEE2E2] rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addCategoryLimit}
                      className="w-full px-4 py-2 border-2 border-dashed border-[#4F46E5] text-[#4F46E5] rounded-lg text-sm font-medium hover:bg-[#F0F7FF] flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Add Another Category Limit
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[#E5E7EB] bg-[#F9FAFB] flex justify-between items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 text-[#4F46E5] rounded" />
              <span className="text-sm text-[#6B7280]">Save as draft</span>
            </label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-[#D1D5DB] rounded-lg text-sm font-bold text-[#1F2937] hover:bg-[#F3F4F6] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-bold hover:bg-[#4338CA] transition-colors"
              >
                {currentStep === 'categoryLimits' ? 'Save Vendor' : 'Next'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}