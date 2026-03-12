"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalization } from "../../context/LocalizationContext";
import { useCheckoutSettings } from "../../context/CheckoutContext";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import ConfirmModal from "../common/ConfirmModal";
import DeliveryMapPicker, { type RouteStats } from "./DeliveryMapPicker";
import {
  clearDeliveryQuote,
  setDeliveryAddress,
  setDeliveryAddressConfirmed,
  setDeliveryQuote,
  setFulfillmentMethod,
  setPickupAddress,
} from "../../store/slices/checkoutSlice";

const YANDEX_GO_FALLBACK_URL = "https://go.yandex/ru_ru/";
const YANDEX_ROUTE_URL = "https://yandex.ru/maps/";
const YANDEX_GO_DEEPLINK_URL = "https://3.redirect.appmetrica.yandex.com/route";
const YANDEX_GO_TRACKING_ID = "1178268795219780156";
const SUGGESTION_LIMIT = 5;
const KALININGRAD_REGION_CITIES = [
  "Калининград",
  "Балтийск",
  "Светлогорск",
  "Зеленоградск",
  "Пионерский",
  "Светлый",
  "Гурьевск",
  "Гвардейск",
  "Черняховск",
  "Советск",
  "Неман",
  "Гусев",
  "Озерск",
  "Правдинск",
  "Полесск",
  "Мамоново",
  "Ладушкин",
  "Багратионовск",
  "Нестеров",
  "Краснознаменск",
  "Славск",
  "Янтарный",
];
const IDLE_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;
const IDLE_CHECK_INTERVAL_MS = 30 * 1000;

type NominatimSuggest = {
  display_name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    road?: string;
    house_number?: string;
  };
};

type NominatimReverseResponse = {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    road?: string;
    pedestrian?: string;
    residential?: string;
    house_number?: string;
  };
};

type AddressSuggestion = {
  key: string;
  label: string;
  city: string;
  street: string;
  house: string;
};

type MapPickedAddress = {
  city?: string;
  street?: string;
  house?: string;
  lat?: number;
  lng?: number;
};

