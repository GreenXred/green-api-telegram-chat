import type { Message } from '../../types/chat';
import styles from './MessageBubble.module.scss';

const formatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
});

function MessageBubble({ message }: { message: Message }) {
  const date = new Date(message.timestamp * 1000);
  const isOutgoing = message.direction === 'outgoing';
  const directionClass = isOutgoing ? styles.outgoing : styles.incoming;

  return (
    
    <li className={`${styles.bubble} ${directionClass}`}>
      <p>{message.text}</p>
      <time dateTime={date.toISOString()}>{formatter.format(date)}</time>
    </li>
  );
}

export default MessageBubble;
