import { useCallback, useEffect, useState } from 'react';
import { checkHealth } from '../services/api';

export type BackendHealth = 'checking' | 'online' | 'offline';

export function useBackend() {
  const [health, setHealth] = useState<BackendHealth>('checking');

  const refresh = useCallback(async () => {
    try {
      const result = await checkHealth(AbortSignal.timeout(5000));
      setHealth(result.status === 'ok' ? 'online' : 'offline');
    } catch {
      setHealth('offline');
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  return { health, refresh };
}
