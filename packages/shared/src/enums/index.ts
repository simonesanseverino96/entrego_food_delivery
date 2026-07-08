export enum UserRole {
  CUSTOMER = 'customer',
  COURIER = 'courier',
  RESTAURANT_ADMIN = 'restaurant_admin',
  OPS_ADMIN = 'ops_admin',
  SUPER_ADMIN = 'super_admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
  PENDING = 'pending',
}

export enum AuthProvider {
  PASSWORD = 'password',
  APPLE = 'apple',
  GOOGLE = 'google',
  PHONE = 'phone',
}

export enum PreferredLanguage {
  EN = 'en',
  ES = 'es',
}

export enum VehicleType {
  CAR = 'car',
  SCOOTER = 'scooter',
  BIKE = 'bike',
  WALK = 'walk',
}

export enum BackgroundCheckStatus {
  NOT_STARTED = 'not_started',
  PENDING = 'pending',
  CONSIDER = 'consider',
  CLEAR = 'clear',
  FAILED = 'failed',
}

export enum W9Status {
  MISSING = 'missing',
  SUBMITTED = 'submitted',
  VERIFIED = 'verified',
}

export enum MinPayRule {
  NONE = 'none',
  NYC = 'nyc',
  CA_PROP22 = 'ca_prop22',
  SEATTLE = 'seattle',
}

export enum DropoffType {
  HAND_TO_ME = 'hand_to_me',
  LEAVE_AT_DOOR = 'leave_at_door',
}

export enum DispatchEventType {
  OFFERED = 'offered',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  TIMEOUT = 'timeout',
  REASSIGNED = 'reassigned',
}

export enum CourierEarningType {
  BASE = 'base',
  DISTANCE = 'distance',
  TIME = 'time',
  TIP = 'tip',
  INCENTIVE = 'incentive',
  ADJUSTMENT = 'adjustment',
  MIN_PAY_TOPUP = 'min_pay_topup',
}

export enum PayoutPeriodStatus {
  OPEN = 'open',
  PROCESSING = 'processing',
  PAID = 'paid',
}

export enum ChatSenderType {
  CUSTOMER = 'customer',
  COURIER = 'courier',
  SUPPORT = 'support',
  SYSTEM = 'system',
}

export enum PromoType {
  PCT = 'pct',
  FIXED = 'fixed',
  FREE_DELIVERY = 'free_delivery',
}

export enum RefundStatus {
  REQUESTED = 'requested',
  AUTO_APPROVED = 'auto_approved',
  APPROVED = 'approved',
  DENIED = 'denied',
}

export enum RefundReason {
  MISSING_ITEM = 'missing_item',
  WRONG_ITEM = 'wrong_item',
  QUALITY = 'quality',
  LATE = 'late',
  NEVER_ARRIVED = 'never_arrived',
  OTHER = 'other',
}

export enum ConsentType {
  TOS = 'tos',
  PRIVACY = 'privacy',
  BACKGROUND_CHECK_FCRA = 'background_check_fcra',
  SMS_TCPA = 'sms_tcpa',
  LOCATION_BG = 'location_bg',
}

export enum TaxDocumentType {
  W9 = 'w9',
  FORM_1099_NEC = '1099nec',
  FORM_1099_K = '1099k',
}

/**
 * Full order state machine — every state is here.
 * Legal transitions are enforced by ORDER_STATUS_TRANSITIONS below.
 */
export enum OrderStatus {
  CREATED = 'CREATED',
  PAYMENT_AUTHORIZED = 'PAYMENT_AUTHORIZED',
  SENT_TO_RESTAURANT = 'SENT_TO_RESTAURANT',
  ACCEPTED = 'ACCEPTED',
  PREPARING = 'PREPARING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  COURIER_ASSIGNED = 'COURIER_ASSIGNED',
  COURIER_AT_RESTAURANT = 'COURIER_AT_RESTAURANT',
  PICKED_UP = 'PICKED_UP',
  EN_ROUTE = 'EN_ROUTE',
  ARRIVED = 'ARRIVED',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  REJECTED_BY_RESTAURANT = 'REJECTED_BY_RESTAURANT',
  CANCELLED_BY_CUSTOMER = 'CANCELLED_BY_CUSTOMER',
  CANCELLED_BY_OPS = 'CANCELLED_BY_OPS',
  UNDELIVERABLE = 'UNDELIVERABLE',
}

export const TERMINAL_ORDER_STATUSES = new Set<OrderStatus>([
  OrderStatus.COMPLETED,
  OrderStatus.REJECTED_BY_RESTAURANT,
  OrderStatus.CANCELLED_BY_CUSTOMER,
  OrderStatus.CANCELLED_BY_OPS,
  OrderStatus.UNDELIVERABLE,
]);

/**
 * Canonical transition matrix — only these moves are legal.
 * Server enforces this; any illegal transition must throw.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.CREATED]: [
    OrderStatus.PAYMENT_AUTHORIZED,
    OrderStatus.CANCELLED_BY_CUSTOMER,
  ],
  [OrderStatus.PAYMENT_AUTHORIZED]: [
    OrderStatus.SENT_TO_RESTAURANT,
    OrderStatus.CANCELLED_BY_CUSTOMER,
    OrderStatus.CANCELLED_BY_OPS,
  ],
  [OrderStatus.SENT_TO_RESTAURANT]: [
    OrderStatus.ACCEPTED,
    OrderStatus.REJECTED_BY_RESTAURANT,
    OrderStatus.CANCELLED_BY_OPS,
  ],
  [OrderStatus.ACCEPTED]: [
    OrderStatus.PREPARING,
    OrderStatus.CANCELLED_BY_OPS,
    OrderStatus.CANCELLED_BY_CUSTOMER,
  ],
  [OrderStatus.PREPARING]: [
    OrderStatus.READY_FOR_PICKUP,
    OrderStatus.CANCELLED_BY_OPS,
  ],
  [OrderStatus.READY_FOR_PICKUP]: [
    OrderStatus.COURIER_ASSIGNED,
    OrderStatus.CANCELLED_BY_OPS,
  ],
  [OrderStatus.COURIER_ASSIGNED]: [
    OrderStatus.COURIER_AT_RESTAURANT,
    OrderStatus.READY_FOR_PICKUP, // reassignment: courier returns order to pool
    OrderStatus.CANCELLED_BY_OPS,
  ],
  [OrderStatus.COURIER_AT_RESTAURANT]: [
    OrderStatus.PICKED_UP,
    OrderStatus.CANCELLED_BY_OPS,
  ],
  [OrderStatus.PICKED_UP]: [
    OrderStatus.EN_ROUTE,
    OrderStatus.UNDELIVERABLE,
    OrderStatus.CANCELLED_BY_OPS,
  ],
  [OrderStatus.EN_ROUTE]: [
    OrderStatus.ARRIVED,
    OrderStatus.UNDELIVERABLE,
  ],
  [OrderStatus.ARRIVED]: [
    OrderStatus.DELIVERED,
    OrderStatus.UNDELIVERABLE,
  ],
  [OrderStatus.DELIVERED]: [
    OrderStatus.COMPLETED,
  ],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.REJECTED_BY_RESTAURANT]: [],
  [OrderStatus.CANCELLED_BY_CUSTOMER]: [],
  [OrderStatus.CANCELLED_BY_OPS]: [],
  [OrderStatus.UNDELIVERABLE]: [],
};

export function isLegalTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export function assertLegalTransition(from: OrderStatus, to: OrderStatus): void {
  if (!isLegalTransition(from, to)) {
    throw new Error(
      `Illegal order status transition: ${from} → ${to}`,
    );
  }
}
