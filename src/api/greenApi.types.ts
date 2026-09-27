export interface GreenApiCredentials {
  idInstance: string;
  apiTokenInstance: string;
}

export interface GetSettingsResponse {
  wid: string;
  typeInstance: string;
  webhookUrl: string;
  incomingWebhook: 'yes' | 'no';
  [key: string]: unknown;
}

export interface CheckAccountResponse {
  exist: boolean;
  chatId: string;
  username?: string;
  phoneNumber?: number;
  fromCache?: boolean;
}

export interface GreenApiHistoryMessage {
  type: 'incoming' | 'outgoing';
  idMessage: string;
  timestamp: number;
  typeMessage: string;
  textMessage?: string;
  [key: string]: unknown;
}

// The transport checks the array; the mapper validates each untrusted entry.
export type GetChatHistoryResponse = unknown[];

export interface SendMessageResponse {
  idMessage: string;
}
