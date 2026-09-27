import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createGreenApiClient, GreenApiError } from './api/greenApi';
import type { GreenApiCredentials } from './api/greenApi.types';
import { validateCredentials } from './api/validateCredentials';
import ChatHeader from './components/ChatHeader/ChatHeader';
import LoginForm from './components/LoginForm/LoginForm';
import ChatSearch from './components/ChatSearch/ChatSearch';
import MessageList from './components/MessageList/MessageList';
import MessageComposer from './components/MessageComposer/MessageComposer';
import { mapHistoryMessages } from './api/mappers/mapHistoryMessages';
import type { IncomingMessage } from './api/mappers/mapIncomingNotification';
import { useNotifications } from './hooks/useNotifications';
import type { Chat, Message } from './types/chat';
import {
  clearCredentials,
  readCredentials,
  saveCredentials,
} from './utils/credentialsStorage';
import styles from './App.module.scss';

function App() {
  const [credentials, setCredentials] = useState<GreenApiCredentials | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const historyRequest = useRef<AbortController | null>(null);
  const sendRequest = useRef<AbortController | null>(null);
  const selectedChatId = useRef<string | null>(null);

  const api = useMemo(
    () => (credentials ? createGreenApiClient(credentials) : null),
    [credentials],
  );

  const handleIncomingMessage = useCallback((incoming: IncomingMessage) => {
    if (incoming.chatId !== selectedChatId.current) return;

    setMessages((previous) =>
      previous.some((message) => message.id === incoming.message.id)
        ? previous
        : [...previous, incoming.message].sort(
            (first, second) => first.timestamp - second.timestamp,
          ),
    );
  }, []);

  const { error: pollingError, stop: stopNotifications } = useNotifications({
    api,
    enabled: credentials !== null,
    onIncomingMessage: handleIncomingMessage,
  });

  useEffect(
    () => () => {
      historyRequest.current?.abort();
      sendRequest.current?.abort();
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function restoreSession() {
      try {
        const stored = readCredentials();
        if (!stored) return;

        await validateCredentials(stored, controller.signal);
        if (controller.signal.aborted) return;

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
    await validateCredentials(candidate, signal);
    if (signal.aborted) return;

    try {
      saveCredentials(candidate);
    } catch {
      throw new GreenApiError(
        'Не удалось сохранить сессию. Разрешите хранение данных сайта в браузере и повторите вход.',
      );
    }

    setCredentials(candidate);
  }

  async function handleChatFound(chat: Chat): Promise<void> {
    if (!api) return;

    sendRequest.current?.abort();
    sendRequest.current = null;
    historyRequest.current?.abort();
    const controller = new AbortController();
    historyRequest.current = controller;
    selectedChatId.current = chat.chatId;
    setCurrentChat(chat);
    setMessages([]);
    setHistoryError(null);
    setHistoryLoading(true);

    try {
      const history = await api.getChatHistory(chat.chatId, 50, controller.signal);
      if (controller.signal.aborted) return;

      // Notifications received during the history request must not be overwritten.
      const historyMessages = mapHistoryMessages(history);
      setMessages((previous) => {
        const combined = new Map(historyMessages.map((message) => [message.id, message]));
        for (const message of previous) combined.set(message.id, message);

        return [...combined.values()].sort(
          (first, second) => first.timestamp - second.timestamp,
        );
      });
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

  async function handleSendMessage(text: string): Promise<void> {
    if (
      !api ||
      !currentChat ||
      historyRequest.current ||
      sendRequest.current ||
      !text.trim()
    ) {
      throw new Error('Не удалось отправить сообщение');
    }

    const controller = new AbortController();
    sendRequest.current = controller;

    try {
      const { idMessage } = await api.sendMessage(
        currentChat.chatId,
        text.trim(),
        controller.signal,
      );
      controller.signal.throwIfAborted();

      const message: Message = {
        id: idMessage,
        text: text.trim(),
        direction: 'outgoing',
        timestamp: Math.floor(Date.now() / 1000),
      };

      setMessages((previous) =>
        previous.some((item) => item.id === idMessage)
          ? previous
          : [...previous, message],
      );
    } finally {
      if (sendRequest.current === controller) sendRequest.current = null;
    }
  }

  function handleNewChat() {
    sendRequest.current?.abort();
    sendRequest.current = null;
    historyRequest.current?.abort();
    historyRequest.current = null;
    selectedChatId.current = null;
    setCurrentChat(null);
    setMessages([]);
    setHistoryLoading(false);
    setHistoryError(null);
  }

  function handleLogout() {
    stopNotifications();
    selectedChatId.current = null;
    sendRequest.current?.abort();
    sendRequest.current = null;
    historyRequest.current?.abort();
    historyRequest.current = null;
    clearCredentials();
    setCredentials(null);
    setCurrentChat(null);
    setMessages([]);
    setHistoryLoading(false);
    setHistoryError(null);
  }

  if (restoring || credentials === null) {
    return (
      <main className={styles.login}>
        <section className={styles.card} aria-labelledby="app-title">
          <div className={styles.mark} aria-hidden="true">
            ↗
          </div>
          <h1 id="app-title" className={styles.title}>
            Telegram Chat
          </h1>
          {restoring ? (
            <p className={styles.description} role="status">
              Восстанавливаем сессию...
            </p>
          ) : (
            <LoginForm onLogin={handleLogin} />
          )}
        </section>
      </main>
    );
  }

  return (
    <main className={styles.app}>
      <ChatHeader chat={currentChat} onNewChat={handleNewChat} onLogout={handleLogout} />
      {pollingError && (
        <p className={styles.polling} role="status">
          {pollingError}
        </p>
      )}
      {currentChat ? (
        <>
          <MessageList
            messages={messages}
            loading={historyLoading}
            error={historyError}
          />
          <MessageComposer
            key={currentChat.chatId}
            onSend={handleSendMessage}
            disabled={historyLoading}
          />
        </>
      ) : (
        <section className={styles.newChat} aria-labelledby="new-chat-title">
          <div className={styles.searchCard}>
            <div className={styles.mark} aria-hidden="true">
              ↗
            </div>
            <h2 id="new-chat-title">Новый чат</h2>
            <p className={styles.intro}>Введите номер телефона, чтобы начать чат</p>
            <ChatSearch credentials={credentials} onChatFound={handleChatFound} />
            <p className={styles.hint}>
              Введите номер телефона пользователя Telegram,
              <br />
              чтобы начать переписку
            </p>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
