/**
 * Display helper for picker OTP from admin API (authoritative: Dark Store location + User ID).
 */
export function resolvePickerOtpForRow(row: {
  id: string;
  otp?: string | null;
  currentLocationId?: string | null;
  otpLocationId?: string | null;
}): string | null {
  const otp = row.otp != null ? String(row.otp).trim() : '';
  if (/^\d{6}$/.test(otp)) return otp;
  return null;
}
