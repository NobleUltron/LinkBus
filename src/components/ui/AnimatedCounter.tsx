import React, { useEffect, useRef, useState } from 'react';
interface AnimatedCounterProps {
  value: number;
  format?: (value: number) => string;
  duration?: number;
}

/** Rolls from the previous value to the new one. Respects reduced-motion. */
export function AnimatedCounter({
  value,
  format,
  duration = 700
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = previous.current;
    previous.current = value;
    if (reduce || from === value) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  const rounded = Math.round(display);
  return <>{format ? format(rounded) : rounded.toLocaleString('en-US')}</>;
}