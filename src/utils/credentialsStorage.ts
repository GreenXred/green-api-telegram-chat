import type { GreenApiCredentials } from '../api/greenApi.types';

const STORAGE_KEY = 'greenApiCredentials';

export function readCredentials(): GreenApiCredentials | null {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored === null) return null;

  const value: unknown = JSON.parse(stored);
  if (
    typeof value !== 'object' ||
    value === null ||
    !('idInstance' in value) ||
    typeof value.idInstance !== 'string' ||
    !value.idInstance.trim() ||
    !('apiTokenInstance' in value) ||
    typeof value.apiTokenInstance !== 'string' ||
    !value.apiTokenInstance.trim()
  ) {
    throw new Error('Invalid stored credentials');
  }

  return {
    idInstance: value.idInstance.trim(),
    apiTokenInstance: value.apiTokenInstance.trim(),
  };
}

export function saveCredentials(credentials: GreenApiCredentials): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
}

export function clearCredentials(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // A browser blocking storage must not prevent returning to the login screen.
  }
}
