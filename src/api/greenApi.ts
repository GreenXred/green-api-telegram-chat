import type {
  CheckAccountResponse,
  GetChatHistoryResponse,
  GetSettingsResponse,
  GreenApiCredentials,
  SendMessageResponse,
  ReceiveNotificationResponse,
  DeleteNotificationResponse,
} from './greenApi.types';
import { isValidPhone } from '../utils/phone';

export class GreenApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'GreenApiError';
    this.status = status;
  }
}

function isGetSettingsResponse(value: unknown): value is GetSettingsResponse {
  if (typeof value !== 'object' || value === null) return false;

  return (
    'wid' in value &&
    typeof value.wid === 'string' &&
    'typeInstance' in value &&
    typeof value.typeInstance === 'string' &&
    'webhookUrl' in value &&
    typeof value.webhookUrl === 'string' &&
    'incomingWebhook' in value &&
    (value.incomingWebhook === 'yes' || value.incomingWebhook === 'no')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCheckAccountResponse(value: unknown): value is CheckAccountResponse {
  if (!isRecord(value)) return false;

  return (
    typeof value.exist === 'boolean' &&
    typeof value.chatId === 'string' &&
    (!value.exist || value.chatId.trim().length > 0) &&
    (value.username === undefined || typeof value.username === 'string') &&
    (value.phoneNumber === undefined ||
      (typeof value.phoneNumber === 'number' &&
        Number.isSafeInteger(value.phoneNumber) &&
        value.phoneNumber > 0)) &&
    (value.fromCache === undefined || typeof value.fromCache === 'boolean')
  );
}

const RATE_LIMIT_MESSAGE =
  'Превышен лимит запросов. Подождите и попробуйте позже.';

function checkBusinessError(
  value: unknown,
  fallbackMessage = 'GREEN-API не смог проверить номер. Проверьте состояние instance и повторите поиск позже.',
): void {
  if (!isRecord(value) || value.status !== false) return;

  const reason =
    isRecord(value.data) && typeof value.data.reason === 'string'
      ? value.data.reason
      : value.reason;

  switch (reason) {
    case 'rate_limit_exceeded':
    case 'Rate limited by messenger':
      throw new GreenApiError(RATE_LIMIT_MESSAGE);
    case 'instance is starting or not authorized':
      throw new GreenApiError(
        'Instance запускается или не авторизован в Telegram. Проверьте его состояние в GREEN-API и повторите попытку.',
      );
    case 'Messenger is temporarily unavailable':
      throw new GreenApiError(
        'Telegram временно недоступен. Повторите попытку позже.',
      );
    default:
      // Never display an arbitrary API reason: it can contain sensitive data.
      throw new GreenApiError(fallbackMessage);
  }
}

export function createGreenApiClient(credentials: GreenApiCredentials) {
  const baseUrl = import.meta.env.VITE_GREEN_API_BASE_URL?.trim().replace(
    /\/+$/,
    '',
  );

  if (!baseUrl) {
    throw new GreenApiError('VITE_GREEN_API_BASE_URL is not configured');
  }

  // Reject malformed configuration without exposing the configured URL.
  try {
    const url = new URL(baseUrl);
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error();
    }
  } catch {
    throw new GreenApiError(
      'VITE_GREEN_API_BASE_URL must be a valid HTTP(S) base URL',
    );
  }

  const idInstance = credentials.idInstance.trim();
  const apiTokenInstance = credentials.apiTokenInstance.trim();

  if (!idInstance || !apiTokenInstance) {
    throw new GreenApiError('Укажите idInstance и apiTokenInstance.');
  }

  async function request(
    method:
      | 'getSettings'
      | 'checkAccount'
      | 'getChatHistory'
      | 'sendMessage'
      | 'receiveNotification'
      | 'deleteNotification',
    options: RequestInit,
    parameters: { suffix?: string; allowEmpty?: boolean } = {},
  ): Promise<unknown> {
    const url = `${baseUrl}/waInstance${encodeURIComponent(idInstance)}/${method}/${encodeURIComponent(apiTokenInstance)}${parameters.suffix ?? ''}`;
    let response: Response;

    try {
      response = await fetch(url, {
        ...options,
        cache: 'no-store',
      });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      throw new GreenApiError(
        'Не удалось связаться с GREEN-API. Проверьте сеть, base URL и доступность API (в том числе CORS).',
      );
    }

    // Do not surface response bodies or statusText: they may echo credentials.
    // Checking status first also handles HTML/plain-text error responses.
    if (!response.ok) {
      if (response.status === 429 || response.status === 469) {
        throw new GreenApiError(RATE_LIMIT_MESSAGE, response.status);
      }
      if (response.status === 466) {
        throw new GreenApiError(
          'Исчерпан лимит тарифа GREEN-API. Проверьте доступную квоту в личном кабинете.',
          response.status,
        );
      }
      const message =
        response.status === 401 || response.status === 403
          ? 'Доступ к GREEN-API отклонён. Проверьте credentials и доступ к instance.'
          : 'Ошибка запроса к GREEN-API.';
      throw new GreenApiError(
        `${message} HTTP ${response.status}.`,
        response.status,
      );
    }

    try {
      const text = await response.text();
      if (parameters.allowEmpty && !text.trim()) return null;
      const data: unknown = JSON.parse(text);
      return data;
    } catch (error) {
      if (options.signal?.aborted) throw error;
      throw new GreenApiError('GREEN-API вернул некорректный JSON.');
    }
  }

  return {
    async getSettings(signal?: AbortSignal): Promise<GetSettingsResponse> {
      const settings = await request('getSettings', { method: 'GET', signal });
      if (!isGetSettingsResponse(settings)) {
        throw new GreenApiError(
          'GREEN-API вернул неожиданный формат настроек.',
        );
      }

      return settings;
    },
    async checkAccount(
      phoneNumber: string | number,
      signal?: AbortSignal,
    ): Promise<CheckAccountResponse> {
      const phone = String(phoneNumber);
      if (!isValidPhone(phone)) {
        throw new GreenApiError(
          'Номер телефона должен содержать от 7 до 15 цифр.',
        );
      }

      const account = await request('checkAccount', {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: Number(phone) }),
      });
      checkBusinessError(account);
      if (!isCheckAccountResponse(account)) {
        throw new GreenApiError(
          'GREEN-API вернул неожиданный формат ответа проверки номера.',
        );
      }
      return account;
    },
    async getChatHistory(
      chatId: string,
      count = 50,
      signal?: AbortSignal,
    ): Promise<GetChatHistoryResponse> {
      if (!chatId.trim()) {
        throw new GreenApiError('Укажите chatId для загрузки истории.');
      }
      if (!Number.isSafeInteger(count) || count < 1) {
        throw new GreenApiError(
          'Количество сообщений должно быть положительным целым числом.',
        );
      }

      const history = await request('getChatHistory', {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, count }),
      });
      if (!Array.isArray(history)) {
        throw new GreenApiError(
          'GREEN-API вернул неожиданный формат истории сообщений.',
        );
      }
      return history;
    },
    async sendMessage(
      chatId: string,
      message: string,
      signal?: AbortSignal,
    ): Promise<SendMessageResponse> {
      if (!chatId.trim() || !message.trim()) {
        throw new GreenApiError('Укажите chatId и непустой текст сообщения.');
      }

      const result = await request('sendMessage', {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message: message.trim() }),
      });
      checkBusinessError(
        result,
        'GREEN-API не смог отправить сообщение. Попробуйте позже.',
      );
      if (
        !isRecord(result) ||
        typeof result.idMessage !== 'string' ||
        !result.idMessage.trim()
      ) {
        throw new GreenApiError(
          'GREEN-API вернул неожиданный формат ответа отправки сообщения.',
        );
      }
      return { idMessage: result.idMessage };
    },
    async receiveNotification(
      receiveTimeout = 20,
      signal?: AbortSignal,
    ): Promise<ReceiveNotificationResponse | null> {
      if (
        !Number.isInteger(receiveTimeout) ||
        receiveTimeout < 5 ||
        receiveTimeout > 60
      ) {
        throw new GreenApiError(
          'Таймаут получения уведомления должен быть от 5 до 60 секунд.',
        );
      }
      const notification = await request(
        'receiveNotification',
        { method: 'GET', signal },
        { suffix: `?receiveTimeout=${receiveTimeout}`, allowEmpty: true },
      );
      if (notification === null) return null;
      checkBusinessError(
        notification,
        'Не удалось получить уведомление GREEN-API.',
      );
      if (
        !isRecord(notification) ||
        typeof notification.receiptId !== 'number' ||
        !Number.isSafeInteger(notification.receiptId) ||
        notification.receiptId < 1
      ) {
        throw new GreenApiError(
          'GREEN-API вернул некорректный receiptId уведомления.',
        );
      }
      return { receiptId: notification.receiptId, body: notification.body };
    },
    async deleteNotification(
      receiptId: number,
      signal?: AbortSignal,
    ): Promise<DeleteNotificationResponse> {
      if (!Number.isSafeInteger(receiptId) || receiptId < 1) {
        throw new GreenApiError('Укажите корректный receiptId уведомления.');
      }
      const result = await request(
        'deleteNotification',
        { method: 'DELETE', signal },
        { suffix: `/${receiptId}` },
      );
      checkBusinessError(result, 'Не удалось удалить уведомление GREEN-API.');
      if (!isRecord(result) || result.result !== true) {
        throw new GreenApiError(
          'GREEN-API не подтвердил удаление уведомления.',
        );
      }
      return { result: true };
    },
  };
}

export type GreenApiClient = ReturnType<typeof createGreenApiClient>;

export function validateTelegramSettings(
  settings: GetSettingsResponse,
): string[] {
  if (settings.typeInstance !== 'telegram') {
    throw new GreenApiError(
      'GREEN-API доступен, но instance не Telegram. Используйте Telegram instance.',
    );
  }

  const warnings: string[] = [];
  if (settings.webhookUrl !== '') {
    warnings.push(
      'Для получения уведомлений через HTTP API очистите webhookUrl в настройках instance.',
    );
  }
  if (settings.incomingWebhook !== 'yes') {
    warnings.push(
      'Для входящих уведомлений включите incomingWebhook: yes в настройках instance.',
    );
  }
  return warnings;
}
