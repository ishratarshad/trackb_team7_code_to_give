'use client';

import 'mapbox-gl/dist/mapbox-gl.css';

import type { FeatureCollection, Point, Polygon } from 'geojson';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TrendingDown, CreditCard, ChevronDown } from 'lucide-react';
import Map, {
  Layer,
  NavigationControl,
  Popup,
  Source,
  type MapMouseEvent,
  type MapRef,
} from 'react-map-gl/mapbox';

import { MarkerPopupCard } from '@/components/resources/marker-popup-card';
import { useResource, useReviewSummary } from '@/hooks/use-resources';
import { distanceInMiles } from '@/lib/geo';
import { hasMapboxToken, mapboxAccessToken } from '@/lib/mapbox';
import { isHighPovertyArea, isHighSnapArea } from '@/lib/demographics';
import type { Bounds, Coordinates, Resource, ResourceMarker } from '@/types/resources';

type PopupMarker = {
  id: string;
  latitude: number;
  longitude: number;
};

type MapViewportState = {
  bounds: Bounds;
  center: Coordinates;
};

const EMPTY_POINT_COLLECTION: FeatureCollection<Point> = {
  type: 'FeatureCollection',
  features: [],
};

const EMPTY_POLYGON_COLLECTION: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: [],
};

const BRAND_PURPLE = '#704DBD';
const BRAND_PURPLE_DARK = '#5B458F';
const BRAND_YELLOW = '#FFCC10';
const BRAND_YELLOW_LIGHT = '#FFE58A';
const BRAND_SURFACE = '#FFFDF4';

function createMarkerCollection(markers: ResourceMarker[]): FeatureCollection<Point> {
  if (!markers.length) {
    return EMPTY_POINT_COLLECTION;
  }

  return {
    type: 'FeatureCollection',
    features: markers.map((marker) => ({
      type: 'Feature',
      id: marker.id,
      geometry: {
        type: 'Point',
        coordinates: [marker.coordinates.longitude, marker.coordinates.latitude],
      },
      properties: {
        id: marker.id,
        resourceTypeId: marker.resourceTypeId,
      },
    })),
  };
}

function createCircle(center: Coordinates, radiusMiles: number): FeatureCollection<Polygon> {
  if (radiusMiles <= 0) {
    return EMPTY_POLYGON_COLLECTION;
  }

  const steps = 60;
  const points: [number, number][] = [];
  const latitudeRadians = (center.latitude * Math.PI) / 180;
  const milesPerDegreeLatitude = 69;
  const milesPerDegreeLongitude = Math.max(Math.cos(latitudeRadians) * 69, 0.01);

  for (let step = 0; step <= steps; step += 1) {
    const angle = (step / steps) * Math.PI * 2;
    points.push([
      center.longitude + (Math.cos(angle) * radiusMiles) / milesPerDegreeLongitude,
      center.latitude + (Math.sin(angle) * radiusMiles) / milesPerDegreeLatitude,
    ]);
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [points],
        },
        properties: {},
      },
    ],
  };
}

const clusterLayer: any = {
  id: 'clusters',
  type: 'circle',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': BRAND_PURPLE_DARK,
    'circle-radius': ['step', ['get', 'point_count'], 18, 12, 22, 28, 28],
    'circle-opacity': 0.84,
  },
};

const clusterCountLayer: any = {
  id: 'cluster-count',
  type: 'symbol',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': ['get', 'point_count_abbreviated'],
    'text-size': 12,
  },
  paint: {
    'text-color': '#ffffff',
  },
};

const pointLayer: any = {
  id: 'unclustered-point',
  type: 'circle',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': BRAND_YELLOW,
    'circle-radius': 7,
    'circle-stroke-width': 2,
    'circle-stroke-color': BRAND_SURFACE,
  },
};

const listedHaloLayer: any = {
  id: 'listed-halo-point',
  type: 'circle',
  minzoom: 10.5,
  paint: {
    'circle-color': BRAND_YELLOW_LIGHT,
    'circle-radius': 12,
    'circle-opacity': 0.38,
    'circle-stroke-width': 2,
    'circle-stroke-color': BRAND_PURPLE,
    'circle-stroke-opacity': 0.68,
  },
};

