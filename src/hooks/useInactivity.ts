import { useState, useEffect, useCallback } from 'react';

interface UseInactivityReturn {
  resetInactivityTimer: () => void;
}

export const useInactivity = (
  timeoutMinutes: number = 1,
  onInactive: () => void
): UseInactivityReturn => {
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  const resetInactivityTimer = useCallback((): void => {
    setLastActivity(Date.now());
  }, []);

  useEffect(() => {
    const handleUserActivity = (): void => {
      resetInactivityTimer();
    };

    // Add event listeners for user activity
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    // Check for inactivity every 10 seconds
    const interval = setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - lastActivity;
      const inactiveTimeoutMs = timeoutMinutes * 60 * 1000;

      if (inactiveTime >= inactiveTimeoutMs) {
        onInactive();
      }
    }, 10000);

    return () => {
      // Clean up event listeners and interval
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      clearInterval(interval);
    };
  }, [lastActivity, timeoutMinutes, onInactive, resetInactivityTimer]);

  return { resetInactivityTimer };
};