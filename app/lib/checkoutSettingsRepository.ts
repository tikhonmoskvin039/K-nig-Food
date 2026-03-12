import checkoutData from "../../configs/checkout.json";
import type {
  CheckoutPoint,
  CheckoutSettings,
} from "../types/checkoutSettings";
import { getPrismaClient } from "./prisma";

const CHECKOUT_SETTINGS_ID = "default";
const DEFAULT_COORDINATES = {
  lat: 54.7384,
  lng: 20.4713,
};
const LEGACY_DEFAULT_COORDINATES = {
  lat: 54.7257,
  lng: 20.4729,
};

type CheckoutSettingsConfig = Partial<CheckoutSettings> & {
  originPoint?: Partial<CheckoutPoint>;
  pickupPoint?: Partial<CheckoutPoint>;
};

type CheckoutSettingsRow = {
  deliveryEnabled: boolean;
  originLabel: string;
  originQuery: string;
  originLat: number;
  originLng: number;
  pickupLabel: string;
  pickupQuery: string;
  pickupLat: number;
  pickupLng: number;
};

type CheckoutSettingsMutationPayload = {
  deliveryEnabled: boolean;
  originLabel: string;
  originQuery: string;
  originLat: number;
  originLng: number;
  pickupLabel: string;
  pickupQuery: string;
  pickupLat: number;
  pickupLng: number;
};

type CheckoutSettingsDelegate = {
  findUnique: (args: { where: { id: string } }) => Promise<CheckoutSettingsRow | null>;
  upsert: (args: {
    where: { id: string };
    update: CheckoutSettingsMutationPayload;
    create: CheckoutSettingsMutationPayload & { id: string };
  }) => Promise<CheckoutSettingsRow>;
};

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function getCheckoutSettingsDelegate(prismaClient: unknown): CheckoutSettingsDelegate | null {
  if (!prismaClient || typeof prismaClient !== "object") {
    return null;
  }

  const candidate = (prismaClient as Record<string, unknown>).checkoutSettings;
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const delegate = candidate as Record<string, unknown>;
  if (
    typeof delegate.findUnique !== "function" ||
    typeof delegate.upsert !== "function"
  ) {
    return null;
  }

  return candidate as CheckoutSettingsDelegate;
}

