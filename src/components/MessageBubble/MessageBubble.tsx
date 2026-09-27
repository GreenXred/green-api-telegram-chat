import type { Message } from '../../types/chat';
import styles from './MessageBubble.module.scss';
const formatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
});
function MessageBubble({ message }: { message: Message }) {
  const date = new Date(message.timestamp * 1000);
  return (
    <li
      className={`${styles.bubble} ${message.direction === 'outgoing' ? styles.outgoing : styles.incoming}`}
    >
      <p>{message.text}</p>
      <time dateTime={date.toISOString()}>{formatter.format(date)}</time>
    </li>
  );
}
export default MessageBubble;
