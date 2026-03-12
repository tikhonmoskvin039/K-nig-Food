"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CheckoutPoint } from "../../types/checkoutSettings";

const DEFAULT_PICKUP_LAT = 54.7384;
const DEFAULT_PICKUP_LNG = 20.4713;
const LEGACY_PICKUP_LAT = 54.7257;
const LEGACY_PICKUP_LNG = 20.4729;
const KNOWN_RED_139B_LAT = 54.7384;
const KNOWN_RED_139B_LNG = 20.4713;
const pickupLatFromEnv = Number(process.env.NEXT_PUBLIC_PICKUP_LAT ?? DEFAULT_PICKUP_LAT);
const pickupLngFromEnv = Number(process.env.NEXT_PUBLIC_PICKUP_LNG ?? DEFAULT_PICKUP_LNG);
const originLatFromEnv = Number(process.env.NEXT_PUBLIC_ORIGIN_LAT ?? pickupLatFromEnv);
const originLngFromEnv = Number(process.env.NEXT_PUBLIC_ORIGIN_LNG ?? pickupLngFromEnv);

const DEFAULT_PICKUP_POINT: CheckoutPoint = {
  lat: Number.isFinite(pickupLatFromEnv) ? pickupLatFromEnv : DEFAULT_PICKUP_LAT,
  lng: Number.isFinite(pickupLngFromEnv) ? pickupLngFromEnv : DEFAULT_PICKUP_LNG,
  label: "Калининград, Красная 139Б",
  query: "Калининград, Красная 139Б",
};

const DEFAULT_ORIGIN_POINT: CheckoutPoint = {
  lat: Number.isFinite(originLatFromEnv) ? originLatFromEnv : DEFAULT_PICKUP_POINT.lat,
  lng: Number.isFinite(originLngFromEnv) ? originLngFromEnv : DEFAULT_PICKUP_POINT.lng,
  label: "Кухня K-nig Food, Калининград, Красная 139Б",
  query: "Калининград, Красная 139Б",
};
const YANDEX_SCRIPT_ID = "yandex-maps-api-script";

type PickedAddress = {
  city?: string;
  street?: string;
  house?: string;
};

export type RouteStats = {
  distanceKm: number;
  durationMin: number;
  estimatedPriceRub?: number | null;
};

type Mode = "delivery" | "pickup";

interface DeliveryMapPickerProps {
  mode?: Mode;
  city?: string;
  street?: string;
  house?: string;
  originPoint?: CheckoutPoint;
  pickupPoint?: CheckoutPoint;
  refreshSignal?: number;
  onAddressPicked?: (address: PickedAddress) => void;
  onRouteStatsChange?: (stats: RouteStats | null) => void;
}

type YCoordinates = [number, number];

type YAddressComponent = {
  name?: string;
  kinds?: string[];
};

type YMetaDataProperty = {
  GeocoderMetaData?: {
    Address?: {
      Components?: YAddressComponent[];
    };
  };
};

type YGeoObject = {
  properties: {
    get: (key: string) => unknown;
  };
  geometry?: {
    getCoordinates?: () => YCoordinates;
  };
};

type YGeoObjectsList = {
  get: (index: number) => YGeoObject | undefined;
};

type YGeocodeResult = {
  geoObjects?: YGeoObjectsList;
};

type YMapEvent = {
  get: (key: "coords") => YCoordinates;
};

type YMapObjectCollection = {
  add: (object: unknown) => void;
  remove: (object: unknown) => void;
};

type YMapInstance = {
  geoObjects: YMapObjectCollection;
  events: {
    add: (name: string, handler: (event: YMapEvent) => void) => void;
  };
  setCenter: (coords: YCoordinates, zoom?: number, options?: Record<string, unknown>) => void;
  setBounds: (
    bounds: [YCoordinates, YCoordinates],
    options?: Record<string, unknown>,
  ) => void;
  destroy: () => void;
};

