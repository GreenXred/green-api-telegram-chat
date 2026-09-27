import { useEffect, useRef, useState } from 'react';
import { createGreenApiClient, GreenApiError } from './api/greenApi';
import type { GreenApiCredentials } from './api/greenApi.types';
import { validateCredentials } from './api/validateCredentials';
import LoginForm from './components/LoginForm/LoginForm';
import ChatSearch from './components/ChatSearch/ChatSearch';
import MessageList from './components/MessageList/MessageList';
import { mapHistoryMessages } from './api/mappers/mapHistoryMessages';
import type { Chat, Message } from './types/chat';
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
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const historyRequest = useRef<AbortController | null>(null);

  useEffect(() => () => historyRequest.current?.abort(), []);

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

  async function handleChatFound(chat: Chat): Promise<void> {
    if (!credentials) return;

    historyRequest.current?.abort();
    const controller = new AbortController();
    historyRequest.current = controller;
    setCurrentChat(chat);
    setMessages([]);
    setHistoryError(null);
    setHistoryLoading(true);

    try {
      const history = await createGreenApiClient(credentials).getChatHistory(
        chat.chatId,
        50,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setMessages(mapHistoryMessages(history));
    } catch {
      if (controller.signal.aborted) return;
      setHistoryError('Не удалось загрузить историю сообщений');
    } finally {
      if (historyRequest.current === controller) {
        historyRequest.current = null;
        if (!controller.signal.aborted) setHistoryLoading(false);
      }
    }
  }

  function handleLogout() {
    historyRequest.current?.abort();
    historyRequest.current = null;
    clearCredentials();
    setCredentials(null);
    setWarnings([]);
    setCurrentChat(null);
    setMessages([]);
    setHistoryLoading(false);
    setHistoryError(null);
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
            <ChatSearch
              credentials={credentials}
              onChatFound={handleChatFound}
            />
            {currentChat && (
              <section className={styles.currentChat} aria-label="Текущий чат">
                <h2 role="status">Чат открыт</h2>
                <dl>
                  <dt>chatId</dt>
                  <dd>{currentChat.chatId}</dd>
                  <dt>phone</dt>
                  <dd>{currentChat.phoneNumber}</dd>
                  {currentChat.username && (
                    <>
                      <dt>username</dt>
                      <dd>{currentChat.username}</dd>
                    </>
                  )}
                </dl>
              </section>
            )}
            {currentChat && (
              <MessageList
                messages={messages}
                loading={historyLoading}
                error={historyError}
              />
            )}
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
