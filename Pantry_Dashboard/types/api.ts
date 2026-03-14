export type RawLocalizedValue = string | Record<string, string> | null | undefined;

export type RawContact = {
  type?: string | null;
  value?: string | null;
  phone?: string | null;
  phoneNumber?: string | null;
  name?: string | null;
};

export type RawImage = {
  url?: string | null;
  imageUrl?: string | null;
  src?: string | null;
  alt?: string | null;
  description?: string | null;
  file?: {
    url?: string | null;
  } | null;
};

export type RawTag = {
  id?: string | number | null;
  name?: RawLocalizedValue;
  label?: RawLocalizedValue;
};

export type RawOccurrence = {
  id?: string | number | null;
  start?: string | null;
  end?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  status?: string | null;
  confirmed?: boolean | null;
};

export type RawShift = {
  id?: string | number | null;
  dayOfWeek?: number | string | null;
  weekday?: string | null;
  opensAt?: string | null;
  closesAt?: string | null;
  startTime?: string | null;
  endTime?: string | null;
};

export type RawCountSummary = {
  reviews?: number | null;
  resourceSubscriptions?: number | null;
};

export type RawTravelSummary = {
  distance?: number | null;
};

export type RawResourceType = {
  id?: string | number | null;
  name?: RawLocalizedValue;
  name_en?: string | null;
  label?: RawLocalizedValue;
};

export type RawResource = {
  id?: string | number | null;
  name?: string | null;
  description?: string | null;
  description_es?: string | null;
  addressStreet1?: string | null;
  addressStreet2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  timezone?: string | null;
  website?: string | null;
  openByAppointment?: boolean | null;
  resourceStatus?: string | null;
  usageLimitCount?: number | null;
  usageLimitIntervalCount?: number | null;
  usageLimitIntervalUnit?: string | null;
  usageLimitCalendarReset?: boolean | null;
  contacts?: RawContact[] | null;
  images?: RawImage[] | null;
  shifts?: RawShift[] | null;
  occurrences?: RawOccurrence[] | null;
  occurrenceSkipRanges?: RawOccurrence[] | null;
  tags?: RawTag[] | null;
  travelSummary?: RawTravelSummary | null;
  confidence?: number | null;
  ratingAverage?: number | null;
  resourceType?: RawResourceType | null;
  count?: RawCountSummary | null;
  counts?: RawCountSummary | null;
};

export type RawResourceCollection = {
  count?: number | null;
  cursor?: string | null;
  resources?: RawResource[] | null;
  location?: {
    name?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
};

export type RawMarkerFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  {
    id?: string | number | null;
    resourceTypeId?: string | number | null;
  }
>;