export default function FulfillmentMethodForm() {
  const dispatch = useAppDispatch();
  const { labels } = useLocalization();
  const checkoutSettings = useCheckoutSettings();
  const checkout = useAppSelector((state) => state.checkout);
  const deliveryEnabled = checkoutSettings.deliveryEnabled;
  const pickupAddressLabel = checkoutSettings.pickupPoint.label;

  const [deliveryAmountInput, setDeliveryAmountInput] = useState("");
  const [deliveryError, setDeliveryError] = useState("");
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [isDeliveryAmountManual, setIsDeliveryAmountManual] = useState(false);
  const [routeAutoPriceNote, setRouteAutoPriceNote] = useState("");
  const [minRouteAmountRub, setMinRouteAmountRub] = useState<number | null>(null);
  const [routeRefreshSignal, setRouteRefreshSignal] = useState(0);
  const [isGeoAutofillLoading, setIsGeoAutofillLoading] = useState(false);
  const [geoAutofillMessage, setGeoAutofillMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [streetSuggestions, setStreetSuggestions] = useState<AddressSuggestion[]>(
    [],
  );
  const [suggestionsError, setSuggestionsError] = useState("");
  const [isCityFocused, setIsCityFocused] = useState(false);
  const [isStreetFocused, setIsStreetFocused] = useState(false);
  const [showAddressFieldErrors, setShowAddressFieldErrors] = useState(false);
  const [addressValidationError, setAddressValidationError] = useState("");
  const [deliveryMapTarget, setDeliveryMapTarget] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const lastActivityAtRef = useRef(0);
  const lastIdleRefreshAtRef = useRef(0);
  const hasAutoGeoPrefillTriedRef = useRef(false);

  const hasDeliveryQuote = useMemo(
    () =>
      Boolean(
        checkout.fulfillmentMethod === "delivery" &&
          checkout.deliveryQuote &&
          Number.isFinite(checkout.deliveryQuote.amount) &&
          checkout.deliveryQuote.amount > 0,
      ),
    [checkout.deliveryQuote, checkout.fulfillmentMethod],
  );
  const isDeliveryAddressRequiredFilled = useMemo(
    () =>
      checkout.deliveryAddress.city.trim().length > 0 &&
      checkout.deliveryAddress.street.trim().length > 0 &&
      checkout.deliveryAddress.house.trim().length > 0,
    [
      checkout.deliveryAddress.city,
      checkout.deliveryAddress.house,
      checkout.deliveryAddress.street,
    ],
  );
  const isCityMissing = checkout.deliveryAddress.city.trim().length === 0;
  const isStreetMissing = checkout.deliveryAddress.street.trim().length === 0;
  const isHouseMissing = checkout.deliveryAddress.house.trim().length === 0;

  useEffect(() => {
    if (isDeliveryAddressRequiredFilled) {
      setShowAddressFieldErrors(false);
      setAddressValidationError("");
    }
  }, [isDeliveryAddressRequiredFilled]);

  const handleMethodChange = (method: "pickup" | "delivery") => {
    if (method === "delivery" && !deliveryEnabled) {
      return;
    }

    dispatch(setFulfillmentMethod(method));
    setDeliveryError("");
    setRouteAutoPriceNote("");
    if (method === "delivery") {
      setIsDeliveryAmountManual(false);
    }
  };

  useEffect(() => {
    if (checkout.pickupAddress === pickupAddressLabel) return;
    dispatch(setPickupAddress(pickupAddressLabel));
  }, [checkout.pickupAddress, dispatch, pickupAddressLabel]);

  useEffect(() => {
    if (deliveryEnabled) return;
    if (checkout.fulfillmentMethod !== "delivery") return;

    dispatch(clearDeliveryQuote());
    dispatch(setFulfillmentMethod("pickup"));
  }, [checkout.fulfillmentMethod, deliveryEnabled, dispatch]);

  useEffect(() => {
    lastActivityAtRef.current = Date.now();

    const markActivity = () => {
      lastActivityAtRef.current = Date.now();
    };

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "keydown",
      "click",
      "touchstart",
      "scroll",
      "input",
    ];

    for (const eventName of events) {
      window.addEventListener(eventName, markActivity, { passive: true });
    }

    return () => {
      for (const eventName of events) {
        window.removeEventListener(eventName, markActivity);
      }
    };
  }, []);

  useEffect(() => {
    const hasAddressForRoute =
      checkout.deliveryAddress.city.trim().length > 0 &&
      checkout.deliveryAddress.street.trim().length > 0 &&
      checkout.deliveryAddress.house.trim().length > 0;

    if (
      checkout.fulfillmentMethod !== "delivery" ||
      !deliveryEnabled ||
      !hasAddressForRoute
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const now = Date.now();
      const isIdle = now - lastActivityAtRef.current >= IDLE_REFRESH_THRESHOLD_MS;
      const canRefreshAgain =
        now - lastIdleRefreshAtRef.current >= IDLE_REFRESH_THRESHOLD_MS;

      if (!isIdle || !canRefreshAgain) return;

      lastIdleRefreshAtRef.current = now;
      setRouteRefreshSignal((prev) => prev + 1);
    }, IDLE_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    checkout.deliveryAddress.city,
    checkout.deliveryAddress.house,
    checkout.deliveryAddress.street,
    checkout.fulfillmentMethod,
    deliveryEnabled,
  ]);

  const applyReverseGeocodedAddress = useCallback(
    async (latitude: number, longitude: number, silent: boolean) => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=ru&lat=${encodeURIComponent(String(latitude))}&lon=${encodeURIComponent(String(longitude))}`,
        );
        if (!response.ok) {
          throw new Error(`Reverse geocode failed: ${response.status}`);
        }

        const payload = (await response.json()) as NominatimReverseResponse;
        const city =
          payload.address?.city ||
          payload.address?.town ||
          payload.address?.village ||
          "";
        const street =
          payload.address?.road ||
          payload.address?.pedestrian ||
          payload.address?.residential ||
          "";
        const house = payload.address?.house_number || "";

        dispatch(
          setDeliveryAddress({
            city,
            street,
            house,
          }),
        );
        setDeliveryMapTarget(null);
        dispatch(setDeliveryAddressConfirmed(false));
        setCitySuggestions([]);
        setStreetSuggestions([]);
        setShowAddressFieldErrors(false);
        setAddressValidationError("");
        setGeoAutofillMessage({
          type: "success",
          text: "Адрес подставлен по геолокации. Перед оформлением обязательно проверьте поля вручную.",
        });
      } catch (error) {
        console.error("Delivery reverse geocode failed:", error);
        if (!silent) {
          setGeoAutofillMessage({
            type: "error",
            text: "Не удалось определить адрес по геолокации. Заполните поля вручную.",
          });
        }
      } finally {
        setIsGeoAutofillLoading(false);
      }
    },
    [dispatch],
  );

  const autofillAddressByGeolocation = useCallback(
    (silent = false) => {
      setGeoAutofillMessage(null);

      if (typeof navigator === "undefined" || !navigator.geolocation) {
        if (!silent) {
          setGeoAutofillMessage({
            type: "error",
            text: "Геолокация недоступна в этом браузере.",
          });
        }
        return;
      }

      setIsGeoAutofillLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          void applyReverseGeocodedAddress(
            position.coords.latitude,
            position.coords.longitude,
            silent,
          );
        },
        (error) => {
          console.error("Delivery geolocation failed:", error);
          setIsGeoAutofillLoading(false);
          if (!silent) {
            setGeoAutofillMessage({
              type: "error",
              text: "Не удалось получить вашу геолокацию.",
            });
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 7000,
          maximumAge: 60000,
        },
      );
    },
    [applyReverseGeocodedAddress],
  );

  useEffect(() => {
    const hasUserAddressInput =
      checkout.deliveryAddress.city.trim().length > 0 ||
      checkout.deliveryAddress.street.trim().length > 0 ||
      checkout.deliveryAddress.house.trim().length > 0;

    if (checkout.fulfillmentMethod !== "delivery" || !deliveryEnabled) return;
    if (hasUserAddressInput) return;
    if (hasAutoGeoPrefillTriedRef.current) return;

    hasAutoGeoPrefillTriedRef.current = true;
    autofillAddressByGeolocation(true);
  }, [
    autofillAddressByGeolocation,
    checkout.deliveryAddress.city,
    checkout.deliveryAddress.house,
    checkout.deliveryAddress.street,
    checkout.fulfillmentMethod,
    deliveryEnabled,
  ]);

  const handleDeliveryAddressChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    if (geoAutofillMessage) {
      setGeoAutofillMessage(null);
    }
    if (name === "city" && value.trim().length < 2) {
      setCitySuggestions([]);
      setStreetSuggestions([]);
    }
    if (name === "street" && value.trim().length < 2) {
      setStreetSuggestions([]);
    }
    if (checkout.deliveryAddressConfirmed) {
      dispatch(setDeliveryAddressConfirmed(false));
    }
    if (name === "city" || name === "street" || name === "house") {
      setDeliveryMapTarget(null);
    }
    dispatch(setDeliveryAddress({ [name]: value }));
  };

  const handleClearDeliveryAddress = () => {
    dispatch(
      setDeliveryAddress({
        city: "",
        street: "",
        house: "",
        apartment: "",
        entrance: "",
        floor: "",
        comment: "",
      }),
    );
    dispatch(setDeliveryAddressConfirmed(false));
    setCitySuggestions([]);
    setStreetSuggestions([]);
    setGeoAutofillMessage(null);
    setShowAddressFieldErrors(false);
    setAddressValidationError("");
    setDeliveryMapTarget(null);
  };

  const triggerRequiredAddressValidation = () => {
    setShowAddressFieldErrors(true);
    setAddressValidationError(
      "Заполните обязательные поля адреса: город, улица и дом.",
    );
  };

  const handleRouteStatsChange = useCallback(
    (stats: RouteStats | null) => {
      if (checkout.fulfillmentMethod !== "delivery") return;
      if (!stats?.estimatedPriceRub) return;

      const autoAmount = Number(stats.estimatedPriceRub.toFixed(2));
      setMinRouteAmountRub(autoAmount);

      if (isDeliveryAmountManual) {
        const currentQuoteAmount = Number(checkout.deliveryQuote?.amount ?? 0);
        if (currentQuoteAmount >= autoAmount) {
          setDeliveryError("");
          return;
        }

        setDeliveryAmountInput(autoAmount.toFixed(2));
        dispatch(
          setDeliveryQuote({
            provider: "yandex",
            amount: autoAmount,
            currency: "RUB",
            calculatedAt: new Date().toISOString(),
            reference: `ymaps-route-floor-${stats.distanceKm}-${stats.durationMin}`,
          }),
        );
        setRouteAutoPriceNote(
          "Стоимость обновлена до минимальной по маршруту Яндекс Карт.",
        );
        setDeliveryError("");
        return;
      }

      setDeliveryAmountInput(autoAmount.toFixed(2));
      dispatch(
        setDeliveryQuote({
          provider: "yandex",
          amount: autoAmount,
          currency: "RUB",
          calculatedAt: new Date().toISOString(),
          reference: `ymaps-route-${stats.distanceKm}-${stats.durationMin}`,
        }),
      );
      setRouteAutoPriceNote(
        "Стоимость подставлена автоматически по маршруту Яндекс Карт.",
      );
      setDeliveryError("");
    },
    [
      checkout.deliveryQuote?.amount,
      checkout.fulfillmentMethod,
      dispatch,
      isDeliveryAmountManual,
    ],
  );

  const handleMapAddressPicked = useCallback(
    (address: MapPickedAddress) => {
      const nextCity = typeof address.city === "string" ? address.city.trim() : "";
      const nextStreet =
        typeof address.street === "string" ? address.street.trim() : "";
      const nextHouse = typeof address.house === "string" ? address.house.trim() : "";
      const hasCoords =
        Number.isFinite(address.lat) && Number.isFinite(address.lng);

      if (checkout.deliveryAddressConfirmed) {
        dispatch(setDeliveryAddressConfirmed(false));
      }
      dispatch(
        setDeliveryAddress({
          city: nextCity,
          street: nextStreet,
          house: nextHouse,
        }),
      );
      setShowAddressFieldErrors(false);
      setAddressValidationError("");
      setSuggestionsError("");
      setCitySuggestions([]);
      setStreetSuggestions([]);

      if (hasCoords) {
        setDeliveryMapTarget({
          lat: Number(address.lat),
          lng: Number(address.lng),
        });
      } else {
        setDeliveryMapTarget(null);
      }
    },
    [checkout.deliveryAddressConfirmed, dispatch],
  );

  const yandexGoRouteHref = useMemo(() => {
    const startLat = Number(checkoutSettings.originPoint.lat);
    const startLng = Number(checkoutSettings.originPoint.lng);
    const hasStartCoords = Number.isFinite(startLat) && Number.isFinite(startLng);

    if (hasStartCoords && deliveryMapTarget) {
      const deeplinkQuery = new URLSearchParams({
        "start-lat": String(startLat),
        "start-lon": String(startLng),
        "end-lat": String(deliveryMapTarget.lat),
        "end-lon": String(deliveryMapTarget.lng),
        tariffClass: "econom",
        lang: "ru",
        appmetrica_tracking_id: YANDEX_GO_TRACKING_ID,
      });
      return `${YANDEX_GO_DEEPLINK_URL}?${deeplinkQuery.toString()}`;
    }

    const destinationCoords = deliveryMapTarget
      ? `${deliveryMapTarget.lat},${deliveryMapTarget.lng}`
      : null;
    const destinationText = [
      checkout.deliveryAddress.city.trim(),
      checkout.deliveryAddress.street.trim(),
      checkout.deliveryAddress.house.trim(),
    ]
      .filter(Boolean)
      .join(", ");
    const destination = destinationCoords ?? destinationText;

    if (!destination) {
      return YANDEX_GO_FALLBACK_URL;
    }

    const routeText = hasStartCoords
      ? `${startLat},${startLng}~${destination}`
      : destinationCoords
        ? `~${destinationCoords}`
        : destination;

    return `${YANDEX_ROUTE_URL}?mode=routes&rtext=${encodeURIComponent(routeText)}&rtt=auto`;
  }, [
    checkout.deliveryAddress.city,
    checkout.deliveryAddress.house,
    checkout.deliveryAddress.street,
    checkoutSettings.originPoint.lat,
    checkoutSettings.originPoint.lng,
    deliveryMapTarget,
  ]);

  const handleApplyYandexDelivery = () => {
    const normalizedAmount = deliveryAmountInput.replace(",", ".").trim();
    const amount = Number(normalizedAmount);

    if (!isDeliveryAddressRequiredFilled) {
      triggerRequiredAddressValidation();
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setDeliveryError("Введите корректную стоимость доставки в рублях");
      return;
    }

    if (!checkout.deliveryAddressConfirmed) {
      setDeliveryError(
        "Перед добавлением доставки подтвердите, что проверили адрес вручную.",
      );
      return;
    }

    if (minRouteAmountRub && amount < minRouteAmountRub) {
      setDeliveryError(
        `Стоимость не может быть ниже ${minRouteAmountRub.toFixed(2)} ₽ (минимум по маршруту Яндекс).`,
      );
      return;
    }

    dispatch(
      setDeliveryQuote({
        provider: "yandex",
        amount: Number(amount.toFixed(2)),
        currency: "RUB",
        calculatedAt: new Date().toISOString(),
      }),
    );
    setIsDeliveryAmountManual(true);
    setRouteAutoPriceNote("Стоимость зафиксирована вручную.");
    setDeliveryError("");
  };

  const confirmCancelDelivery = () => {
    dispatch(clearDeliveryQuote());
    dispatch(setFulfillmentMethod("pickup"));
    dispatch(setDeliveryAddressConfirmed(true));
    setDeliveryAmountInput("");
    setIsDeliveryAmountManual(false);
    setMinRouteAmountRub(null);
    setRouteAutoPriceNote("");
    setCancelModalOpen(false);
  };

  const applyCitySuggestion = (cityName: string) => {
    if (checkout.deliveryAddressConfirmed) {
      dispatch(setDeliveryAddressConfirmed(false));
    }
    setDeliveryMapTarget(null);
    dispatch(setDeliveryAddress({ city: cityName }));
    setCitySuggestions([]);
    setIsCityFocused(false);
  };

  const applyStreetSuggestion = (suggestion: AddressSuggestion) => {
    if (checkout.deliveryAddressConfirmed) {
      dispatch(setDeliveryAddressConfirmed(false));
    }
    setDeliveryMapTarget(null);
    dispatch(
      setDeliveryAddress({
        city: suggestion.city || checkout.deliveryAddress.city,
        street: suggestion.street,
        house: suggestion.house || checkout.deliveryAddress.house,
      }),
    );
    setStreetSuggestions([]);
    setIsStreetFocused(false);
  };

  useEffect(() => {
    const query = checkout.deliveryAddress.city.trim();
    if (query.length < 2) return;
    const normalizedQuery = query.toLowerCase();
    const localMatches = KALININGRAD_REGION_CITIES.filter((cityName) =>
      cityName.toLowerCase().includes(normalizedQuery),
    ).slice(0, SUGGESTION_LIMIT);

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&accept-language=ru&q=${encodeURIComponent(`${query}, Россия`)}`,
        );
        if (!response.ok || cancelled) return;

        const items = (await response.json()) as NominatimSuggest[];
        const parsedCities = items
          .map((item) => item.address?.city || item.address?.town || item.address?.village || "")
          .filter((value): value is string => Boolean(value));
        const uniqueCities = Array.from(
          new Set([...localMatches, ...parsedCities]),
        ).slice(0, SUGGESTION_LIMIT);

        if (!cancelled) {
          setCitySuggestions(uniqueCities);
          setSuggestionsError("");
        }
      } catch (error) {
        if (!cancelled) {
          console.error("City suggestions failed:", error);
          setSuggestionsError("Автоподбор адреса временно недоступен.");
        }
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [checkout.deliveryAddress.city]);

  useEffect(() => {
    const city = checkout.deliveryAddress.city.trim();
    const streetQuery = checkout.deliveryAddress.street.trim();
    if (streetQuery.length < 2) return;

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const searchQuery = city
          ? `${streetQuery}, ${city}, Россия`
          : `${streetQuery}, Россия`;
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&accept-language=ru&q=${encodeURIComponent(searchQuery)}`,
        );
        if (!response.ok || cancelled) return;

        const items = (await response.json()) as NominatimSuggest[];
        const parsedSuggestions: AddressSuggestion[] = items
          .map((item, index) => {
            const suggestionCity =
              item.address?.city ||
              item.address?.town ||
              item.address?.village ||
              city ||
              "";
            const suggestionStreet = item.address?.road || "";
            const suggestionHouse = item.address?.house_number || "";
            if (!suggestionStreet) return null;

            const label = [
              suggestionStreet,
              suggestionHouse ? `д. ${suggestionHouse}` : "",
              suggestionCity,
            ]
              .filter(Boolean)
              .join(", ");

            return {
              key: `${suggestionStreet}-${suggestionHouse}-${suggestionCity}-${index}`,
              label: label || item.display_name || suggestionStreet,
              city: suggestionCity,
              street: suggestionStreet,
              house: suggestionHouse,
            } satisfies AddressSuggestion;
          })
          .filter((item): item is AddressSuggestion => item !== null);

        const uniqueStreets = parsedSuggestions
          .filter(
            (item, index, array) =>
              array.findIndex(
                (x) =>
                  x.city === item.city &&
                  x.street === item.street &&
                  x.house === item.house,
              ) === index,
          )
          .slice(0, SUGGESTION_LIMIT);

        if (!cancelled) {
          setStreetSuggestions(uniqueStreets);
          setSuggestionsError("");
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Street suggestions failed:", error);
          setSuggestionsError("Автоподбор адреса временно недоступен.");
        }
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [checkout.deliveryAddress.city, checkout.deliveryAddress.street]);

  return (
    <div className="surface-card p-5 md:p-6 space-y-5">
      <h3 className="section-title text-xl md:text-2xl">
        Получение заказа
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="checkbox-card" data-checked={checkout.fulfillmentMethod === "pickup"}>
          <input
            type="radio"
            className="accent-amber-500"
            checked={checkout.fulfillmentMethod === "pickup"}
            onChange={() => handleMethodChange("pickup")}
          />
          <span className="font-medium">{labels.pickup || "Самовывоз"}</span>
        </label>

        <label
          className="checkbox-card"
          data-checked={checkout.fulfillmentMethod === "delivery"}
          aria-disabled={!deliveryEnabled}
        >
          <input
            type="radio"
            className="accent-amber-500"
            checked={checkout.fulfillmentMethod === "delivery"}
            onChange={() => handleMethodChange("delivery")}
            disabled={!deliveryEnabled}
          />
          <span className="font-medium">
            {labels.delivery || "Доставка"}
            {!deliveryEnabled ? " (временно отключена)" : ""}
          </span>
        </label>
      </div>

      {!deliveryEnabled && (
        <p className="text-sm text-amber-700">
          Сервис доставки сейчас временно недоступен. Приносим извинения за
          доставленные неудобства.
        </p>
      )}

      {checkout.fulfillmentMethod === "pickup" && (
        <div className="space-y-4">
          <div className="rounded-xl border p-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900 mb-1">
              Адрес самовывоза (Калининград)
            </p>
            <p>{checkout.pickupAddress || pickupAddressLabel}</p>
          </div>
          <DeliveryMapPicker
            mode="pickup"
            originPoint={checkoutSettings.originPoint}
            pickupPoint={checkoutSettings.pickupPoint}
          />
        </div>
      )}

      {checkout.fulfillmentMethod === "delivery" && deliveryEnabled && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => autofillAddressByGeolocation(false)}
              disabled={isGeoAutofillLoading}
            >
              {isGeoAutofillLoading
                ? "Определяем адрес..."
                : "Подставить адрес по геолокации"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleClearDeliveryAddress}
            >
              Очистить адрес
            </button>
          </div>

          {geoAutofillMessage && (
            <p
              className={`text-xs ${
                geoAutofillMessage.type === "error"
                  ? "text-amber-700"
                  : "text-emerald-700"
              }`}
            >
              {geoAutofillMessage.text}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                Город
              </span>
              <div className="autocomplete-field">
                <input
                  name="city"
                  value={checkout.deliveryAddress.city}
                  onChange={handleDeliveryAddressChange}
                  onFocus={() => setIsCityFocused(true)}
                  onBlur={() => {
                    window.setTimeout(() => setIsCityFocused(false), 120);
                  }}
                  placeholder="Ваш город"
                  className={`form-control ${
                    showAddressFieldErrors && isCityMissing
                      ? "border-red-500 ring-2 ring-red-200"
                      : ""
                  }`}
                  autoComplete="off"
                  required
                />
                {isCityFocused && citySuggestions.length > 0 && (
                  <div className="autocomplete-menu">
                    {citySuggestions.map((item) => (
                      <button
                        key={`city-${item}`}
                        type="button"
                        className="autocomplete-item"
                        onMouseDown={() => applyCitySuggestion(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>

            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                Улица
              </span>
              <div className="autocomplete-field">
                <input
                  name="street"
                  value={checkout.deliveryAddress.street}
                  onChange={handleDeliveryAddressChange}
                  onFocus={() => setIsStreetFocused(true)}
                  onBlur={() => {
                    window.setTimeout(() => setIsStreetFocused(false), 120);
                  }}
                  placeholder="Например: Ленинский проспект"
                  className={`form-control ${
                    showAddressFieldErrors && isStreetMissing
                      ? "border-red-500 ring-2 ring-red-200"
                      : ""
                  }`}
                  autoComplete="off"
                  required
                />
                {isStreetFocused && streetSuggestions.length > 0 && (
                  <div className="autocomplete-menu">
                    {streetSuggestions.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className="autocomplete-item"
                        onMouseDown={() => applyStreetSuggestion(item)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>

            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                Дом
              </span>
              <input
                name="house"
                value={checkout.deliveryAddress.house}
                onChange={handleDeliveryAddressChange}
                placeholder="Например: 25"
                className={`form-control ${
                  showAddressFieldErrors && isHouseMissing
                    ? "border-red-500 ring-2 ring-red-200"
                    : ""
                }`}
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                Квартира
              </span>
              <input
                name="apartment"
                value={checkout.deliveryAddress.apartment}
                onChange={handleDeliveryAddressChange}
                placeholder="Опционально"
                className="form-control"
              />
            </label>
          </div>

          <label
            className="checkbox-card"
            data-checked={checkout.deliveryAddressConfirmed}
            aria-disabled={!isDeliveryAddressRequiredFilled}
            onClick={(event) => {
              if (isDeliveryAddressRequiredFilled) return;
              event.preventDefault();
              triggerRequiredAddressValidation();
            }}
          >
            <input
              type="checkbox"
              checked={checkout.deliveryAddressConfirmed}
              disabled={!isDeliveryAddressRequiredFilled}
              onChange={(event) => {
                if (!isDeliveryAddressRequiredFilled) return;
                dispatch(setDeliveryAddressConfirmed(event.target.checked));
                if (event.target.checked) {
                  setDeliveryError("");
                  setAddressValidationError("");
                  setShowAddressFieldErrors(false);
                }
              }}
            />
            <span className="font-medium">Я ознакомился(ась) с адресом доставки</span>
          </label>
          {!isDeliveryAddressRequiredFilled && (
            <p className="text-xs text-amber-700">
              Чтобы подтвердить адрес, заполните обязательные поля: город, улица и дом.
            </p>
          )}
          {addressValidationError && (
            <p className="text-xs text-rose-600">{addressValidationError}</p>
          )}

          {suggestionsError && (
            <p className="text-xs text-amber-600">{suggestionsError}</p>
          )}

          <label className="space-y-1 block">
            <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
              Комментарий курьеру
            </span>
            <textarea
              name="comment"
              value={checkout.deliveryAddress.comment}
              onChange={handleDeliveryAddressChange}
              placeholder="Код домофона, ориентир и т.п."
              className="form-control min-h-[88px] resize-y"
            />
          </label>

          <DeliveryMapPicker
            mode="delivery"
            city={checkout.deliveryAddress.city}
            street={checkout.deliveryAddress.street}
            house={checkout.deliveryAddress.house}
            originPoint={checkoutSettings.originPoint}
            pickupPoint={checkoutSettings.pickupPoint}
            refreshSignal={routeRefreshSignal}
            onAddressPicked={handleMapAddressPicked}
            onRouteStatsChange={handleRouteStatsChange}
          />

          <div className="rounded-xl border p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <p className="text-sm text-slate-700 sm:pr-4">
                Стоимость можно подставить автоматически по маршруту. При
                необходимости скорректируйте вручную.
              </p>
              <button
                type="button"
                onClick={handleApplyYandexDelivery}
                className="btn-primary shrink-0 whitespace-nowrap sm:self-start"
              >
                Добавить доставку к заказу
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={yandexGoRouteHref}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
              >
                Проверить на Яндекс Гоу
              </a>
              <input
                inputMode="decimal"
                value={deliveryAmountInput}
                onChange={(event) => {
                  setIsDeliveryAmountManual(true);
                  setDeliveryAmountInput(event.target.value);
                }}
                placeholder="Стоимость доставки, ₽"
                className="form-control sm:max-w-[240px]"
              />
            </div>

            {deliveryError && <p className="text-sm text-red-500">{deliveryError}</p>}
            {minRouteAmountRub && (
              <p className="text-xs text-slate-600">
                Минимальная стоимость по маршруту Яндекс: {minRouteAmountRub.toFixed(2)} ₽
              </p>
            )}
            {routeAutoPriceNote && (
              <p className="text-xs text-emerald-600">{routeAutoPriceNote}</p>
            )}

            {hasDeliveryQuote && checkout.deliveryQuote && (
              <div className="rounded-lg border p-3 bg-slate-50/60 dark:bg-slate-900/40">
                <p className="text-sm text-slate-700">
                  Доставка добавлена:{" "}
                  <span className="font-semibold text-slate-900">
                    {checkout.deliveryQuote.amount.toFixed(2)} ₽
                  </span>{" "}
                  (Яндекс Go)
                </p>
                <button
                  type="button"
                  className="btn-danger-soft mt-2"
                  onClick={() => setCancelModalOpen(true)}
                >
                  Отменить доставку
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={cancelModalOpen}
        title="Отменить доставку?"
        description="Стоимость доставки будет убрана из заказа, и способ получения переключится на самовывоз."
        confirmText="Отменить доставку"
        cancelText="Назад"
        onConfirm={confirmCancelDelivery}
        onCancel={() => setCancelModalOpen(false)}
      />
    </div>
  );
}
