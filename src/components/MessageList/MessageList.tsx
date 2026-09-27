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
  return (
    <section
      className={styles.history}
      aria-label="История сообщений"
      aria-busy={loading}
    >
      <h2>История сообщений</h2>
      {loading ? (
        <p className={styles.state} role="status">
          Загружаем историю сообщений...
        </p>
      ) : error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : messages.length === 0 ? (
        <p className={styles.state} role="status">
          Сообщений пока нет
        </p>
      ) : (
        <ol className={styles.list} aria-label="Сообщения">
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
