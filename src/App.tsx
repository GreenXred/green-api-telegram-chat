import { useEffect, useState } from 'react';
import { GreenApiError } from './api/greenApi';
import type { GreenApiCredentials } from './api/greenApi.types';
import { validateCredentials } from './api/validateCredentials';
import LoginForm from './components/LoginForm/LoginForm';
import {
  clearCredentials,
  readCredentials,
  saveCredentials,
} from './utils/credentialsStorage';
import styles from './App.module.scss';

function App() {
  const [credentials, setCredentials] = useState<GreenApiCredentials | null>(
    null,
  );
  const [restoring, setRestoring] = useState(true);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function restoreSession() {
      try {
        const stored = readCredentials();
        if (!stored) return;

        const diagnostics = await validateCredentials(
          stored,
          controller.signal,
        );
        if (controller.signal.aborted) return;

        setWarnings(diagnostics);
        setCredentials(stored);
      } catch {
        // StrictMode cleanup/unmount must not delete an otherwise valid session.
        if (!controller.signal.aborted) clearCredentials();
      } finally {
        if (!controller.signal.aborted) setRestoring(false);
      }
    }

    void restoreSession();
    return () => controller.abort();
  }, []);

  async function handleLogin(
    candidate: GreenApiCredentials,
    signal: AbortSignal,
  ): Promise<void> {
    const diagnostics = await validateCredentials(candidate, signal);
    if (signal.aborted) return;

    try {
      saveCredentials(candidate);
    } catch {
      throw new GreenApiError(
        'Не удалось сохранить сессию. Разрешите хранение данных сайта в браузере и повторите вход.',
      );
    }

    setWarnings(diagnostics);
    setCredentials(candidate);
  }

  function handleLogout() {
    clearCredentials();
    setCredentials(null);
    setWarnings([]);
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="app-title">
        <div className={styles.mark} aria-hidden="true">
          <svg viewBox="0 0 32 32" width="36" height="36" fill="none">
            <path
              d="m5 15 22-9-5 21-7-7-5 3 1-7 12-7-9 9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 id="app-title" className={styles.title}>
          Telegram Chat
        </h1>

        {restoring ? (
          <p className={styles.description} role="status">
            Восстанавливаем сессию...
          </p>
        ) : credentials === null ? (
          <LoginForm onLogin={handleLogin} />
        ) : (
          <div className={styles.connected}>
            <h2 role="status">GREEN-API подключен</h2>
            <p className={styles.description}>
              Telegram chat interface will be here
            </p>
            {warnings.length > 0 && (
              <aside
                className={styles.diagnostics}
                aria-label="Настройки HTTP API"
              >
                <p>Подключение успешно. Рекомендации по настройкам:</p>
                <ul>
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </aside>
            )}
            <button
              className={styles.logout}
              type="button"
              onClick={handleLogout}
            >
              Выйти
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
