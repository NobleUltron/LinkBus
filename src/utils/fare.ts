import type { PromoCode, SeatClass } from '../types/models';

export const VIP_MULTIPLIER = 1.0;

export interface FareSeat {
  seat_class: SeatClass;
  fare: number;
}

export interface FareBreakdown {
  subtotal: number;
  discount: number;
  amountAfterDiscount: number;
  taxAmount: number;
  total: number;
}

/** subtotal = Σ fare across outbound + return seats. */
export function seatFare(fare: number, _seatClass?: SeatClass): number {
  return fare;
}

export function calculateFare(seats: FareSeat[], discount: number, taxRate: number): FareBreakdown {
  const subtotal = seats.reduce((sum, seat) => sum + seatFare(seat.fare, seat.seat_class), 0);
  const safeDiscount = Number.isFinite(discount) ? Math.max(0, discount) : 0;
  const amountAfterDiscount = Math.max(0, subtotal - safeDiscount);
  const taxAmount = Math.round(amountAfterDiscount * taxRate / 100);
  return {
    subtotal,
    discount: Math.min(safeDiscount, subtotal),
    amountAfterDiscount,
    taxAmount,
    total: amountAfterDiscount + taxAmount
  };
}

export function cancellationFee(totalAmount: number, feePercentage: number): number {
  return Math.round(totalAmount * feePercentage) / 100;
}

export function changeDue(amountPaid: number, total: number): number {
  return amountPaid - total;
}

export type PromoFailure =
'not_found' |
'inactive' |
'expired' |
'max_uses' |
'min_amount';

export const promoFailureMessage: Record<PromoFailure, string> = {
  not_found: 'That promo code does not exist. Check the spelling and try again.',
  inactive: 'This promo code has been deactivated.',
  expired: 'This promo code expired.',
  max_uses: 'This promo code has reached its usage limit.',
  min_amount: 'Your booking total is below the minimum for this code.'
};

export interface PromoResult {
  ok: boolean;
  failure?: PromoFailure;
  message: string;
  discount: number;
  code?: string;
  description?: string;
}

/** Mirrors the backend rules: exists, active, not expired, under max uses, meets minimum. */
export function validatePromo(promo: PromoCode | undefined, subtotal: number): PromoResult {
  if (!promo) return { ok: false, failure: 'not_found', message: promoFailureMessage.not_found, discount: 0 };
  if (!promo.is_active) return { ok: false, failure: 'inactive', message: promoFailureMessage.inactive, discount: 0 };
  if (new Date(promo.expires_at).getTime() < Date.now())
  return { ok: false, failure: 'expired', message: promoFailureMessage.expired, discount: 0 };
  if (promo.used_count >= promo.max_uses)
  return { ok: false, failure: 'max_uses', message: promoFailureMessage.max_uses, discount: 0 };
  if (subtotal < promo.min_booking_amount)
  return {
    ok: false,
    failure: 'min_amount',
    message: `Requires a subtotal of at least ${promo.min_booking_amount.toLocaleString()}.`,
    discount: 0
  };

  const discount =
  promo.discount_type === 'percentage' ?
  Math.round(subtotal * promo.discount_value / 100) :
  promo.discount_value;

  return {
    ok: true,
    message: `${promo.code} applied.`,
    discount: Math.min(discount, subtotal),
    code: promo.code,
    description: promo.description
  };
}