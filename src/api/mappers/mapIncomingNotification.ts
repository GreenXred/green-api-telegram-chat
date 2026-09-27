import type { IncomingTextNotificationBody } from '../greenApi.types';
import type { Message } from '../../types/chat';

export interface IncomingMessage {
  chatId: string;
  message: Message;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIncomingText(value: unknown): value is IncomingTextNotificationBody {
  if (!isRecord(value) || value.typeWebhook !== 'incomingMessageReceived') return false;
  const sender = value.senderData;
  const data = value.messageData;
  return (
    typeof value.idMessage === 'string' &&
    value.idMessage.trim().length > 0 &&
    typeof value.timestamp === 'number' &&
    Number.isInteger(value.timestamp) &&
    value.timestamp >= 0 &&
    Number.isFinite(new Date(value.timestamp * 1000).getTime()) &&
    isRecord(sender) &&
    typeof sender.chatId === 'string' &&
    sender.chatId.trim().length > 0 &&
    isRecord(data) &&
    data.typeMessage === 'textMessage' &&
    isRecord(data.textMessageData) &&
    typeof data.textMessageData.textMessage === 'string' &&
    data.textMessageData.textMessage.trim().length > 0
  );
}

// Telegram ReceiveNotification: messageData.textMessageData.textMessage.
// https://green-api.com/telegram/docs/api/receiving/technology-http-api/ReceiveNotification/
export function mapIncomingNotification(body: unknown): IncomingMessage | null {
  if (!isIncomingText(body)) return null;
  return {
    chatId: body.senderData.chatId,
    message: {
      id: body.idMessage,
      text: body.messageData.textMessageData.textMessage,
      direction: 'incoming',
      timestamp: body.timestamp,
    },
  };
}
