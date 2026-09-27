import type { Chat } from '../../types/chat';
import styles from './ChatHeader.module.scss';

interface ChatHeaderProps {
  chat: Chat | null;
  onNewChat: () => void;
  onLogout: () => void;
}

function formatPhone(phone: string): string {
  if (phone.length === 11) {
    const prefix = phone[0] === '8' ? '' : '+';
    const groups = [
      phone[0],
      phone.slice(1, 4),
      phone.slice(4, 7),
      phone.slice(7, 9),
      phone.slice(9),
    ];

    return `${prefix}${groups.join(' ')}`;
  }

  return `+${phone}`;
}

function ChatHeader({ chat, onNewChat, onLogout }: ChatHeaderProps) {
  const username = chat?.username ? `@${chat.username.replace(/^@/, '')}` : null;
  const phone = chat ? formatPhone(chat.phoneNumber) : '';
  const title = chat ? username || phone : 'Telegram Chat';
  const subtitle = chat ? (username ? phone : 'Telegram') : 'via GREEN-API';
  const avatarText = chat
    ? username?.slice(1, 2).toUpperCase() || chat.phoneNumber.slice(-2)
    : '↗';

  return (

    <header className={styles.header}>
      <div className={styles.identity}>
        <div className={styles.avatar} aria-hidden="true">
          {avatarText}
        </div>
        <div className={styles.details}>
          <h1>{title}</h1>
          <p>{subtitle}</p>
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
