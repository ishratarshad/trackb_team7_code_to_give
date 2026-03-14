import { format } from 'date-fns';

import type {
  RawImage,
  RawLocalizedValue,
  RawMarkerFeatureCollection,
  RawOccurrence,
  RawResource,
  RawResourceCollection,
  RawShift,
  RawTag,
} from '@/types/api';
import type { Resource, ResourceCollection, ResourceMarker, ResourceOccurrence } from '@/types/resources';

function getLocalizedText(value: RawLocalizedValue, fallback = 'Unknown') {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (value && typeof value === 'object') {
    return value.en ?? value.es ?? Object.values(value)[0] ?? fallback;
  }

  return fallback;
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function buildAddress(raw: RawResource) {
  const streetAddress = [raw.addressStreet1, raw.addressStreet2].filter(Boolean).join(', ');
  const cityStateZip = [raw.city, raw.state, raw.zipCode].filter(Boolean).join(', ').replace(', ,', ',');
  const address = [streetAddress, cityStateZip].filter(Boolean).join(' • ');

  return {
    streetAddress: streetAddress || 'Address unavailable',
    cityStateZip: cityStateZip || 'City unavailable',
    address: address || 'Address unavailable',
  };
}

function getPhone(raw: RawResource) {
  return (
    raw.contacts
      ?.map((contact) => contact.phone ?? contact.phoneNumber ?? contact.value)
      .find((value) => typeof value === 'string' && value.trim()) ?? null
  );
}

function normalizeImage(image: RawImage) {
  return image.url ?? image.imageUrl ?? image.src ?? image.file?.url ?? null;
}

function normalizeTags(tags: RawTag[] | null | undefined) {
  return (tags ?? [])
    .map((tag) => ({
      id: String(tag.id ?? getLocalizedText(tag.name ?? tag.label, 'tag')),
      label: getLocalizedText(tag.name ?? tag.label, 'Unlabeled'),
    }))
    .filter((tag, index, array) => array.findIndex((item) => item.id === tag.id) === index);
}

function normalizeOccurrence(occurrence: RawOccurrence): ResourceOccurrence | null {
  const start =
    occurrence.start ??
    occurrence.startAt ??
    occurrence.startsAt ??
    null;
  const end =
    occurrence.end ??
    occurrence.endAt ??
    occurrence.endsAt ??
    null;

  if (!start || !end) {
    return null;
  }

  return {
    id: String(occurrence.id ?? start),
    start,
    end,
    status:
      occurrence.confirmed === false || occurrence.status === 'cancelled'
        ? 'cancelled'
        : occurrence.confirmed === true || occurrence.status === 'confirmed'
          ? 'confirmed'
          : 'unknown',
  };
}

function shiftToSummary(shift: RawShift) {
  const dayLabel =
    typeof shift.dayOfWeek === 'number'
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][shift.dayOfWeek]
      : shift.weekday ?? (typeof shift.dayOfWeek === 'string' ? shift.dayOfWeek : 'Day');
  const opensAt = shift.opensAt ?? shift.startTime ?? 'Unknown';
  const closesAt = shift.closesAt ?? shift.endTime ?? 'Unknown';
  return `${dayLabel}: ${opensAt} - ${closesAt}`;
}

function getTravelDistanceMiles(raw: RawResource) {
  const rawDistance = raw.travelSummary?.distance;

  if (typeof rawDistance !== 'number' || Number.isNaN(rawDistance)) {
    return null;
  }

  return rawDistance > 300 ? rawDistance / 1609.34 : rawDistance;
}

function getUsageLimitSummary(raw: RawResource) {
  if (!raw.usageLimitCount || !raw.usageLimitIntervalCount || !raw.usageLimitIntervalUnit) {
    return null;
  }

  const calendarReset = raw.usageLimitCalendarReset ? 'calendar' : 'rolling';
  return `${raw.usageLimitCount} visit${raw.usageLimitCount > 1 ? 's' : ''} every ${raw.usageLimitIntervalCount} ${raw.usageLimitIntervalUnit} (${calendarReset})`;
}