type YActiveRoute = {
  properties: {
    get: (key: string) => unknown;
  };
};

type YMultiRoute = {
  model: {
    events: {
      add: (name: "requestsuccess" | "requestfail", handler: () => void) => void;
    };
  };
  getActiveRoute: () => YActiveRoute | null;
};

type YMapsNamespace = {
  ready: (cb: () => void) => void;
  Map: new (
    container: HTMLElement,
    state: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => YMapInstance;
  Placemark: new (
    coordinates: YCoordinates,
    properties?: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => unknown;
  Polyline: new (
    coordinates: YCoordinates[],
    properties?: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => unknown;
  geocode: (
    query: string | YCoordinates,
    options?: Record<string, unknown>,
  ) => Promise<YGeocodeResult>;
  multiRouter: {
    MultiRoute: new (
      model: Record<string, unknown>,
      options?: Record<string, unknown>,
    ) => YMultiRoute;
  };
};

type YMapsWindow = Window & {
  ymaps?: YMapsNamespace;
  __ymapsLoaderPromise?: Promise<YMapsNamespace>;
};

type BuildRouteArgs = {
  startCoords: YCoordinates;
  endCoords: YCoordinates;
  markerCoords: YCoordinates;
  markerHint: string;
  reverseGeocodeEnd?: boolean;
};

const FALLBACK_DELIVERY_BASE = 89;
const FALLBACK_DELIVERY_PER_KM = 38;
const FALLBACK_DELIVERY_PER_MIN = 3;
const ROUTE_SHEET_SWIPE_DOWN_THRESHOLD_PX = 44;

function toPositiveNumber(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric;
}

function readObjectValue(objectValue: unknown): unknown {
  if (!objectValue || typeof objectValue !== "object") return null;
  const typed = objectValue as Record<string, unknown>;
  return typed.value ?? typed.price ?? typed.amount ?? null;
}

function extractAddress(geoObject: YGeoObject): PickedAddress {
  const meta = geoObject.properties.get("metaDataProperty") as
    | YMetaDataProperty
    | undefined;
  const components = meta?.GeocoderMetaData?.Address?.Components ?? [];

  let city = "";
  let street = "";
  let house = "";

  for (const part of components) {
    if (!part || typeof part.name !== "string") continue;
    const kinds = Array.isArray(part.kinds) ? part.kinds : [];
    if (!city && (kinds.includes("locality") || kinds.includes("province"))) {
      city = part.name;
    }
    if (!street && kinds.includes("street")) {
      street = part.name;
    }
    if (!house && kinds.includes("house")) {
      house = part.name;
    }
  }

  return { city, street, house };
}

function estimateDeliveryPriceRub(distanceKm: number, durationMin: number): number {
  const calculated =
    FALLBACK_DELIVERY_BASE +
    distanceKm * FALLBACK_DELIVERY_PER_KM +
    durationMin * FALLBACK_DELIVERY_PER_MIN;
  return Math.max(149, Math.round(calculated));
}

function computeCoordinatesBounds(
  coordinates: YCoordinates[],
): [YCoordinates, YCoordinates] | null {
  if (!coordinates.length) return null;

  let minLat = coordinates[0][0];
  let maxLat = coordinates[0][0];
  let minLng = coordinates[0][1];
  let maxLng = coordinates[0][1];

  for (const [lat, lng] of coordinates) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

function normalizeCheckoutPoint(
  point: CheckoutPoint | undefined,
  fallback: CheckoutPoint,
): CheckoutPoint {
  const label =
    typeof point?.label === "string" && point.label.trim()
      ? point.label.trim()
      : fallback.label;
  const query =
    typeof point?.query === "string" && point.query.trim()
      ? point.query.trim()
      : fallback.query;
  let lat =
    typeof point?.lat === "number" && Number.isFinite(point.lat)
      ? point.lat
      : fallback.lat;
  let lng =
    typeof point?.lng === "number" && Number.isFinite(point.lng)
      ? point.lng
      : fallback.lng;

  const normalizedAddress = `${label} ${query}`.toLowerCase();
  const isKnownRedAddress =
    normalizedAddress.includes("красная") &&
    normalizedAddress.includes("139");
  const isLegacyCoordinatePair =
    Math.abs(lat - LEGACY_PICKUP_LAT) < 0.0002 &&
    Math.abs(lng - LEGACY_PICKUP_LNG) < 0.0002;
  const isFarFromKnownPoint =
    Math.abs(lat - KNOWN_RED_139B_LAT) > 0.002 ||
    Math.abs(lng - KNOWN_RED_139B_LNG) > 0.002;

  if (isKnownRedAddress && (isLegacyCoordinatePair || isFarFromKnownPoint)) {
    lat = KNOWN_RED_139B_LAT;
    lng = KNOWN_RED_139B_LNG;
  }

  return {
    label,
    query,
    lat,
    lng,
  };
}

function tryExtractYandexPriceRub(activeRoute: YActiveRoute): number | null {
  const taxiRaw = activeRoute.properties.get("taxi");
  const directPriceRaw = activeRoute.properties.get("price");
  const tariffRaw = activeRoute.properties.get("tariff");

  const taxiPrice = toPositiveNumber(readObjectValue(taxiRaw));
  if (taxiPrice) return Math.round(taxiPrice);

  const directPrice = toPositiveNumber(readObjectValue(directPriceRaw));
  if (directPrice) return Math.round(directPrice);

  const tariffPrice = toPositiveNumber(readObjectValue(tariffRaw));
  if (tariffPrice) return Math.round(tariffPrice);

  return null;
}

function loadYandexMaps(apiKey: string): Promise<YMapsNamespace> {
  if (!apiKey) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_YANDEX_MAPS_API_KEY is missing"),
    );
  }

  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is not available"));
  }

  const win = window as YMapsWindow;
  const existingYMaps = win.ymaps;

  if (existingYMaps?.Map) {
    return new Promise((resolve) => {
      existingYMaps.ready(() => resolve(existingYMaps));
    });
  }

  if (win.__ymapsLoaderPromise) {
    return win.__ymapsLoaderPromise;
  }

  win.__ymapsLoaderPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(
      YANDEX_SCRIPT_ID,
    ) as HTMLScriptElement | null;

    const resolveOnReady = () => {
      const ymaps = (window as YMapsWindow).ymaps;
      if (!ymaps) {
        reject(new Error("Yandex Maps API did not initialize"));
        return;
      }
      ymaps.ready(() => resolve(ymaps));
    };

    if (existing) {
      resolveOnReady();
      return;
    }

    const script = document.createElement("script");
    script.id = YANDEX_SCRIPT_ID;
    script.async = true;
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
    script.onload = resolveOnReady;
    script.onerror = () => {
      reject(new Error("Failed to load Yandex Maps script"));
    };
    document.head.appendChild(script);
  });

  return win.__ymapsLoaderPromise;
}

