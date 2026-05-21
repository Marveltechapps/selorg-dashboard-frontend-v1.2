export const STAFF_ROLES = [
  'Picker',
  'Packer',
  'Forklift Operator',
  'QC Inspector',
  'Supervisor',
  'Warehouse Manager',
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_SHIFTS = [
  { value: 'morning', label: 'Morning (6AM - 2PM)' },
  { value: 'afternoon', label: 'Afternoon (2PM - 10PM)' },
  { value: 'night', label: 'Night (10PM - 6AM)' },
] as const;

export type StaffShift = (typeof STAFF_SHIFTS)[number]['value'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeIndianPhone(phone: string): string | null {
  const raw = phone.trim();
  if (!raw) return null;

  const digits = raw.replace(/\D/g, '');
  const local = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(local)) return null;

  return `+91-${local.slice(0, 5)}-${local.slice(5)}`;
}

export function formatIndianPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  const local = digits.startsWith('91') ? digits.slice(2, 12) : digits.slice(0, 10);
  if (!local) return value.startsWith('+') ? '+' : '';

  if (local.length <= 5) return `+91 ${local}`;
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}

export interface NewStaffForm {
  name: string;
  email: string;
  phone: string;
  role: StaffRole | '';
  shift: StaffShift;
  hourlyRate: string;
}

export function validateNewStaffForm(form: NewStaffForm): string | null {
  const name = form.name.trim();
  if (!name) return 'Full name is required';
  if (name.length < 2) return 'Full name must be at least 2 characters';

  const email = form.email.trim();
  if (!email) return 'Email is required';
  if (!EMAIL_REGEX.test(email)) return 'Enter a valid email address';

  if (!form.phone.trim()) return 'Phone number is required';
  if (!normalizeIndianPhone(form.phone)) {
    return 'Enter a valid Indian mobile number (+91 followed by 10 digits starting with 6-9)';
  }

  if (!form.role) return 'Please select a role';
  if (!STAFF_ROLES.includes(form.role)) return 'Please select a valid role';

  if (!STAFF_SHIFTS.some((s) => s.value === form.shift)) return 'Please select a valid shift';

  const hourlyRate = parseFloat(form.hourlyRate);
  if (!form.hourlyRate.trim()) return 'Hourly rate is required';
  if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) return 'Hourly rate must be a positive number';

  return null;
}
