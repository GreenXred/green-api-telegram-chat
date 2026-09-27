import { useEffect, useRef, useState } from 'react';
import type { SubmitEvent } from 'react';
import { GreenApiError } from '../../api/greenApi';
import type { GreenApiCredentials } from '../../api/greenApi.types';
import styles from './LoginForm.module.scss';

interface LoginFormProps {
  onLogin: (credentials: GreenApiCredentials, signal: AbortSignal) => Promise<void>;
}

function LoginForm({ onLogin }: LoginFormProps) {
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => () => activeRequest.current?.abort(), []);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (activeRequest.current) return;

    const data = new FormData(event.currentTarget);
    const credentials = {
      idInstance: String(data.get('idInstance') ?? '').trim(),
      apiTokenInstance: String(data.get('apiTokenInstance') ?? '').trim(),
    };

    setShowToken(false);

    if (!credentials.idInstance || !credentials.apiTokenInstance) {
      setError('Заполните idInstance и apiTokenInstance.');
      return;
    }

    const controller = new AbortController();
    activeRequest.current = controller;
    setError(null);
    setLoading(true);

    try {
      await onLogin(credentials, controller.signal);
    } catch (error) {
      if (controller.signal.aborted) return;

      setError(
        error instanceof GreenApiError
          ? error.message
          : 'Не удалось войти. Попробуйте ещё раз.',
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }

  return (

    <form
      className={styles.form}
      onSubmit={handleSubmit}
      noValidate
      autoComplete="off"
      aria-busy={loading}
    >
      <p className={styles.subtitle}>Подключитесь через GREEN-API</p>

      <div className={styles.field}>
        <label htmlFor="idInstance">idInstance</label>
        <input
          id="idInstance"
          name="idInstance"
          type="text"
          placeholder="Введите idInstance"
          required
          disabled={loading}
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby={error ? 'login-error' : undefined}
          onChange={() => setError(null)}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="apiTokenInstance">apiTokenInstance</label>
        <div className={styles.tokenField}>
          <input
            id="apiTokenInstance"
            name="apiTokenInstance"
            type={showToken ? 'text' : 'password'}
            placeholder="Введите API token"
            required
            disabled={loading}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-describedby={error ? 'login-error' : undefined}
            onChange={() => setError(null)}
          />

          <button
            className={styles.visibility}
            type="button"
            disabled={loading}
            aria-label={showToken ? 'Скрыть токен' : 'Показать токен'}
            aria-controls="apiTokenInstance"
            aria-pressed={showToken}
            onClick={() => setShowToken((visible) => !visible)}
          >
            {showToken ? 'Скрыть' : 'Показать'}
          </button>
        </div>
      </div>

      {error && (
        <p className={styles.error} id="login-error" role="alert">
          {error}
        </p>
      )}

      <button className={styles.submit} type="submit" disabled={loading}>
        {loading ? 'Подключение...' : 'Войти'}
      </button>
      
      <p className={styles.note}>
        Используйте данные вашего Telegram instance из личного кабинета GREEN-API
      </p>
    </form>
  );
}

export default LoginForm;
