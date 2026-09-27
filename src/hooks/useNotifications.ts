import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GreenApiError } from '../api/greenApi';
import type { GreenApiClient } from '../api/greenApi';
import { isAbortError } from '../utils/isAbortError';
import { mapIncomingNotification } from '../api/mappers/mapIncomingNotification';
import type { IncomingMessage } from '../api/mappers/mapIncomingNotification';

interface PollingFailure {
  operation: 'receive' | 'process' | 'delete';
  status?: number;
  message: string;
}

interface UseNotificationsOptions {
  api: Pick<GreenApiClient, 'receiveNotification' | 'deleteNotification'> | null;
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
  const [failure, setFailure] = useState<PollingFailure | null>(null);
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

      await previousWorker;
      if (signal.aborted || !api) return;

      setError(null);
      setFailure(null);
      let consecutiveFailures = 0;

      while (!signal.aborted) {
        let operation: PollingFailure['operation'] = 'receive';

        try {
          const notification = await api.receiveNotification(20, signal);
          if (signal.aborted) return;

          if (notification !== null) {
            try {
              operation = 'process';
              const incoming = mapIncomingNotification(notification.body);
              if (incoming) await callback.current(incoming);
            } finally {

              if (!signal.aborted) {
                operation = 'delete';
                await api.deleteNotification(notification.receiptId, signal);
                operation = 'process';
              }
            }
          }

          if (signal.aborted) return;

          consecutiveFailures = 0;
          setFailure(null);
          setError(null);
        } catch (cause) {
          if (signal.aborted) return;

          if (isAbortError(cause)) {

            await waitForRetry(signal);
            continue;
          }

          const apiError = cause instanceof GreenApiError ? cause : null;
          consecutiveFailures += 1;
          setFailure({
            operation,
            status: apiError?.status,
            message: apiError ? apiError.message : 'Ошибка обработки уведомления',
          });

          if (consecutiveFailures >= 2) {
            setError('Проблема с получением новых сообщений. Повторное подключение...');
          }

          await waitForRetry(signal);
        }
      }
    }

    worker.current = poll();

    return () => {
      controller.abort();
      if (activeController.current === controller) activeController.current = null;
    };
  }, [api, enabled]);

  return {
    error: enabled ? error : null,
    failure: enabled ? failure : null,
    stop,
  };
}
