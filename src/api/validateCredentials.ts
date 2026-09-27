import { createGreenApiClient, validateTelegramSettings } from './greenApi';
import type { GreenApiCredentials } from './greenApi.types';

export async function validateCredentials(
  credentials: GreenApiCredentials,
  signal?: AbortSignal,
): Promise<string[]> {
  const settings = await createGreenApiClient(credentials).getSettings(signal);
  return validateTelegramSettings(settings);
}
