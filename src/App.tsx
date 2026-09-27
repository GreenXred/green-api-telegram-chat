import { useEffect, useRef, useState } from 'react';
import type { SubmitEvent } from 'react';
import {
  createGreenApiClient,
  GreenApiError,
  validateTelegramSettings,
} from './api/greenApi';
import type { GetSettingsResponse } from './api/greenApi.types';
import styles from './App.module.scss';

type ConnectionState =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'success';
      settings: Pick<
        GetSettingsResponse,
        'wid' | 'typeInstance' | 'incomingWebhook'
      >;
      webhookConfigured: boolean;
      warnings: string[];
    };

function App() {
  const [connection, setConnection] = useState<ConnectionState>({
    status: 'idle',
  });
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => () => activeRequest.current?.abort(), []);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeRequest.current) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const credentials = {
      idInstance: String(data.get('idInstance') ?? ''),
      apiTokenInstance: String(data.get('apiTokenInstance') ?? ''),
    };
    form.reset();

    const controller = new AbortController();
    activeRequest.current = controller;
    setConnection({ status: 'loading' });

    try {
      const client = createGreenApiClient(credentials);
      const settings = await client.getSettings(controller.signal);
      const warnings = validateTelegramSettings(settings);
      if (controller.signal.aborted) return;

      setConnection({
        status: 'success',
        settings: {
          wid: settings.wid,
          typeInstance: settings.typeInstance,
          incomingWebhook: settings.incomingWebhook,
        },
        webhookConfigured: settings.webhookUrl !== '',
        warnings,
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      setConnection({
        status: 'error',
        message:
          error instanceof GreenApiError
            ? error.message
            : 'Не удалось проверить подключение к GREEN-API.',
      });
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }

  const loading = connection.status === 'loading';

  return (
    <main className={styles.page}>
      <h1>GREEN-API: проверка подключения</h1>
      <form onSubmit={handleSubmit} autoComplete="off" aria-busy={loading}>
        <fieldset className={styles.fields} disabled={loading}>
          <legend>Данные Telegram instance</legend>
          <label className={styles.field}>
            idInstance
            <input
              name="idInstance"
              type="text"
              required
              autoCapitalize="none"
              spellCheck={false}
            />
          </label>
          <label className={styles.field}>
            apiTokenInstance
            <input
              name="apiTokenInstance"
              type="password"
              required
              autoComplete="off"
            />
          </label>
          <button type="submit">Проверить подключение</button>
        </fieldset>
      </form>

      {loading && <p role="status">Проверяем подключение…</p>}
      {connection.status === 'error' && (
        <p role="alert">{connection.message}</p>
      )}
      {connection.status === 'success' && (
        <section className={styles.result} aria-label="Результат проверки">
          <p role="status">GREEN-API подключен</p>
          <dl>
            <dt>typeInstance</dt>
            <dd>{connection.settings.typeInstance}</dd>
            <dt>wid</dt>
            <dd>{connection.settings.wid || '—'}</dd>
            <dt>webhookUrl</dt>
            <dd>{connection.webhookConfigured ? 'настроен' : 'пустой'}</dd>
            <dt>incomingWebhook</dt>
            <dd>{connection.settings.incomingWebhook}</dd>
          </dl>
          {connection.warnings.length > 0 && (
            <div>
              <p>Предупреждения о настройках HTTP API (подключение успешно):</p>
              <ul>
                {connection.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default App;
