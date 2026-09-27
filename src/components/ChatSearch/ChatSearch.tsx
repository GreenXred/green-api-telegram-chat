import { useEffect, useRef, useState } from 'react';
import type { SubmitEvent } from 'react';
import { createGreenApiClient, GreenApiError } from '../../api/greenApi';
import type { GreenApiCredentials } from '../../api/greenApi.types';
import type { Chat } from '../../types/chat';
import { isValidPhone, normalizePhone } from '../../utils/phone';
import styles from './ChatSearch.module.scss';

interface ChatSearchProps {
  credentials: GreenApiCredentials;
  onChatFound: (chat: Chat) => void;
}

function ChatSearch({ credentials, onChatFound }: ChatSearchProps) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => () => activeRequest.current?.abort(), []);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (activeRequest.current) return;

    const phoneNumber = normalizePhone(phone);
    setError(null);

    if (!isValidPhone(phoneNumber)) {
      setError('Номер телефона должен содержать от 7 до 15 цифр.');
      return;
    }

    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);

    try {
      const api = createGreenApiClient(credentials);
      const account = await api.checkAccount(phoneNumber, controller.signal);
      if (controller.signal.aborted) return;

      if (!account.exist) {
        setError('Пользователь Telegram с таким номером не найден');
        return;
      }

      onChatFound({
        chatId: account.chatId,
        phoneNumber,
        ...(account.username ? { username: account.username } : {}),
      });
    } catch (error) {
      if (controller.signal.aborted) return;

      setError(
        error instanceof GreenApiError
          ? error.message
          : 'Не удалось проверить номер. Попробуйте ещё раз.',
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }

  return (

    <form className={styles.form} onSubmit={handleSubmit} noValidate aria-busy={loading}>
      <div className={styles.field}>
        <label htmlFor="chat-phone">Номер телефона</label>
        <input
          id="chat-phone"
          name="phoneNumber"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+7 999 123-45-67"
          value={phone}
          required
          disabled={loading}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'chat-search-error' : undefined}
          onChange={(event) => {
            setPhone(event.target.value);
            setError(null);
          }}
        />
      </div>

      {error && (
        <p className={styles.error} id="chat-search-error" role="alert">
          {error}
        </p>
      )}
      
      <button className={styles.submit} type="submit" disabled={loading}>
        {loading ? 'Поиск...' : 'Открыть чат'}
      </button>
    </form>
  );
}

export default ChatSearch;
