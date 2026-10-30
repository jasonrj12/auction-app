import useNow from '../hooks/useNow';
import { countdown, isNearEnd } from '../lib/format';

/**
 * Live countdown component that updates every second.
 * Emphasizes amber styling when less than 5 minutes remain.
 */
export default function Countdown({ endsAt, className = '' }) {
  useNow(1000); // re-renders on second tick

  const text = countdown(endsAt);
  const near = isNearEnd(endsAt);

  if (text === 'Ended') {
    return <span className={`text-slate-500 font-medium ${className}`}>Ended</span>;
  }

  return (
    <span
      className={`font-semibold tabular-nums ${
        near ? 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md inline-block animate-pulse' : 'text-slate-700'
      } ${className}`}
    >
      {text}
    </span>
  );
}
