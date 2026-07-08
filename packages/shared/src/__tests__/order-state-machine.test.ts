import { describe, it, expect } from 'vitest';
import {
  OrderStatus,
  ORDER_STATUS_TRANSITIONS,
  TERMINAL_ORDER_STATUSES,
  isLegalTransition,
  assertLegalTransition,
} from '../enums/index.js';

describe('OrderStatus state machine', () => {
  describe('happy-path transitions', () => {
    const happyPath: OrderStatus[] = [
      OrderStatus.CREATED,
      OrderStatus.PAYMENT_AUTHORIZED,
      OrderStatus.SENT_TO_RESTAURANT,
      OrderStatus.ACCEPTED,
      OrderStatus.PREPARING,
      OrderStatus.READY_FOR_PICKUP,
      OrderStatus.COURIER_ASSIGNED,
      OrderStatus.COURIER_AT_RESTAURANT,
      OrderStatus.PICKED_UP,
      OrderStatus.EN_ROUTE,
      OrderStatus.ARRIVED,
      OrderStatus.DELIVERED,
      OrderStatus.COMPLETED,
    ];

    for (let i = 0; i < happyPath.length - 1; i++) {
      const from = happyPath[i]!;
      const to = happyPath[i + 1]!;
      it(`${from} → ${to} is legal`, () => {
        expect(isLegalTransition(from, to)).toBe(true);
      });
    }
  });

  describe('cancellation paths', () => {
    it('CREATED → CANCELLED_BY_CUSTOMER', () => {
      expect(isLegalTransition(OrderStatus.CREATED, OrderStatus.CANCELLED_BY_CUSTOMER)).toBe(true);
    });
    it('PAYMENT_AUTHORIZED → CANCELLED_BY_CUSTOMER', () => {
      expect(isLegalTransition(OrderStatus.PAYMENT_AUTHORIZED, OrderStatus.CANCELLED_BY_CUSTOMER)).toBe(true);
    });
    it('SENT_TO_RESTAURANT → REJECTED_BY_RESTAURANT', () => {
      expect(isLegalTransition(OrderStatus.SENT_TO_RESTAURANT, OrderStatus.REJECTED_BY_RESTAURANT)).toBe(true);
    });
    it('EN_ROUTE → UNDELIVERABLE', () => {
      expect(isLegalTransition(OrderStatus.EN_ROUTE, OrderStatus.UNDELIVERABLE)).toBe(true);
    });
    it('ARRIVED → UNDELIVERABLE', () => {
      expect(isLegalTransition(OrderStatus.ARRIVED, OrderStatus.UNDELIVERABLE)).toBe(true);
    });
    it('COURIER_ASSIGNED → READY_FOR_PICKUP (reassignment)', () => {
      expect(isLegalTransition(OrderStatus.COURIER_ASSIGNED, OrderStatus.READY_FOR_PICKUP)).toBe(true);
    });
  });

  describe('illegal transitions', () => {
    it('COMPLETED → CREATED is illegal', () => {
      expect(isLegalTransition(OrderStatus.COMPLETED, OrderStatus.CREATED)).toBe(false);
    });
    it('DELIVERED → CANCELLED_BY_CUSTOMER is illegal', () => {
      expect(isLegalTransition(OrderStatus.DELIVERED, OrderStatus.CANCELLED_BY_CUSTOMER)).toBe(false);
    });
    it('CREATED → DELIVERED is illegal (skipping steps)', () => {
      expect(isLegalTransition(OrderStatus.CREATED, OrderStatus.DELIVERED)).toBe(false);
    });
    it('PREPARING → CREATED is illegal (going backwards)', () => {
      expect(isLegalTransition(OrderStatus.PREPARING, OrderStatus.CREATED)).toBe(false);
    });
    it('CANCELLED_BY_OPS → PREPARING is illegal (from terminal)', () => {
      expect(isLegalTransition(OrderStatus.CANCELLED_BY_OPS, OrderStatus.PREPARING)).toBe(false);
    });
    it('REJECTED_BY_RESTAURANT → ACCEPTED is illegal (from terminal)', () => {
      expect(isLegalTransition(OrderStatus.REJECTED_BY_RESTAURANT, OrderStatus.ACCEPTED)).toBe(false);
    });
  });

  describe('terminal states have no outgoing transitions', () => {
    for (const status of TERMINAL_ORDER_STATUSES) {
      it(`${status} has no outgoing transitions`, () => {
        expect(ORDER_STATUS_TRANSITIONS[status]).toHaveLength(0);
      });
    }
  });

  describe('assertLegalTransition', () => {
    it('does not throw for a legal transition', () => {
      expect(() =>
        assertLegalTransition(OrderStatus.CREATED, OrderStatus.PAYMENT_AUTHORIZED),
      ).not.toThrow();
    });

    it('throws for an illegal transition', () => {
      expect(() =>
        assertLegalTransition(OrderStatus.COMPLETED, OrderStatus.CREATED),
      ).toThrow('Illegal order status transition');
    });

    it('throw message includes both statuses', () => {
      expect(() =>
        assertLegalTransition(OrderStatus.DELIVERED, OrderStatus.PREPARING),
      ).toThrow(/DELIVERED.*PREPARING/);
    });
  });

  describe('transition matrix completeness', () => {
    it('every OrderStatus has an entry in the transition matrix', () => {
      const allStatuses = Object.values(OrderStatus);
      for (const status of allStatuses) {
        expect(ORDER_STATUS_TRANSITIONS[status]).toBeDefined();
      }
    });
  });
});
