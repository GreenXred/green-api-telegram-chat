import { useEffect, useRef } from 'react';
import type { Message } from '../../types/chat';
import MessageBubble from '../MessageBubble/MessageBubble';
import styles from './MessageList.module.scss';
interface MessageListProps {
  messages: readonly Message[];
  loading: boolean;
  error: string | null;
}
function MessageList({ messages, loading, error }: MessageListProps) {
  const viewport = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (viewport.current)
      viewport.current.scrollTop = viewport.current.scrollHeight;
  }, [messages, loading]);
  return (
    <section
      ref={viewport}
      className={styles.history}
      aria-label="Сообщения чата"
      aria-busy={loading}
      tabIndex={0}
    >
      <div className={styles.content}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p className={styles.state} role="status">
            Загрузка сообщений...
          </p>
        ) : messages.length === 0 ? (
          !error && (
            <p className={styles.state} role="status">
              Сообщений пока нет.
              <br />
              Напишите первое сообщение.
            </p>
          )
        ) : (
          <ol className={styles.list} aria-label="Сообщения">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
export default MessageList;