const nearbyLayer: any = {
  id: 'nearby-point',
  type: 'circle',
  paint: {
    'circle-color': BRAND_YELLOW,
    'circle-radius': 9,
    'circle-stroke-width': 3,
    'circle-stroke-color': BRAND_PURPLE,
  },
};

const selectedLayer: any = {
  id: 'selected-point',
  type: 'circle',
  paint: {
    'circle-color': BRAND_PURPLE,
    'circle-radius': 11,
    'circle-stroke-width': 4,
    'circle-stroke-color': BRAND_YELLOW_LIGHT,
  },
};

const radiusFillLayer: any = {
  id: 'radius-fill',
  type: 'fill',
  paint: {
    'fill-color': BRAND_YELLOW,
    'fill-opacity': 0.1,
  },
};

const radiusLineLayer: any = {
  id: 'radius-outline',
  type: 'line',
  paint: {
    'line-color': BRAND_PURPLE,
    'line-width': 2,
    'line-dasharray': [2, 2],
  },
};

function normalizeMapError(errorEvent: unknown) {
  if (errorEvent instanceof Error) {
    return errorEvent.message;
  }

  if (
    errorEvent &&
    typeof errorEvent === 'object' &&
    'error' in errorEvent &&
    errorEvent.error instanceof Error
  ) {
    return errorEvent.error.message;
  }

  if (
    errorEvent &&
    typeof errorEvent === 'object' &&
    'type' in errorEvent &&
    typeof errorEvent.type === 'string'
  ) {
    return `Map interaction error: ${errorEvent.type}`;
  }

  return 'Map interaction error';
}

