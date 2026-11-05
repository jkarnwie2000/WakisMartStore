const formatters = {};

/** Formats an integer amount in cents, e.g. 1299 → "$12.99". */
export function formatPrice(cents, currency = 'usd') {
  const key = currency.toUpperCase();
  formatters[key] ||= new Intl.NumberFormat('en-US', { style: 'currency', currency: key });
  return formatters[key].format((cents || 0) / 100);
}

export function formatDate(value, withTime = false) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(withTime && { hour: 'numeric', minute: '2-digit' }),
  });
}

export const ORDER_STATUS_LABELS = {
  PENDING: 'Pending',
  PAID: 'Paid',
  PROCESSING: 'Processing',
  READY_FOR_PICKUP: 'Ready for Pickup',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const PAYMENT_STATUS_LABELS = { UNPAID: 'Awaiting payment', PAID: 'Paid', FAILED: 'Failed', REFUNDED: 'Refunded' };

export const AVAILABILITY_LABELS = {
  IN_STOCK: 'In stock',
  LOW_STOCK: 'Low stock',
  OUT_OF_STOCK: 'Out of stock',
  UNAVAILABLE: 'Unavailable',
};

export const ORIGIN_LABELS = { AFRICAN: 'African', CARIBBEAN: 'Caribbean', BOTH: 'African & Caribbean' };

export const pluralize = (n, word, plural = `${word}s`) => `${n} ${n === 1 ? word : plural}`;
