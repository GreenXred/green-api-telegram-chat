import type {
  GetSettingsResponse,
  GreenApiCredentials,
} from './greenApi.types';

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

  return {
    async getSettings(signal?: AbortSignal): Promise<GetSettingsResponse> {
      const url = `${baseUrl}/waInstance${encodeURIComponent(idInstance)}/getSettings/${encodeURIComponent(apiTokenInstance)}`;
      let response: Response;

      try {
        response = await fetch(url, {
          method: 'GET',
          signal,
          cache: 'no-store',
        });
      } catch (error) {
        if (signal?.aborted) throw error;
        throw new GreenApiError(
          'Не удалось связаться с GREEN-API. Проверьте сеть, base URL и доступность API (в том числе CORS).',
        );
      }

      // Do not surface response bodies or statusText: they may echo credentials.
      // Checking status first also handles HTML/plain-text error responses.
      if (!response.ok) {
        const message =
          response.status === 401 || response.status === 403
            ? 'Доступ к GREEN-API отклонён. Проверьте credentials и доступ к instance.'
            : 'Ошибка запроса к GREEN-API.';
        throw new GreenApiError(
          `${message} HTTP ${response.status}.`,
          response.status,
        );
      }

      let settings: unknown;
      try {
        settings = await response.json();
      } catch (error) {
        if (signal?.aborted) throw error;
        throw new GreenApiError('GREEN-API вернул некорректный JSON.');
      }

      if (!isGetSettingsResponse(settings)) {
        throw new GreenApiError(
          'GREEN-API вернул неожиданный формат настроек.',
        );
      }

      return settings;
    },
  };
}

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
