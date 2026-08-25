import { useCallback, useEffect, useRef, useState } from 'react';
import { lockSeats, releaseSeats } from '../services/bookings';

interface SeatLockState {
  locked: boolean;
  secondsLeft: number;
  expired: boolean;
  locking: boolean;
  error: string | null;
  hold: (args: {userId: number;tripId: number;seatIds: number[];}) => Promise<boolean>;
  release: () => void;
  reset: () => void;
}

/** Ten-minute temporary hold with a live countdown, mirroring the SeatLock table. */
export function useSeatLock(): SeatLockState {
  const [locked, setLocked] = useState(false);
  const [expired, setExpired] = useState(false);
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const heldSeats = useRef<number[]>([]);

  useEffect(() => {
    if (!locked) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setLocked(false);
          setExpired(true);
          if (heldSeats.current.length > 0) {
            releaseSeats(heldSeats.current).catch(() => undefined);
            heldSeats.current = [];
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [locked]);

  const hold = useCallback(async ({ userId, tripId, seatIds }: {userId: number;tripId: number;seatIds: number[];}) => {
    setLocking(true);
    setError(null);
    try {
      const response = await lockSeats({ user_id: userId, trip_id: tripId, seat_ids: seatIds });
      heldSeats.current = seatIds;
      const seconds = Math.max(0, Math.round((new Date(response.expires_at).getTime() - Date.now()) / 1000));
      setSecondsLeft(seconds);
      setExpired(false);
      setLocked(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Those seats could not be held.');
      return false;
    } finally {
      setLocking(false);
    }
  }, []);

  const release = useCallback(() => {
    if (heldSeats.current.length > 0) {
      releaseSeats(heldSeats.current).catch(() => undefined);
      heldSeats.current = [];
    }
    setLocked(false);
    setSecondsLeft(0);
  }, []);

  const reset = useCallback(() => {
    heldSeats.current = [];
    setLocked(false);
    setExpired(false);
    setSecondsLeft(0);
    setError(null);
  }, []);

  return { locked, secondsLeft, expired, locking, error, hold, release, reset };
}