/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone format (Russian)
 */
export const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || cleaned.length === 11;
};

/**
 * Check if string is not empty
 */
export const isNotEmpty = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * Check if value is within range
 */
export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

/**
 * Check if date string is valid
 */
export const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

export const MIN_FORM_DATE = '2000-01-01';
export const MIN_FORM_DATE_LABEL = '01.01.2000';

const isValidDateInputValue = (dateString: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;

  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

export const getDateMinYearError = (dateString: string | undefined, label: string): string | undefined => {
  if (!dateString) return undefined;

  if (!isValidDateInputValue(dateString)) {
    return `${label}: некорректная дата`;
  }

  if (dateString < MIN_FORM_DATE) {
    return `${label} должна быть не раньше ${MIN_FORM_DATE_LABEL}`;
  }

  return undefined;
};

export const getRequiredDateError = (dateString: string | undefined, label: string): string | undefined => {
  if (!dateString) {
    return `${label} обязательна`;
  }

  return undefined;
};

export const getDateRangeError = (
  startDate: string | undefined,
  endDate: string | undefined,
  endLabel = 'Дата окончания'
): string | undefined => {
  if (!startDate || !endDate) return undefined;
  if (!isValidDateInputValue(startDate) || !isValidDateInputValue(endDate)) return undefined;

  if (endDate < startDate) {
    return `${endLabel} не может быть раньше даты начала`;
  }

  return undefined;
};

/**
 * Check if date is in the past
 */
export const isDateInPast = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

/**
 * Check if date is in the future
 */
export const isDateInFuture = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
};
