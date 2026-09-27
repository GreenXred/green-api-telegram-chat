export interface Chat {
  chatId: string;
  phoneNumber: string;
  username?: string;
}

export type MessageDirection = 'incoming' | 'outgoing';

export interface Message {
  id: string;
  text: string;
  direction: MessageDirection;
  timestamp: number;
}