function toNonEmptyString(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function toFiniteNumber(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizePoint(
  value: Partial<CheckoutPoint> | undefined,
  fallback: CheckoutPoint,
): CheckoutPoint {
  const label = toNonEmptyString(value?.label, fallback.label);
  const query = toNonEmptyString(value?.query, fallback.query);
  let lat = toFiniteNumber(value?.lat, fallback.lat);
  let lng = toFiniteNumber(value?.lng, fallback.lng);

  const normalizedAddress = `${label} ${query}`.toLowerCase();
  const isKnownRedAddress =
    normalizedAddress.includes("красная") &&
    normalizedAddress.includes("139");
  const isLegacyCoordinatePair =
    Math.abs(lat - LEGACY_DEFAULT_COORDINATES.lat) < 0.0002 &&
    Math.abs(lng - LEGACY_DEFAULT_COORDINATES.lng) < 0.0002;
  const isFarFromKnownPoint =
    Math.abs(lat - DEFAULT_COORDINATES.lat) > 0.002 ||
    Math.abs(lng - DEFAULT_COORDINATES.lng) > 0.002;

  if (isKnownRedAddress && (isLegacyCoordinatePair || isFarFromKnownPoint)) {
    lat = DEFAULT_COORDINATES.lat;
    lng = DEFAULT_COORDINATES.lng;
  }

  return {
    label,
    query,
    lat,
    lng,
  };
}

function normalizeCheckoutFallback(): CheckoutSettings {
  const config = checkoutData as CheckoutSettingsConfig;
  const fallbackOrigin = normalizePoint(config.originPoint, {
    label: "Кухня K-nig Food, Калининград, Красная 139Б",
    query: "Калининград, Красная 139Б",
    ...DEFAULT_COORDINATES,
  });
  const fallbackPickup = normalizePoint(config.pickupPoint, {
    label: "Калининград, Красная 139Б",
    query: "Калининград, Красная 139Б",
    ...DEFAULT_COORDINATES,
  });

  return {
    paymentMethods: Array.isArray(config.paymentMethods)
      ? config.paymentMethods.filter(
          (method): method is CheckoutSettings["paymentMethods"][number] =>
            Boolean(
              method &&
                typeof method.id === "string" &&
                typeof method.name === "string" &&
                typeof method.enabled === "boolean" &&
                typeof method.icon === "string",
            ),
        )
      : [],
    deliveryEnabled:
      typeof config.deliveryEnabled === "boolean" ? config.deliveryEnabled : true,
    originPoint: fallbackOrigin,
    pickupPoint: fallbackPickup,
  };
}

export async function getCheckoutSettingsState(): Promise<CheckoutSettings> {
  const fallback = normalizeCheckoutFallback();

  if (!isDatabaseConfigured()) {
    return fallback;
  }

  try {
    const prisma = getPrismaClient();
    const delegate = getCheckoutSettingsDelegate(prisma);
    if (!delegate) {
      console.warn(
        "Checkout settings delegate is missing in Prisma client. Falling back to configs/checkout.json.",
      );
      return fallback;
    }

    const row = await delegate.findUnique({
      where: { id: CHECKOUT_SETTINGS_ID },
    });

    if (!row) {
      return fallback;
    }

    return {
      paymentMethods: fallback.paymentMethods,
      deliveryEnabled: row.deliveryEnabled,
      originPoint: normalizePoint(
        {
          label: row.originLabel,
          query: row.originQuery,
          lat: row.originLat,
          lng: row.originLng,
        },
        fallback.originPoint,
      ),
      pickupPoint: normalizePoint(
        {
          label: row.pickupLabel,
          query: row.pickupQuery,
          lat: row.pickupLat,
          lng: row.pickupLng,
        },
        fallback.pickupPoint,
      ),
    };
  } catch (error) {
    console.error("Failed to read checkout settings from DB:", error);
    return fallback;
  }
}

export async function saveCheckoutSettingsState(
  nextState: Omit<CheckoutSettings, "paymentMethods">,
): Promise<CheckoutSettings> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const fallback = normalizeCheckoutFallback();
  const normalizedOrigin = normalizePoint(nextState.originPoint, fallback.originPoint);
  const normalizedPickup = normalizePoint(nextState.pickupPoint, fallback.pickupPoint);

  const prisma = getPrismaClient();
  const delegate = getCheckoutSettingsDelegate(prisma);
  if (!delegate) {
    throw new Error(
      "Prisma client is outdated: checkoutSettings model delegate is missing. Run `npx prisma generate` and restart the server.",
    );
  }

  const mutationPayload: CheckoutSettingsMutationPayload = {
    deliveryEnabled: Boolean(nextState.deliveryEnabled),
    originLabel: normalizedOrigin.label,
    originQuery: normalizedOrigin.query,
    originLat: normalizedOrigin.lat,
    originLng: normalizedOrigin.lng,
    pickupLabel: normalizedPickup.label,
    pickupQuery: normalizedPickup.query,
    pickupLat: normalizedPickup.lat,
    pickupLng: normalizedPickup.lng,
  };

  const row = await delegate.upsert({
    where: { id: CHECKOUT_SETTINGS_ID },
    update: mutationPayload,
    create: {
      id: CHECKOUT_SETTINGS_ID,
      ...mutationPayload,
    },
  });

  return {
    paymentMethods: fallback.paymentMethods,
    deliveryEnabled: row.deliveryEnabled,
    originPoint: {
      label: row.originLabel,
      query: row.originQuery,
      lat: row.originLat,
      lng: row.originLng,
    },
    pickupPoint: {
      label: row.pickupLabel,
      query: row.pickupQuery,
      lat: row.pickupLat,
      lng: row.pickupLng,
    },
  };
}
