import { useEffect, useRef, useCallback } from 'react';

interface UseIdleTimerOptions {
  timeout?: number; // milliseconds
  onIdle: () => void;
  enabled?: boolean;
}

export function useIdleTimer({ timeout = 300_000, onIdle, enabled = true }: UseIdleTimerOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onIdleRef = useRef(onIdle);

  // Keep the callback fresh
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (enabled) {
      timerRef.current = setTimeout(() => {
        onIdleRef.current();
      }, timeout);
    }
  }, [enabled, timeout]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click'];

    const handleActivity = () => {
      resetTimer();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    resetTimer();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [enabled, resetTimer]);

  return { resetTimer };
}
