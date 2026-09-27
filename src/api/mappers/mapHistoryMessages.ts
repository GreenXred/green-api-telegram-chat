import type {
  GetChatHistoryResponse,
  GreenApiHistoryMessage,
} from '../greenApi.types';
import type { Message } from '../../types/chat';

type TextHistoryMessage = GreenApiHistoryMessage & {
  typeMessage: 'textMessage';
  textMessage: string;
};

function isTextHistoryMessage(value: unknown): value is TextHistoryMessage {
  if (typeof value !== 'object' || value === null) return false;

  // Telegram history uses top-level textMessage, not webhook messageData.
  // https://green-api.com/telegram/docs/api/journals/GetChatHistory/
  return (
    'typeMessage' in value &&
    value.typeMessage === 'textMessage' &&
    'type' in value &&
    (value.type === 'incoming' || value.type === 'outgoing') &&
    'idMessage' in value &&
    typeof value.idMessage === 'string' &&
    value.idMessage.trim().length > 0 &&
    'textMessage' in value &&
    typeof value.textMessage === 'string' &&
    value.textMessage.trim().length > 0 &&
    'timestamp' in value &&
    typeof value.timestamp === 'number' &&
    Number.isInteger(value.timestamp) &&
    value.timestamp >= 0 &&
    Number.isFinite(new Date(value.timestamp * 1000).getTime())
  );
}

export function mapHistoryMessages(
  history: Readonly<GetChatHistoryResponse>,
): Message[] {
  return history
    .filter(isTextHistoryMessage)
    .map((message): Message => ({
      id: message.idMessage,
      text: message.textMessage,
      direction: message.type,
      timestamp: message.timestamp,
    }))
    .sort((first, second) => first.timestamp - second.timestamp);
}
