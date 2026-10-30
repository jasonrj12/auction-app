import { useState, useEffect } from 'react';

/** Returns the current Date, updated every intervalMs (default 1000ms). Used for countdowns. */
export default function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
    }, intervalMs);

    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
