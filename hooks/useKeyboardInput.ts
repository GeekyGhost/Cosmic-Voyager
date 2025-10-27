
import { useState, useEffect } from 'react';

export const useKeyboardInput = () => {
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setKeysPressed((prevKeys) => new Set(prevKeys).add(event.code));
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      setKeysPressed((prevKeys) => {
        const newKeys = new Set(prevKeys);
        newKeys.delete(event.code);
        return newKeys;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return keysPressed;
};
