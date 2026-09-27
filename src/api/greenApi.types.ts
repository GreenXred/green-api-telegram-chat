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
