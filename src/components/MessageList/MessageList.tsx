import { useEffect, useRef } from 'react';
import type { Message } from '../../types/chat';
import styles from './MessageList.module.scss';

interface MessageListProps {
  messages: readonly Message[];
  loading: boolean;
  error: string | null;
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
});

function MessageList({ messages, loading, error }: MessageListProps) {
  const list = useRef<HTMLOListElement | null>(null);

  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages, loading]);

  return (
    <section
      className={styles.history}
      aria-label="История сообщений"
      aria-busy={loading}
    >
      <h2>История сообщений</h2>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className={styles.state} role="status">
          Загружаем историю сообщений...
        </p>
      ) : messages.length === 0 ? (
        !error && (
          <p className={styles.state} role="status">
            Сообщений пока нет
          </p>
        )
      ) : (
        <ol
          ref={list}
          className={styles.list}
          aria-label="Сообщения"
          tabIndex={0}
        >
          {messages.map((message) => (
            <li className={styles.message} key={message.id}>
              <div className={styles.meta}>
                {message.direction === 'incoming' ? 'Входящее' : 'Исходящее'}
                {' · '}
                <time
                  dateTime={new Date(message.timestamp * 1000).toISOString()}
                >
                  {timeFormatter.format(new Date(message.timestamp * 1000))}
                </time>
              </div>
              <p className={styles.text}>{message.text}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default MessageList;
