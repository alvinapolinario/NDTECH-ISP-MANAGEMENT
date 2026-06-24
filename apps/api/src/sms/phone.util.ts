export function normalizePhilippineMobileNumber(value: string) {
  const digits = value.replace(/\D/g, '');

  if (digits.startsWith('63') && digits.length === 12) {
    return digits;
  }

  if (digits.startsWith('0') && digits.length === 11) {
    return `63${digits.slice(1)}`;
  }

  if (digits.length === 10 && digits.startsWith('9')) {
    return `63${digits}`;
  }

  return digits;
}

export function isValidPhilippineMobileNumber(value: string) {
  return /^639\d{9}$/.test(normalizePhilippineMobileNumber(value));
}
