import { useEffect, useRef } from 'react';

export const useGameLoop = (callback: (deltaTime: number) => void, isRunning: boolean) => {
  // FIX: Explicitly initialize useRef with undefined to fix "Expected 1 arguments, but got 0" error.
  const requestRef = useRef<number | undefined>(undefined);
  // FIX: Explicitly initialize useRef with undefined to fix "Expected 1 arguments, but got 0" error.
  const previousTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const animate = (time: number) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;
        callback(deltaTime);
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    if (isRunning) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
        if(requestRef.current) {
            cancelAnimationFrame(requestRef.current);
            previousTimeRef.current = undefined;
        }
    }

    return () => {
      if(requestRef.current) {
          cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isRunning, callback]);
};
