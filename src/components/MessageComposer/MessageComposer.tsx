import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, SubmitEvent } from 'react';
import styles from './MessageComposer.module.scss';

interface MessageComposerProps {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
}

function MessageComposer({ onSend, disabled = false }: MessageComposerProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textarea = useRef<HTMLTextAreaElement | null>(null);
  const submitting = useRef(false);
  const mounted = useRef(false);
  const restoreFocus = useRef(false);

  const busy = disabled || sending;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!busy && restoreFocus.current) {
      textarea.current?.focus({ preventScroll: true });
      restoreFocus.current = false;
    }
  }, [busy]);

  useEffect(() => {
    if (textarea.current) {
      textarea.current.style.height = 'auto';
      textarea.current.style.height = `${Math.min(textarea.current.scrollHeight + 2, 144)}px`;
    }
  }, [text]);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = text.trim();
    if (busy || submitting.current || !message) return;

    submitting.current = true;
    setSending(true);
    setError(null);

    try {
      await onSend(message);
      if (!mounted.current) return;

      setText('');
    } catch {
      if (!mounted.current) return;

      setError('Не удалось отправить сообщение');
    } finally {
      submitting.current = false;
      if (mounted.current) {
        restoreFocus.current = true;
        setSending(false);
      }
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (!event.repeat) event.currentTarget.form?.requestSubmit();
    }
  }

  return (

    <form
      className={styles.composer}
      onSubmit={handleSubmit}
      aria-label="Отправка сообщения"
      aria-busy={sending}
    >
      <label htmlFor="message-text">Сообщение</label>
      <textarea
        ref={textarea}
        id="message-text"
        name="message"
        rows={1}
        placeholder="Написать сообщение..."
        value={text}
        disabled={busy}
        aria-describedby={error ? 'message-send-error' : undefined}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
      />

      {error && (
        <p className={styles.error} id="message-send-error" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        aria-label={sending ? 'Отправка...' : 'Отправить'}
        disabled={busy || !text.trim()}
      >
        {sending ? (
          <span className={styles.spinner} aria-hidden="true" />
        ) : (
          <svg aria-hidden="true" width="23" height="23" viewBox="0 0 24 24" fill="none">
            <path
              d="m4 4 17 8-17 8 3-8-3-8Zm3 8h14"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </form>
  );
}

export default MessageComposer;
