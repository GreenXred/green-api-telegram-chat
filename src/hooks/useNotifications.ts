import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { GreenApiClient } from '../api/greenApi';
import { mapIncomingNotification } from '../api/mappers/mapIncomingNotification';
import type { IncomingMessage } from '../api/mappers/mapIncomingNotification';

interface UseNotificationsOptions {
  api: Pick<
    GreenApiClient,
    'receiveNotification' | 'deleteNotification'
  > | null;
  enabled: boolean;
  onIncomingMessage: (incoming: IncomingMessage) => void | Promise<void>;
}

function waitForRetry(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, 1500);
    signal.addEventListener('abort', finish, { once: true });
  });
}

export function useNotifications({
  api,
  enabled,
  onIncomingMessage,
}: UseNotificationsOptions) {
  const [error, setError] = useState<string | null>(null);
  const callback = useRef(onIncomingMessage);
  const activeController = useRef<AbortController | null>(null);
  const worker = useRef<Promise<void>>(Promise.resolve());

  useLayoutEffect(() => {
    callback.current = onIncomingMessage;
  }, [onIncomingMessage]);

  const stop = useCallback(() => {
    activeController.current?.abort();
  }, []);

  useEffect(() => {
    if (!enabled || !api) return;
    const controller = new AbortController();
    const { signal } = controller;
    activeController.current = controller;
    const previousWorker = worker.current;

    async function poll() {
      // Wait for cleanup of the previous client/StrictMode worker before receiving again.
      await previousWorker;
      if (signal.aborted || !api) return;
      setError(null);
      while (!signal.aborted) {
        try {
          const notification = await api.receiveNotification(20, signal);
          if (signal.aborted) return;
          setError(null);
          if (notification !== null) {
            try {
              const incoming = mapIncomingNotification(notification.body);
              if (incoming) await callback.current(incoming);
            } finally {
              // Includes unknown/non-text/other-chat notifications and callback errors.
              // On shutdown leave unacknowledged items in the queue for the next session.
              if (!signal.aborted)
                await api.deleteNotification(notification.receiptId, signal);
            }
          }
        } catch (cause) {
          if (
            signal.aborted ||
            (cause instanceof Error && cause.name === 'AbortError')
          )
            return;
          setError(
            'Проблема с получением новых сообщений. Повторное подключение...',
          );
          await waitForRetry(signal);
        }
      }
    }

    worker.current = poll();
    return () => {
      controller.abort();
      if (activeController.current === controller)
        activeController.current = null;
    };
  }, [api, enabled]);

  return { error: enabled ? error : null, stop };
}