export function ResourceMap({
  markers,
  listedResources,
  selectedResourceId,
  selectedCoordinates,
  nearbyRadiusMiles,
  focusViewport,
  onViewportChange,
  onOpenResource,
}: {
  markers: ResourceMarker[];
  listedResources: Resource[];
  selectedResourceId: string | null;
  selectedCoordinates: Coordinates | null;
  nearbyRadiusMiles: number;
  focusViewport?: { center: Coordinates; zoom: number } | null;
  onViewportChange: (viewport: MapViewportState) => void;
  onOpenResource: (resourceId: string) => void;
}) {
  const mapRef = useRef<MapRef | null>(null);
  const syncFrameRef = useRef<number | null>(null);
  const lastFocusKeyRef = useRef('');
  const lastViewportKeyRef = useRef('');
  const [activePopupMarker, setActivePopupMarker] = useState<PopupMarker | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showOverlayMenu, setShowOverlayMenu] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<'none' | 'poverty' | 'snap' | 'food-desert'>('none');
  const popupMarker =
    selectedResourceId && selectedCoordinates
      ? {
          id: selectedResourceId,
          latitude: selectedCoordinates.latitude,
          longitude: selectedCoordinates.longitude,
        }
      : activePopupMarker;
  const popupResourceId = popupMarker?.id ?? null;
  const popupResourceQuery = useResource(popupResourceId);
  const popupReviewQuery = useReviewSummary(popupResourceId);

  const markerCollection = useMemo(() => createMarkerCollection(markers), [markers]);
  const listedCollection = useMemo(
    () =>
      createMarkerCollection(
        listedResources
          .filter((resource) => resource.coordinates)
          .map((resource) => ({
            id: resource.id,
            coordinates: resource.coordinates as Coordinates,
            resourceTypeId: resource.resourceTypeId,
          })),
      ),
    [listedResources],
  );
  const nearbyMarkers = useMemo(() => {
    if (!selectedCoordinates) {
      return [];
    }

    return markers.filter(
      (marker) =>
        marker.id !== selectedResourceId &&
        distanceInMiles(selectedCoordinates, marker.coordinates) <= nearbyRadiusMiles,
    );
  }, [markers, nearbyRadiusMiles, selectedCoordinates, selectedResourceId]);
  const nearbyCollection = useMemo(() => createMarkerCollection(nearbyMarkers), [nearbyMarkers]);
  const selectedCollection = useMemo(
    () =>
      selectedCoordinates && selectedResourceId
        ? createMarkerCollection([
            {
              id: selectedResourceId,
              coordinates: selectedCoordinates,
              resourceTypeId: null,
            },
          ])
        : EMPTY_POINT_COLLECTION,
    [selectedCoordinates, selectedResourceId],
  );
  const circleCollection = useMemo(
    () =>
      selectedCoordinates
        ? createCircle(selectedCoordinates, nearbyRadiusMiles)
        : EMPTY_POLYGON_COLLECTION,
    [nearbyRadiusMiles, selectedCoordinates],
  );

  // Overlay collections based on demographics - uses ALL markers, not just listed resources
  const overlayCollection = useMemo(() => {
    if (activeOverlay === 'none') return EMPTY_POINT_COLLECTION;

    const filteredMarkers = markers.filter((marker) => {
      const coords = { latitude: marker.coordinates.latitude, longitude: marker.coordinates.longitude };

      switch (activeOverlay) {
        case 'poverty':
          return isHighPovertyArea(null, coords);
        case 'snap':
          return isHighSnapArea(null, coords);
        default:
          return false;
      }
    });

    return createMarkerCollection(filteredMarkers);
  }, [markers, activeOverlay]);

  const syncViewportState = useCallback(() => {
    const map = mapRef.current?.getMap();

    if (!map) {
      return;
    }

    const bounds = map.getBounds();
    const center = map.getCenter();

    if (!bounds || !center) {
      return;
    }

    const nextViewport = {
      bounds: {
        west: Number(bounds.getWest().toFixed(5)),
        south: Number(bounds.getSouth().toFixed(5)),
        east: Number(bounds.getEast().toFixed(5)),
        north: Number(bounds.getNorth().toFixed(5)),
      },
      center: {
        latitude: Number(center.lat.toFixed(5)),
        longitude: Number(center.lng.toFixed(5)),
      },
    };
    const nextKey = JSON.stringify(nextViewport);

    if (nextKey === lastViewportKeyRef.current) {
      return;
    }

    lastViewportKeyRef.current = nextKey;
    setMapError(null);
    onViewportChange(nextViewport);
  }, [onViewportChange]);

  const scheduleViewportSync = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (syncFrameRef.current) {
      window.cancelAnimationFrame(syncFrameRef.current);
    }

    syncFrameRef.current = window.requestAnimationFrame(() => {
      syncViewportState();
      syncFrameRef.current = null;
    });
  }, [syncViewportState]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && syncFrameRef.current) {
        window.cancelAnimationFrame(syncFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current?.getMap();

    if (!map || !focusViewport) {
      return;
    }

    const nextKey = JSON.stringify(focusViewport);

    if (nextKey === lastFocusKeyRef.current) {
      return;
    }

    lastFocusKeyRef.current = nextKey;
    map.easeTo({
      center: {
        lat: focusViewport.center.latitude,
        lng: focusViewport.center.longitude,
      },
      zoom: focusViewport.zoom,
      duration: 600,
    });
  }, [focusViewport]);

  const updateCursor = useCallback((event: MapMouseEvent) => {
    const canvas = mapRef.current?.getCanvas();
    if (!canvas) {
      return;
    }

    const interactiveEvent = event as MapMouseEvent & {
      features?: Array<{ properties?: Record<string, unknown> }>;
    };
    const feature = interactiveEvent.features?.[0];
    canvas.style.cursor = feature ? 'pointer' : '';
  }, []);

  if (!hasMapboxToken()) {
    return (
      <div className="flex h-full min-h-[400px] flex-col justify-between rounded-[24px] border border-dashed border-line/80 bg-white/70 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">Map setup</p>
          <h3 className="mt-2 text-3xl text-ink">Mapbox token missing</h3>
          <p className="mt-3 max-w-lg text-sm leading-6 text-slate">
            Add <code>NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> to enable the interactive map. The
            list, details, and bookmarks still work.
          </p>
        </div>
        <div className="rounded-[24px] bg-mist/70 p-4 text-sm text-slate">
          {markers.length} marker{markers.length === 1 ? '' : 's'} prepared for the current map
          viewport.
        </div>
      </div>
    );
  }

  const overlayOptions = [
    { id: 'none' as const, label: 'No Overlay', icon: null, color: '' },
    { id: 'poverty' as const, label: 'High Poverty (>20%)', icon: TrendingDown, color: 'text-[#b68900]' },
    { id: 'snap' as const, label: 'High SNAP (>20%)', icon: CreditCard, color: 'text-pine' },
  ];

  const activeOption = overlayOptions.find((option) => option.id === activeOverlay) ?? overlayOptions[0];

  return (
    <div className="relative h-full min-h-[520px] overflow-hidden rounded-[24px]">
      {/* Overlay Dropdown Menu */}
      <div className="absolute top-3 right-3" style={{ zIndex: 1000 }}>
        <button
          type="button"
          onClick={() => setShowOverlayMenu(!showOverlayMenu)}
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.72rem] font-semibold shadow-lg transition ${
            activeOverlay !== 'none'
              ? 'bg-pine text-white'
              : 'border border-line/80 bg-white/95 text-slate hover:border-pine/20 hover:text-pine'
          }`}
        >
          {activeOption.icon ? (
            <activeOption.icon
              className={`h-3.5 w-3.5 ${activeOverlay !== 'none' ? 'text-white' : activeOption.color}`}
            />
          ) : null}
          {activeOverlay === 'none' ? 'Overlays' : activeOption.label}
          <ChevronDown className={`h-3 w-3 transition-transform ${showOverlayMenu ? 'rotate-180' : ''}`} />
        </button>

        {showOverlayMenu && (
          <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-line/80 bg-white/95 shadow-xl">
            {overlayOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setActiveOverlay(option.id);
                  setShowOverlayMenu(false);
                }}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold transition hover:bg-mist/45 ${
                  activeOverlay === option.id ? 'bg-mist/60 text-ink' : 'text-slate'
                }`}
              >
                {option.icon ? (
                  <option.icon className={`h-4 w-4 ${option.color}`} />
                ) : (
                  <span className="w-4" />
                )}
                {option.label}
                {activeOverlay === option.id && (
                  <span className="ml-auto text-[#b68900]">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Overlay Legend */}
      {activeOverlay !== 'none' && (
        <div
          className="absolute bottom-3 right-3 rounded-xl border border-line/80 bg-white/95 px-3 py-2 shadow-lg"
          style={{ zIndex: 1000 }}
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span
              className={`w-4 h-4 rounded-full opacity-60 ${
                activeOverlay === 'poverty' ? 'bg-amber' : 'bg-pine'
              }`}
            />
            <span className="text-slate">
              {activeOverlay === 'poverty' && 'High poverty areas (>20%)'}
              {activeOverlay === 'snap' && 'High SNAP enrollment (>20%)'}
            </span>
            <span className="text-ink font-bold">({overlayCollection.features.length})</span>
          </div>
        </div>
      )}

      <Map
        ref={mapRef}
        mapboxAccessToken={mapboxAccessToken}
        reuseMaps
        initialViewState={{
          longitude: focusViewport?.center.longitude ?? -74.006,
          latitude: focusViewport?.center.latitude ?? 40.7128,
          zoom: focusViewport?.zoom ?? 10.5,
        }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        interactiveLayerIds={['clusters', 'unclustered-point', 'listed-halo-point']}
        onLoad={scheduleViewportSync}
        onMoveEnd={scheduleViewportSync}
        onMouseMove={updateCursor}
        onMouseLeave={() => {
          const canvas = mapRef.current?.getCanvas();
          if (canvas) {
            canvas.style.cursor = '';
          }
        }}
        onError={(event) => {
          const message = normalizeMapError(event);
          setMapError((current) => (current === message ? current : message));
          console.error('Mapbox interaction error', event);
        }}
        onClick={(event) => {
          const feature = event.features?.[0];

          if (!feature) {
            setActivePopupMarker(null);
            return;
          }

          const coordinates =
            feature.geometry.type === 'Point' ? feature.geometry.coordinates : null;

          if (feature.properties?.point_count && coordinates) {
            mapRef.current?.easeTo({
              center: {
                lng: coordinates[0],
                lat: coordinates[1],
              },
              zoom: Math.min((mapRef.current?.getZoom() ?? 10) + 2, 16),
              duration: 500,
            });
            return;
          }

          const resourceId = feature.properties?.id;

          if (!resourceId || !coordinates) {
            return;
          }

          setActivePopupMarker({
            id: String(resourceId),
            longitude: coordinates[0],
            latitude: coordinates[1],
          });
        }}
      >
        <NavigationControl position="top-left" />

        <Source
          id="resource-points"
          type="geojson"
          data={markerCollection}
          cluster
          clusterRadius={42}
        >
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          <Layer {...pointLayer} />
        </Source>

        {listedResources.length ? (
          <Source id="listed-points" type="geojson" data={listedCollection}>
            <Layer {...listedHaloLayer} />
          </Source>
        ) : null}

        {selectedCoordinates ? (
          <Source id="radius" type="geojson" data={circleCollection}>
            <Layer {...radiusFillLayer} />
            <Layer {...radiusLineLayer} />
          </Source>
        ) : null}

        {nearbyMarkers.length ? (
          <Source id="nearby-points" type="geojson" data={nearbyCollection}>
            <Layer {...nearbyLayer} />
          </Source>
        ) : null}

        {selectedCoordinates ? (
          <Source id="selected-point-source" type="geojson" data={selectedCollection}>
            <Layer {...selectedLayer} />
          </Source>
        ) : null}

        {/* Demographics Overlays - key forces complete re-mount when overlay changes */}
        {activeOverlay !== 'none' && overlayCollection.features.length > 0 && (
          <Source
            key={`overlay-${activeOverlay}`}
            id={`overlay-${activeOverlay}`}
            type="geojson"
            data={overlayCollection}
          >
            <Layer
              id={`layer-${activeOverlay}`}
              type="circle"
              paint={activeOverlay === 'poverty' ? {
                'circle-color': BRAND_YELLOW,
                'circle-radius': 22,
                'circle-opacity': 0.25,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#c69c00',
                'circle-stroke-opacity': 0.7,
              } : {
                'circle-color': BRAND_PURPLE,
                'circle-radius': 22,
                'circle-opacity': 0.3,
                'circle-stroke-width': 2,
                'circle-stroke-color': BRAND_PURPLE_DARK,
                'circle-stroke-opacity': 0.8,
              }}
            />
          </Source>
        )}

        {popupMarker ? (
          <Popup
            longitude={popupMarker.longitude}
            latitude={popupMarker.latitude}
            anchor="bottom"
            className="lemonlens-map-popup"
            maxWidth="none"
            offset={14}
            closeOnClick={false}
            closeOnMove={false}
            onClose={() => setActivePopupMarker(null)}
          >
            {popupResourceQuery.data ? (
              <MarkerPopupCard
                resource={popupResourceQuery.data}
                reviewPayload={popupReviewQuery.data ?? null}
                onOpen={() => onOpenResource(popupResourceQuery.data.id)}
              />
            ) : (
              <div className="w-[232px] rounded-[18px] bg-[linear-gradient(180deg,rgba(255,253,248,0.98),rgba(250,247,239,0.96))] p-3 text-[0.84rem] text-slate">
                Loading location details…
              </div>
            )}
          </Popup>
        ) : null}
      </Map>

      {mapError ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 rounded-2xl border border-coral/20 bg-white/92 px-4 py-3 text-sm text-slate shadow-soft">
          {mapError}
        </div>
      ) : null}
    </div>
  );
}