export default function DeliveryMapPicker({
  mode = "delivery",
  city = "",
  street = "",
  house = "",
  originPoint,
  pickupPoint,
  refreshSignal = 0,
  onAddressPicked,
  onRouteStatsChange,
}: DeliveryMapPickerProps) {
  const resolvedPickupPoint = useMemo(
    () => normalizeCheckoutPoint(pickupPoint, DEFAULT_PICKUP_POINT),
    [pickupPoint],
  );
  const resolvedOriginPoint = useMemo(
    () => normalizeCheckoutPoint(originPoint, DEFAULT_ORIGIN_POINT),
    [originPoint],
  );
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<YMapInstance | null>(null);
  const ymapsRef = useRef<YMapsNamespace | null>(null);
  const routeRef = useRef<YMultiRoute | null>(null);
  const routeFallbackRef = useRef<unknown>(null);
  const dynamicMarkerRef = useRef<unknown>(null);
  const staticPointMarkerRef = useRef<unknown>(null);
  const pickupCoordsRef = useRef<YCoordinates>([
    resolvedPickupPoint.lat,
    resolvedPickupPoint.lng,
  ]);
  const originCoordsRef = useRef<YCoordinates>([
    resolvedOriginPoint.lat,
    resolvedOriginPoint.lng,
  ]);
  const lastUserCoordsRef = useRef<YCoordinates | null>(null);
  const [mapError, setMapError] = useState("");
  const [routeStats, setRouteStats] = useState<RouteStats | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [isRouteSheetCollapsed, setIsRouteSheetCollapsed] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const routeSheetTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const routeSheetSwipeHandledRef = useRef(false);
  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY ?? "";
  const missingApiKeyError = !apiKey
    ? "Не задан ключ Яндекс Карт. Добавьте NEXT_PUBLIC_YANDEX_MAPS_API_KEY в .env."
    : "";

  const safeAddressPick = useCallback(
    (address: PickedAddress) => {
      if (!onAddressPicked) return;
      onAddressPicked(address);
    },
    [onAddressPicked],
  );

  const updateRouteStats = useCallback((nextStats: RouteStats | null) => {
    setRouteStats(nextStats);
    if (nextStats) {
      setIsRouteSheetCollapsed(false);
    }
  }, []);

  useEffect(() => {
    if (!onRouteStatsChange) return;
    onRouteStatsChange(routeStats);
  }, [onRouteStatsChange, routeStats]);

  useEffect(() => {
    pickupCoordsRef.current = [resolvedPickupPoint.lat, resolvedPickupPoint.lng];
    originCoordsRef.current = [resolvedOriginPoint.lat, resolvedOriginPoint.lng];
  }, [
    resolvedOriginPoint.lat,
    resolvedOriginPoint.lng,
    resolvedPickupPoint.lat,
    resolvedPickupPoint.lng,
  ]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const mapContainer = mapContainerRef.current;
      const fullscreenElement = document.fullscreenElement;
      const nextFullscreen =
        Boolean(fullscreenElement) &&
        Boolean(mapContainer && fullscreenElement?.contains(mapContainer));
      setIsMapFullscreen(nextFullscreen);
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobileViewport(media.matches);
    apply();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }

    media.addListener(apply);
    return () => media.removeListener(apply);
  }, []);

  const clearRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (routeRef.current) {
      map.geoObjects.remove(routeRef.current);
      routeRef.current = null;
    }
    if (routeFallbackRef.current) {
      map.geoObjects.remove(routeFallbackRef.current);
      routeFallbackRef.current = null;
    }
    if (dynamicMarkerRef.current) {
      map.geoObjects.remove(dynamicMarkerRef.current);
      dynamicMarkerRef.current = null;
    }
  }, []);

  const drawFallbackRoute = useCallback(
    async (
      startCoords: YCoordinates,
      endCoords: YCoordinates,
      includePriceEstimate: boolean,
    ) => {
      const ymaps = ymapsRef.current;
      const map = mapRef.current;
      if (!ymaps || !map) return;

      const [startLat, startLng] = startCoords;
      const [endLat, endLng] = endCoords;

      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`,
      );
      if (!response.ok) {
        throw new Error(`OSRM route failed: ${response.status}`);
      }

      const json = (await response.json()) as {
        routes?: Array<{
          distance: number;
          duration: number;
          geometry: {
            coordinates: [number, number][];
          };
        }>;
      };
      const first = json.routes?.[0];
      if (!first) {
        throw new Error("OSRM route not found");
      }

      const polyCoords = first.geometry.coordinates.map(([lng, lat]) => [
        lat,
        lng,
      ]) as YCoordinates[];

      const fallbackPolyline = new ymaps.Polyline(
        polyCoords,
        {},
        {
          strokeColor: "#22d3ee",
          strokeWidth: 4,
          strokeOpacity: 0.9,
        },
      );
      routeFallbackRef.current = fallbackPolyline;
      map.geoObjects.add(fallbackPolyline);
      const bounds = computeCoordinatesBounds(polyCoords);
      if (bounds) {
        map.setBounds(bounds, {
          checkZoomRange: true,
          zoomMargin: 28,
        });
      }

      const distanceKm = Number((first.distance / 1000).toFixed(1));
      const durationMin = Math.max(1, Math.round(first.duration / 60));
      const estimatedPriceRub = includePriceEstimate
        ? estimateDeliveryPriceRub(distanceKm, durationMin)
        : null;
      updateRouteStats({ distanceKm, durationMin, estimatedPriceRub });
      setMapError("");
    },
    [updateRouteStats],
  );

  const buildRoute = useCallback(
    async ({
      startCoords,
      endCoords,
      markerCoords,
      markerHint,
      reverseGeocodeEnd = false,
    }: BuildRouteArgs) => {
      const ymaps = ymapsRef.current;
      const map = mapRef.current;
      if (!ymaps || !map) return;

      clearRoute();

      const dynamicMarker = new ymaps.Placemark(
        markerCoords,
        { hintContent: markerHint },
        { preset: "islands#blueCircleDotIcon" },
      );
      dynamicMarkerRef.current = dynamicMarker;
      map.geoObjects.add(dynamicMarker);

      const includePriceEstimate = mode === "delivery";
      if (mode === "pickup") {
        try {
          await drawFallbackRoute(
            startCoords,
            endCoords,
            false,
          );
        } catch (error) {
          console.error("Pickup route build failed:", error);
          updateRouteStats(null);
          setMapError("Не удалось построить маршрут. Обновите геолокацию и попробуйте снова.");
        }
        return;
      }

      const multiRoute = new ymaps.multiRouter.MultiRoute(
        {
          referencePoints: [startCoords, endCoords],
          params: {
            routingMode: "auto",
            results: 1,
          },
        },
        {
          boundsAutoApply: true,
          wayPointVisible: false,
          viaPointVisible: false,
          routeVisible: false,
          routeActiveVisible: true,
          routeActiveStrokeColor: "#22d3ee",
          routeActiveStrokeWidth: 4,
        },
      );

      multiRoute.model.events.add("requestsuccess", () => {
        const activeRoute = multiRoute.getActiveRoute();
        if (!activeRoute) {
          updateRouteStats(null);
          return;
        }

        const distanceObj = activeRoute.properties.get("distance");
        const durationObj = activeRoute.properties.get("duration");
        const distanceMeters = toPositiveNumber(readObjectValue(distanceObj));
        const durationSeconds = toPositiveNumber(readObjectValue(durationObj));

        if (!distanceMeters || !durationSeconds) {
          updateRouteStats(null);
          return;
        }

        const distanceKm = Number((distanceMeters / 1000).toFixed(1));
        const durationMin = Math.max(1, Math.round(durationSeconds / 60));
        const yandexPrice = includePriceEstimate
          ? tryExtractYandexPriceRub(activeRoute)
          : null;
        const estimatedPriceRub = includePriceEstimate
          ? yandexPrice ?? estimateDeliveryPriceRub(distanceKm, durationMin)
          : null;

        updateRouteStats({
          distanceKm,
          durationMin,
          estimatedPriceRub,
        });
        setMapError("");
      });

      multiRoute.model.events.add("requestfail", () => {
        void (async () => {
          try {
            map.geoObjects.remove(multiRoute);
            routeRef.current = null;
            await drawFallbackRoute(
              startCoords,
              endCoords,
              includePriceEstimate,
            );
          } catch (error) {
            console.error("Fallback route failed:", error);
            updateRouteStats(null);
            setMapError("Маршрут не построен. Проверьте точку назначения.");
          }
        })();
      });

      routeRef.current = multiRoute;
      map.geoObjects.add(multiRoute);

      if (reverseGeocodeEnd && mode === "delivery") {
        try {
          const reverseResult = await ymaps.geocode(endCoords, {
            results: 1,
            kind: "house",
          });
          const first = reverseResult?.geoObjects?.get(0);
          if (first) {
            safeAddressPick(extractAddress(first));
          }
        } catch (error) {
          console.error("Yandex reverse geocode failed:", error);
        }
      }
    },
    [clearRoute, drawFallbackRoute, mode, safeAddressPick, updateRouteStats],
  );

  const locateAndBuildPickupRoute = useCallback(
    () => {
    if (mode !== "pickup") return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setMapError("Геолокация недоступна в этом браузере.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userCoords: YCoordinates = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        lastUserCoordsRef.current = userCoords;

        void buildRoute({
          startCoords: userCoords,
          endCoords: pickupCoordsRef.current,
          markerCoords: userCoords,
          markerHint: "Вы здесь",
        });
        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsLocating(false);
        setMapError(
          "Не удалось получить вашу геолокацию. Разрешите доступ к местоположению.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      },
    );
  }, [buildRoute, mode]);

  const openPickupNavigatorRoute = useCallback(
    (startCoords: YCoordinates | null) => {
      if (typeof window === "undefined") return;

      const destination = `${pickupCoordsRef.current[0]},${pickupCoordsRef.current[1]}`;
      const routeText = startCoords
        ? `${startCoords[0]},${startCoords[1]}~${destination}`
        : `~${destination}`;
      const href = `https://yandex.ru/maps/?mode=routes&rtext=${encodeURIComponent(routeText)}&rtt=auto`;
      window.open(href, "_blank", "noopener,noreferrer");
    },
    [],
  );

  const handleOpenPickupNavigatorRoute = useCallback(() => {
    if (mode !== "pickup") return;

    if (lastUserCoordsRef.current) {
      openPickupNavigatorRoute(lastUserCoordsRef.current);
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      openPickupNavigatorRoute(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userCoords: YCoordinates = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        lastUserCoordsRef.current = userCoords;
        openPickupNavigatorRoute(userCoords);
      },
      () => {
        openPickupNavigatorRoute(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 60000,
      },
    );
  }, [mode, openPickupNavigatorRoute]);

  useEffect(() => {
    let disposed = false;

    if (!apiKey) return;

    const initMap = async () => {
      try {
        const ymaps = await loadYandexMaps(apiKey);
        if (disposed || !mapContainerRef.current) return;

        ymapsRef.current = ymaps;
        if (mapRef.current) return;

        originCoordsRef.current = [resolvedOriginPoint.lat, resolvedOriginPoint.lng];
        pickupCoordsRef.current = [resolvedPickupPoint.lat, resolvedPickupPoint.lng];

        const map = new ymaps.Map(
          mapContainerRef.current,
          {
            center:
              mode === "delivery"
                ? originCoordsRef.current
                : pickupCoordsRef.current,
            zoom: 12,
            controls: ["zoomControl", "fullscreenControl"],
          },
          {
            suppressMapOpenBlock: true,
          },
        );

        const staticPointCoords =
          mode === "delivery" ? originCoordsRef.current : pickupCoordsRef.current;
        const staticPointLabel =
          mode === "delivery"
            ? `Старт доставки: ${resolvedOriginPoint.label}`
            : `Самовывоз: ${resolvedPickupPoint.label}`;
        const staticPointMarker = new ymaps.Placemark(
          staticPointCoords,
          {
            balloonContent: staticPointLabel,
            hintContent: staticPointLabel,
          },
          {
            preset: mode === "delivery" ? "islands#darkBlueDotIcon" : "islands#orangeDotIcon",
          },
        );
        staticPointMarkerRef.current = staticPointMarker;
        map.geoObjects.add(staticPointMarker);
        mapRef.current = map;

        if (mode === "delivery") {
          map.events.add("click", (event: YMapEvent) => {
            const coords = event.get("coords");
            void buildRoute({
              startCoords: originCoordsRef.current,
              endCoords: coords,
              markerCoords: coords,
              markerHint: "Точка доставки",
              reverseGeocodeEnd: true,
            });
          });
        }

        if (mode === "pickup") {
          locateAndBuildPickupRoute();
        }

        setMapError("");
      } catch (error) {
        console.error("Failed to initialize Yandex map:", error);
        setMapError("Не удалось загрузить Яндекс Карту. Проверьте ключ и соединение.");
      }
    };

    void initMap();

    return () => {
      disposed = true;
      clearRoute();
      if (staticPointMarkerRef.current && mapRef.current) {
        mapRef.current.geoObjects.remove(staticPointMarkerRef.current);
        staticPointMarkerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
      ymapsRef.current = null;
      updateRouteStats(null);
      setIsLocating(false);
      setIsMapFullscreen(false);
    };
  }, [
    apiKey,
    buildRoute,
    clearRoute,
    locateAndBuildPickupRoute,
    mode,
    resolvedOriginPoint,
    resolvedPickupPoint,
    updateRouteStats,
  ]);

  useEffect(() => {
    if (mode !== "delivery") return;

    const normalizedCity = city.trim();
    const normalizedStreet = street.trim();
    if (!normalizedCity || !normalizedStreet) return;

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      const ymaps = ymapsRef.current;
      if (!ymaps) return;

      try {
        const query = [
          normalizedCity,
          normalizedStreet,
          house.trim(),
          "Россия",
        ]
          .filter(Boolean)
          .join(", ");

        const result = await ymaps.geocode(query, {
          results: 1,
          kind: "house",
        });
        if (cancelled) return;

        const first = result?.geoObjects?.get(0);
        if (!first) return;

        const coords = first.geometry?.getCoordinates?.();
        if (!coords || coords.length !== 2) return;

        void buildRoute({
          startCoords: originCoordsRef.current,
          endCoords: coords,
          markerCoords: coords,
          markerHint: "Точка доставки",
        });
      } catch (error) {
        if (!cancelled) {
          console.error("Yandex forward geocode failed:", error);
        }
      }
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [buildRoute, city, house, mode, refreshSignal, street]);

  const shouldShowFloatingRouteStats = Boolean(
    routeStats &&
      !isMapFullscreen,
  );
  const floatingRouteStats: RouteStats | null =
    shouldShowFloatingRouteStats && routeStats ? routeStats : null;
  const isSheetCollapsed = isMobileViewport && isRouteSheetCollapsed;
  const scrollToMapCanvas = useCallback(() => {
    mapContainerRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, []);

  const renderRouteDetailsSheet = (
    stats: RouteStats,
    className?: string,
  ) => (
    <div
      className={`checkout-route-floating ${className ?? ""}`.trim()}
      onTouchStart={(event) => {
        if (!isMobileViewport) return;
        const touch = event.touches[0];
        if (!touch) return;
        routeSheetTouchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
        };
        routeSheetSwipeHandledRef.current = false;
      }}
      onTouchMove={(event) => {
        if (!isMobileViewport) return;
        if (routeSheetSwipeHandledRef.current) return;

        const touch = event.touches[0];
        const start = routeSheetTouchStartRef.current;
        if (!touch || !start) return;

        const deltaY = touch.clientY - start.y;
        const deltaX = Math.abs(touch.clientX - start.x);

        const isVerticalGesture = Math.abs(deltaY) > deltaX * 1.2;
        if (!isVerticalGesture) return;

        if (
          !isSheetCollapsed &&
          deltaY > ROUTE_SHEET_SWIPE_DOWN_THRESHOLD_PX
        ) {
          setIsRouteSheetCollapsed(true);
          routeSheetSwipeHandledRef.current = true;
          routeSheetTouchStartRef.current = null;
          return;
        }

        if (
          isSheetCollapsed &&
          deltaY < -ROUTE_SHEET_SWIPE_DOWN_THRESHOLD_PX
        ) {
          setIsRouteSheetCollapsed(false);
          routeSheetSwipeHandledRef.current = true;
          routeSheetTouchStartRef.current = null;
        }
      }}
      onTouchEnd={() => {
        routeSheetTouchStartRef.current = null;
        routeSheetSwipeHandledRef.current = false;
      }}
      onTouchCancel={() => {
        routeSheetTouchStartRef.current = null;
        routeSheetSwipeHandledRef.current = false;
      }}
    >
      {isMobileViewport ? (
        <>
          <div className="checkout-route-sheet-head">
            <div className="checkout-route-sheet-head-actions">
              <button
                type="button"
                className="checkout-route-sheet-map-btn"
                onClick={scrollToMapCanvas}
              >
                Показать маршрут на карте
              </button>
              <button
                type="button"
                className="checkout-route-sheet-toggle"
                onClick={() => setIsRouteSheetCollapsed((prev) => !prev)}
                aria-expanded={!isSheetCollapsed}
              >
                {isSheetCollapsed
                  ? "Поднять шторку маршрута"
                  : "Скрыть шторку маршрута"}
              </button>
            </div>
          </div>

          {isSheetCollapsed ? (
            <p className="checkout-route-sheet-preview">
              {stats.distanceKm.toFixed(1)} км · ~ {stats.durationMin} мин · свайп вверх
            </p>
          ) : (
            <div className="checkout-route-sheet-body">
              <p className="text-xl md:text-2xl font-semibold text-slate-900">
                Маршрут: {stats.distanceKm.toFixed(1)} км
              </p>
              <p className="text-base md:text-lg font-bold text-cyan-700">
                В пути: ~ {stats.durationMin} мин
              </p>
              {stats.estimatedPriceRub ? (
                <p className="text-sm md:text-base text-slate-700">
                  Предварительная стоимость доставки: {stats.estimatedPriceRub} ₽
                </p>
              ) : null}
            </div>
          )}
        </>
      ) : (
        <div className="checkout-route-sheet-body">
          <p className="text-xl md:text-2xl font-semibold text-slate-900">
            Маршрут: {stats.distanceKm.toFixed(1)} км
          </p>
          <p className="text-base md:text-lg font-bold text-cyan-700">
            В пути: ~ {stats.durationMin} мин
          </p>
          {stats.estimatedPriceRub ? (
            <p className="text-sm md:text-base text-slate-700">
              Предварительная стоимость доставки: {stats.estimatedPriceRub} ₽
            </p>
          ) : null}
        </div>
      )}
    </div>
  );

  return (
    <div className="delivery-map-shell space-y-3">
      <p className="text-sm text-slate-700">
        {mode === "delivery" ? (
          <>
            Выберите точку доставки на Яндекс Карте. Маршрут строится от точки
            старта доставки:{" "}
            <span className="font-semibold text-slate-900">{resolvedOriginPoint.label}</span>
          </>
        ) : (
          <>
            Маршрут к точке самовывоза{" "}
            <span className="font-semibold text-slate-900">{resolvedPickupPoint.label}</span>{" "}
            строится от вашей текущей геолокации.
          </>
        )}
      </p>

      {routeStats && isMapFullscreen
        ? renderRouteDetailsSheet(routeStats, "checkout-route-static")
        : null}

      <div
        ref={mapContainerRef}
        className="delivery-map-canvas delivery-map-canvas-compact"
      />

      {mode === "pickup" && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={locateAndBuildPickupRoute}
            disabled={isLocating}
          >
            {isLocating ? "Определяем геолокацию..." : "Обновить мою геолокацию"}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleOpenPickupNavigatorRoute}
          >
            Проложить маршрут в Яндекс Навигаторе
          </button>
          </div>
        </div>
      )}

      {floatingRouteStats ? renderRouteDetailsSheet(floatingRouteStats) : null}

      {(missingApiKeyError || mapError) && (
        <p className="text-sm text-red-500">{missingApiKeyError || mapError}</p>
      )}
    </div>
  );
}
