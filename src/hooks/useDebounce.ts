"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_DELAY = 500;

export function useDebounce<T>(
  value: T,
  delay: number = DEFAULT_DELAY,
  onDebouncedChange?: (debouncedValue: T) => void,
) {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  const debouncedValueRef = useRef(value);

  const onDebouncedChangeRef = useRef(onDebouncedChange);

  useEffect(() => {
    onDebouncedChangeRef.current = onDebouncedChange;
  }, [onDebouncedChange]);

  useEffect(() => {
    if (Object.is(debouncedValueRef.current, value)) {
      return;
    }

    const timeout = setTimeout(
      () => {
        debouncedValueRef.current = value;
        setDebouncedValue(value);
        onDebouncedChangeRef.current?.(value);
      },
      Math.max(0, delay),
    );
    return () => {
      window.clearTimeout(timeout);
    };
  }, [value, delay]);

  return debouncedValue;
}