function getStatus(occurrences: ResourceOccurrence[], shifts: RawShift[] | null | undefined) {
  const now = new Date();
  const openSoonThresholdMs = 1000 * 60 * 60 * 24;
  const upcoming = occurrences
    .filter((occurrence) => occurrence.status !== 'cancelled')
    .sort((left, right) => (left.start < right.start ? -1 : 1));
  const openOccurrence = upcoming.find((occurrence) => {
    const start = new Date(occurrence.start);
    const end = new Date(occurrence.end);
    return now >= start && now <= end;
  });
  const nextOccurrence = upcoming.find((occurrence) => new Date(occurrence.start) > now);

  if (openOccurrence) {
    return {
      label: 'Open now',
      detail: `Closes ${format(new Date(openOccurrence.end), 'h:mm a')}`,
      isOpen: true,
      opensSoon: false,
      nextOccurrenceLabel: nextOccurrence
        ? format(new Date(nextOccurrence.start), 'EEE, MMM d • h:mm a')
        : null,
      nextOccurrenceStart: nextOccurrence?.start ?? null,
      source: 'occurrences' as const,
    };
  }

  if (nextOccurrence) {
    const nextStart = new Date(nextOccurrence.start);
    const opensSoon = nextStart.getTime() - now.getTime() <= openSoonThresholdMs;

    return {
      label: opensSoon ? 'Opens soon' : 'Closed',
      detail: `Next opens ${format(nextStart, 'EEE, MMM d • h:mm a')}`,
      isOpen: false,
      opensSoon,
      nextOccurrenceLabel: format(nextStart, 'EEE, MMM d • h:mm a'),
      nextOccurrenceStart: nextOccurrence.start,
      source: 'occurrences' as const,
    };
  }

  if (shifts?.length) {
    return {
      label: 'Schedule available',
      detail: shiftToSummary(shifts[0]),
      isOpen: false,
      opensSoon: false,
      nextOccurrenceLabel: null,
      nextOccurrenceStart: null,
      source: 'shifts' as const,
    };
  }

  return {
    label: 'Schedule unavailable',
    detail: 'Unknown hours',
    isOpen: false,
    opensSoon: false,
    nextOccurrenceLabel: null,
    nextOccurrenceStart: null,
    source: 'unavailable' as const,
  };
}

export function normalizeResource(raw: RawResource): Resource {
  const coordinates =
    toNumber(raw.latitude) !== null && toNumber(raw.longitude) !== null
      ? {
          latitude: toNumber(raw.latitude) as number,
          longitude: toNumber(raw.longitude) as number,
        }
      : null;
  const images = (raw.images ?? [])
    .map((image) => normalizeImage(image))
    .filter((image): image is string => Boolean(image));
  const occurrences = (raw.occurrences ?? [])
    .map(normalizeOccurrence)
    .filter((occurrence): occurrence is ResourceOccurrence => Boolean(occurrence))
    .sort((left, right) => (left.start < right.start ? -1 : 1));
  const address = buildAddress(raw);
  const shifts = raw.shifts ?? [];
  const status = getStatus(occurrences, shifts);

  return {
    id: String(raw.id ?? ''),
    name: raw.name?.trim() || 'Unnamed resource',
    description: raw.description?.trim() || 'No description available.',
    descriptionEs: raw.description_es?.trim() || null,
    address: address.address,
    streetAddress: address.streetAddress,
    cityStateZip: address.cityStateZip,
    city: raw.city ?? null,
    state: raw.state ?? null,
    zipCode: raw.zipCode ?? null,
    coordinates,
    timezone: raw.timezone ?? null,
    phone: getPhone(raw),
    website: raw.website ?? null,
    resourceTypeId: raw.resourceType?.id ? String(raw.resourceType.id) : null,
    resourceTypeLabel: getLocalizedText(
      raw.resourceType?.name ?? raw.resourceType?.label ?? raw.resourceType?.name_en,
      'Food resource',
    ),
    resourceStatus: raw.resourceStatus ?? null,
    usageLimitSummary: getUsageLimitSummary(raw),
    tags: normalizeTags(raw.tags),
    images,
    primaryImageUrl: images[0] ?? null,
    confidence: typeof raw.confidence === 'number' ? raw.confidence : null,
    ratingAverage: typeof raw.ratingAverage === 'number' ? raw.ratingAverage : null,
    reviewCount: raw.count?.reviews ?? raw.counts?.reviews ?? 0,
    travelDistanceMiles: getTravelDistanceMiles(raw),
    openByAppointment: Boolean(raw.openByAppointment),
    scheduleSummary: status.nextOccurrenceLabel ?? status.detail,
    weeklySchedule: occurrences.length
      ? occurrences.slice(0, 5).map((occurrence) => {
          const start = new Date(occurrence.start);
          const end = new Date(occurrence.end);
          return `${format(start, 'EEEE')}: ${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
        })
      : shifts.map(shiftToSummary),
    status,
    occurrences,
  };
}

export function normalizeResourceCollection(raw: RawResourceCollection): ResourceCollection {
  return {
    count: raw.count ?? 0,
    cursor: raw.cursor ?? null,
    resources: (raw.resources ?? []).map(normalizeResource),
    resolvedLocation: raw.location
      ? {
          name: raw.location.name ?? 'Resolved location',
          latitude: raw.location.latitude ?? null,
          longitude: raw.location.longitude ?? null,
        }
      : null,
  };
}

export function normalizeMarkers(raw: RawMarkerFeatureCollection): ResourceMarker[] {
  return raw.features
    .map((feature) => {
      const [longitude, latitude] = feature.geometry.coordinates;
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return null;
      }

      return {
        id: String(feature.properties?.id ?? ''),
        coordinates: {
          latitude,
          longitude,
        },
        resourceTypeId: feature.properties?.resourceTypeId
          ? String(feature.properties.resourceTypeId)
          : null,
      };
    })
    .filter((marker): marker is ResourceMarker => Boolean(marker && marker.id));
}
