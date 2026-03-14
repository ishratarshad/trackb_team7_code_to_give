import type { Borough, Resource } from '@/types/resources';

type BoroughOption = {
  id: Borough | '';
  label: string;
};

const BOROUGH_LABELS: Record<Borough, string> = {
  manhattan: 'Manhattan',
  brooklyn: 'Brooklyn',
  queens: 'Queens',
  bronx: 'Bronx',
  'staten-island': 'Staten Island',
  unknown: 'Unknown / Other',
};

const CITY_TO_BOROUGH: Record<string, Borough> = {
  brooklyn: 'brooklyn',
  queens: 'queens',
  bronx: 'bronx',
  'the bronx': 'bronx',
  'staten island': 'staten-island',
  manhattan: 'manhattan',
};

const KEYWORD_TO_BOROUGH: Array<[string, Borough]> = [
  ['staten island', 'staten-island'],
  ['manhattan', 'manhattan'],
  ['brooklyn', 'brooklyn'],
  ['queens', 'queens'],
  ['bronx', 'bronx'],
];

export const BOROUGH_FILTER_OPTIONS: BoroughOption[] = [
  { id: '', label: 'All boroughs' },
  { id: 'manhattan', label: 'Manhattan' },
  { id: 'brooklyn', label: 'Brooklyn' },
  { id: 'queens', label: 'Queens' },
  { id: 'bronx', label: 'Bronx' },
  { id: 'staten-island', label: 'Staten Island' },
  { id: 'unknown', label: 'Unknown / Other' },
];

function normalizeValue(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
}

function readZipCode(value: string | null | undefined) {
  const digits = value?.match(/\d{5}/)?.[0] ?? null;
  return digits ? Number(digits) : null;
}

function boroughFromZip(zipCode: string | null | undefined) {
  const zip = readZipCode(zipCode);

  if (!zip) {
    return null;
  }

  if (zip >= 10001 && zip <= 10282) {
    return 'manhattan' satisfies Borough;
  }

  if (zip >= 10301 && zip <= 10314) {
    return 'staten-island' satisfies Borough;
  }

  if (zip >= 10451 && zip <= 10475) {
    return 'bronx' satisfies Borough;
  }

  if ((zip >= 11101 && zip <= 11109) || (zip >= 11351 && zip <= 11697) || zip === 11004 || zip === 11005) {
    return 'queens' satisfies Borough;
  }

  if (zip >= 11201 && zip <= 11239) {
    return 'brooklyn' satisfies Borough;
  }

  return null;
}

export function getBoroughLabel(borough: Borough | '' | null | undefined) {
  if (!borough) {
    return 'All boroughs';
  }

  return BOROUGH_LABELS[borough];
}

export function deriveBorough({
  city,
  state,
  zipCode,
  address,
  streetAddress,
}: {
  city: string | null | undefined;
  state: string | null | undefined;
  zipCode: string | null | undefined;
  address: string | null | undefined;
  streetAddress: string | null | undefined;
}) {
  const normalizedCity = normalizeValue(city);
  const normalizedState = normalizeValue(state);
  const normalizedAddress = normalizeValue([streetAddress, address].filter(Boolean).join(' '));

  if (normalizedState && normalizedState !== 'ny' && normalizedState !== 'new york') {
    return null;
  }

  const zipMatch = boroughFromZip(zipCode);

  if (zipMatch) {
    return zipMatch;
  }

  if (CITY_TO_BOROUGH[normalizedCity]) {
    return CITY_TO_BOROUGH[normalizedCity];
  }

  if (normalizedCity === 'new york' || normalizedCity === 'new york city' || normalizedCity === 'nyc') {
    if (normalizedAddress.includes('manhattan')) {
      return 'manhattan';
    }
  }

  for (const [keyword, borough] of KEYWORD_TO_BOROUGH) {
    if (normalizedAddress.includes(keyword)) {
      return borough;
    }
  }

  return null;
}

export function matchesBorough(resource: Pick<Resource, 'borough'>, borough: Borough | '' | null | undefined) {
  if (!borough) {
    return true;
  }

  const normalizedBorough = resource.borough ?? 'unknown';
  return normalizedBorough === borough;
}
