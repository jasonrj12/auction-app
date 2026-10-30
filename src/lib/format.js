const currency = import.meta.env.VITE_CURRENCY || 'Chips';

/** Format a number as Chips (e.g. "15,000 Chips") without emojis */
export function fmtChips(amount, includeUnit = true) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return includeUnit ? '0 Chips' : '0';
  }
  const formatted = new Intl.NumberFormat('en-US').format(Math.round(amount));
  return includeUnit ? `${formatted} Chips` : formatted;
}

/** Short chips notation (e.g. 50K, 1.2M) */
export function fmtChipsCompact(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return '0';
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return amount.toString();
}

/** Format a number as the configured currency or chips */
export function fmt(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0 Chips';
  }
  return fmtChips(amount);
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
