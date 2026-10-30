const currency = import.meta.env.VITE_CURRENCY || 'LKR';

/** Format a number as the configured currency */
export function fmt(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return `${currency} 0`;
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Number(amount).toLocaleString()}`;
  }
}

/** Return a human-readable countdown string from a Firestore Timestamp or Date */
export function countdown(endsAt) {
  if (!endsAt) return '';
  const end = endsAt.toDate ? endsAt.toDate() : new Date(endsAt);
  const diff = end.getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

/** True when endsAt is within 5 minutes and not yet ended */
export function isNearEnd(endsAt) {
  if (!endsAt) return false;
  const end = endsAt.toDate ? endsAt.toDate() : new Date(endsAt);
  const diff = end.getTime() - Date.now();
  return diff > 0 && diff <= 5 * 60 * 1000;
}
