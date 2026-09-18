import { useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [stored, setStored] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    const next = value instanceof Function ? value(stored) : value;
    setStored(next);
    localStorage.setItem(key, JSON.stringify(next));
  };

  return [stored, setValue] as const;
}
