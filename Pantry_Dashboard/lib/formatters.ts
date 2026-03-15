import { format, isValid, parseISO } from 'date-fns';

const oneDecimalFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});

export function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

export function formatOneDecimal(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  return oneDecimalFormatter.format(roundToOneDecimal(value));
}

export function compactNumber(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '0';
  }

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatRating(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'No rating yet';
  }

  return value.toFixed(1);
}

export function formatWaitTime(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    return 'Unknown wait';
  }

  const roundedValue = roundToOneDecimal(value);

  if (roundedValue < 60) {
    return `${formatOneDecimal(roundedValue)} min`;
  }

  const hours = Math.floor(roundedValue / 60);
  const minutes = roundToOneDecimal(roundedValue % 60);

  return minutes ? `${hours}h ${formatOneDecimal(minutes)}m` : `${hours}h`;
}

export function formatDistanceMiles(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  return value < 1 ? `${Math.round(value * 5280)} ft` : `${value.toFixed(1)} mi`;
}

export function formatPercentage(value: number | null | undefined, digits = 1) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Unavailable';
  }

  return `${value.toFixed(digits)}%`;
}

export function formatPhoneNumber(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, '');
  if (digits.length !== 10) {
    return value;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function formatDateTime(isoString: string | null | undefined, timeZone?: string | null) {
  if (!isoString) {
    return null;
  }

  const parsed = parseISO(isoString);
  if (!isValid(parsed)) {
    return null;
  }

  if (!timeZone) {
    return format(parsed, 'EEE, MMM d • h:mm a');
  }

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(parsed);
}

export function titleCase(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  return value
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
