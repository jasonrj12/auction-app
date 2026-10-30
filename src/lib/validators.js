/** Validate a phone number — must have 7 to 15 digits */
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return 'Mobile number is required.';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return 'Enter a valid mobile number (e.g. +94 77 123 4567).';
  }
  return null;
}

/** Validate a date of birth (YYYY-MM-DD) — not in the future, not older than 120 years */
export function validateDob(dob) {
  if (!dob) return 'Date of birth is required.';
  const date = new Date(dob);
  if (isNaN(date.getTime())) return 'Please enter a valid date.';
  
  const now = new Date();
  if (date > now) return 'Date of birth cannot be in the future.';
  
  const oldest = new Date();
  oldest.setFullYear(oldest.getFullYear() - 120);
  if (date < oldest) return 'Please enter a valid date of birth (within 120 years).';
  
  return null;
}
