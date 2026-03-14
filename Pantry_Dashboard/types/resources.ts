export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type ResourceTag = {
  id: string;
  label: string;
};

export type ResourceOccurrence = {
  id: string;
  start: string;
  end: string;
  status: 'confirmed' | 'cancelled' | 'unknown';
};

export type ResourceStatus = {
  label: string;
  detail: string;
  isOpen: boolean;
  opensSoon: boolean;
  nextOccurrenceLabel: string | null;
  nextOccurrenceStart: string | null;
  source: 'occurrences' | 'shifts' | 'unavailable';
};

export type Borough =
  | 'manhattan'
  | 'brooklyn'
  | 'queens'
  | 'bronx'
  | 'staten-island'
  | 'unknown';

export type Resource = {
  id: string;
  name: string;
  description: string;
  descriptionEs: string | null;
  address: string;
  streetAddress: string;
  cityStateZip: string;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  borough: Borough | null;
  boroughLabel: string | null;
  coordinates: Coordinates | null;
  timezone: string | null;
  phone: string | null;
  website: string | null;
  resourceTypeId: string | null;
  resourceTypeLabel: string;
  resourceStatus: string | null;
  usageLimitSummary: string | null;
  tags: ResourceTag[];
  images: string[];
  primaryImageUrl: string | null;
  confidence: number | null;
  ratingAverage: number | null;
  reviewCount: number;
  travelDistanceMiles: number | null;
  openByAppointment: boolean;
  scheduleSummary: string;
  weeklySchedule: string[];
  status: ResourceStatus;
  occurrences: ResourceOccurrence[];
};

export type ResourceCollection = {
  count: number;
  cursor: string | null;
  resources: Resource[];
  resolvedLocation: {
    name: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
};

export type BoundsResourceCollection = {
  totalMarkers: number;
  cursor: string | null;
  resources: Resource[];
};

export type ResourceMarker = {
  id: string;
  coordinates: Coordinates;
  resourceTypeId: string | null;
};

export type ResourceListSort =
  | 'alpha-asc'
  | 'open-now'
  | 'open-soon'
  | 'wait-desc'
  | 'rating-desc'
  | 'rating-asc'
  | 'reviews-desc';

export type TimeframeOption = 'all' | '7d' | '30d' | '90d' | '12m';

export type ResourceQueryInput = {
  lat?: number;
  lng?: number;
  location?: string;
  text?: string;
  borough?: Borough;
  resourceTypeId?: string;
  tagId?: string;
  occurrencesWithin?: string;
  region?: string;
  sort?: string;
  take?: number;
  cursor?: string;
};

export type Bounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type ReviewRecord = {
  id: string;
  createdAt: string;
  attended: boolean | null;
  didNotAttendReason: string | null;
  informationAccurate: boolean | null;
  photoPublic: boolean;
  photoUrl: string | null;
  rating: number | null;
  waitTimeMinutes: number | null;
  resourceId: string;
};

export type ReviewSummary = {
  totalReviews: number;
  averageRating: number | null;
  averageWaitMinutes: number | null;
  waitTimeTrend: 'rising' | 'falling' | 'steady' | 'unknown';
  waitBuckets: Array<{
    label: string;
    count: number;
  }>;
  attendedPercentage: number | null;
  didNotReceiveHelpPercentage: number | null;
  didNotAttendReasons: Array<{
    label: string;
    count: number;
  }>;
  inaccuratePercentage: number | null;
};

export type ReviewPayload = {
  reviews: ReviewRecord[];
  summary: ReviewSummary;
};

export type TrendPoint = {
  key: string;
  label: string;
  reviewCount: number;
  averageWaitMinutes: number | null;
  averageRating: number | null;
  helpSuccessRate: number | null;
};

export type StructuredSignal = {
  label: string;
  count: number;
};

export type ResourceAlert = {
  resourceId: string;
  resourceName: string;
  zipCode: string | null;
  unmetDemand: number | null;
  inaccuratePercentage: number | null;
  averageWaitMinutes: number | null;
  disruptionScore: number;
  topSignals: string[];
};

export type DashboardInsights = {
  kpis: {
    averageWaitMinutes: number | null;
    helpSuccessRate: number | null;
    unmetDemand: number | null;
    inaccuratePercentage: number | null;
  };
  timeline: TrendPoint[];
  structuredSignals: StructuredSignal[];
  serviceDisruptions: ResourceAlert[];
};

export type BookmarkedResource = Pick<
  Resource,
  | 'id'
  | 'name'
  | 'address'
  | 'streetAddress'
  | 'cityStateZip'
  | 'zipCode'
  | 'borough'
  | 'boroughLabel'
  | 'coordinates'
  | 'phone'
  | 'website'
  | 'resourceTypeId'
  | 'resourceTypeLabel'
  | 'tags'
  | 'images'
  | 'primaryImageUrl'
  | 'ratingAverage'
  | 'reviewCount'
  | 'travelDistanceMiles'
  | 'scheduleSummary'
  | 'status'
>;

export type DashboardFilterState = {
  location: string;
  searchText: string;
  borough: '' | Borough;
  resourceTypeId: string;
  tagId: string;
  timeframe: TimeframeOption;
  openNowOnly: boolean;
  openSoonOnly: boolean;
  syncListToMap: boolean;
  highestWait: boolean;
  highFailureRate: boolean;
  inaccurateListings: boolean;
  sort: ResourceListSort;
  nearbyRadiusMiles: number;
};
