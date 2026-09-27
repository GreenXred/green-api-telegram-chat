import type { Chat } from '../../types/chat';
import styles from './ChatHeader.module.scss';

interface ChatHeaderProps {
  chat: Chat | null;
  onNewChat: () => void;
  onLogout: () => void;
}

function formatPhone(phone: string): string {
  if (phone.length === 11)
    return `${phone[0] === '8' ? '' : '+'}${phone[0]} ${phone.slice(1, 4)} ${phone.slice(4, 7)} ${phone.slice(7, 9)} ${phone.slice(9)}`;
  return `+${phone}`;
}

function ChatHeader({ chat, onNewChat, onLogout }: ChatHeaderProps) {
  const username = chat?.username
    ? `@${chat.username.replace(/^@/, '')}`
    : null;
  return (
    <header className={styles.header}>
      <div className={styles.identity}>
        <div className={styles.avatar} aria-hidden="true">
          {chat
            ? username?.slice(1, 2).toUpperCase() || chat.phoneNumber.slice(-2)
            : '↗'}
        </div>
        <div className={styles.details}>
          <h1>
            {chat ? username || formatPhone(chat.phoneNumber) : 'Telegram Chat'}
          </h1>
          <p>
            {chat
              ? username
                ? formatPhone(chat.phoneNumber)
                : 'Telegram'
              : 'via GREEN-API'}
          </p>
        </div>
      </div>
      <nav className={styles.actions} aria-label="Действия чата">
        {chat && (
          <button type="button" onClick={onNewChat}>
            Новый чат
          </button>
        )}
        <button type="button" onClick={onLogout}>
          Выйти
        </button>
      </nav>
    </header>
  );
}

export default ChatHeader;
