import { z } from 'zod';
import { UserRole, VehicleType, PreferredLanguage } from '../enums/index.js';

// ── Primitives ───────────────────────────────────────────────────────────────

export const UUIDSchema = z.string().uuid();

export const E164PhoneSchema = z
  .string()
  .regex(/^\+1[2-9]\d{9}$/, 'Must be a valid US E.164 phone number (+1XXXXXXXXXX)');

export const CentsSchema = z.number().int().nonnegative();

export const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const USStateCodeSchema = z.string().length(2).toUpperCase();

// ── Auth ─────────────────────────────────────────────────────────────────────

export const SignUpWithPhoneSchema = z.object({
  phone: E164PhoneSchema,
  preferredLanguage: z.nativeEnum(PreferredLanguage).default(PreferredLanguage.EN),
});

export const SignUpWithEmailSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(64).trim(),
  lastName: z.string().min(1).max(64).trim(),
  preferredLanguage: z.nativeEnum(PreferredLanguage).default(PreferredLanguage.EN),
});

export const OtpVerifySchema = z.object({
  phone: E164PhoneSchema,
  code: z.string().length(6).regex(/^\d+$/),
});

// ── Address ──────────────────────────────────────────────────────────────────

export const AddressSchema = z.object({
  label: z.string().max(64).optional(),
  line1: z.string().min(1).max(256),
  line2: z.string().max(128).optional(),
  city: z.string().min(1).max(128),
  state: USStateCodeSchema,
  zip: z.string().regex(/^\d{5}(-\d{4})?$/),
  deliveryInstructions: z.string().max(512).optional(),
  location: GeoPointSchema,
});

// ── Restaurant ────────────────────────────────────────────────────────────────

export const RestaurantSearchSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().int().min(100).max(50_000).default(8_047), // 5 miles
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  query: z.string().max(128).optional(),
  cuisineTags: z.array(z.string()).optional(),
  openNow: z.boolean().optional(),
  minRating: z.number().min(0).max(5).optional(),
});

// ── Menu item ────────────────────────────────────────────────────────────────

export const MenuItemNoteSchema = z.string().max(256);

export const CartItemSchema = z.object({
  menuItemId: UUIDSchema,
  qty: z.number().int().min(1).max(99),
  selectedModifiers: z.array(UUIDSchema),
  note: MenuItemNoteSchema.optional(),
});

export const CartSchema = z.object({
  restaurantId: UUIDSchema,
  items: z.array(CartItemSchema).min(1).max(50),
  promoCode: z.string().max(32).optional(),
  scheduledFor: z.string().datetime().optional(),
});

// ── Courier onboarding ───────────────────────────────────────────────────────

export const CourierOnboardingStep1Schema = z.object({
  cityId: UUIDSchema,
  vehicleType: z.nativeEnum(VehicleType),
});

// ── Chat ─────────────────────────────────────────────────────────────────────

export const ChatSendSchema = z.object({
  threadId: UUIDSchema,
  text: z.string().min(1).max(500),
  clientMsgId: z.string().uuid(),
});

// ── Pagination helper ────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Type exports ─────────────────────────────────────────────────────────────

export type SignUpWithPhoneDto = z.infer<typeof SignUpWithPhoneSchema>;
export type SignUpWithEmailDto = z.infer<typeof SignUpWithEmailSchema>;
export type OtpVerifyDto = z.infer<typeof OtpVerifySchema>;
export type AddressDto = z.infer<typeof AddressSchema>;
export type RestaurantSearchDto = z.infer<typeof RestaurantSearchSchema>;
export type CartDto = z.infer<typeof CartSchema>;
export type CartItemDto = z.infer<typeof CartItemSchema>;
export type ChatSendDto = z.infer<typeof ChatSendSchema>;
export type CourierOnboardingStep1Dto = z.infer<typeof CourierOnboardingStep1Schema>;
