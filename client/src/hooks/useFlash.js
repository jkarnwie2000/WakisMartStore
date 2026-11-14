import { useCallback, useEffect, useRef, useState } from 'react';

/** Returns [isOn, trigger]: trigger() turns the flag on for `ms`, e.g. to show "✓ Added" on a button. */
export function useFlash(ms = 1600) {
  const [on, setOn] = useState(false);
  const timer = useRef(null);
  useEffect(() => {
    return () => clearTimeout(timer.current);
  }, []);
  const trigger = useCallback(() => {
    clearTimeout(timer.current);
    setOn(true);
    timer.current = setTimeout(() => setOn(false), ms);
  }, [ms]);
  return [on, trigger];
}
