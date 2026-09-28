# Telegram Chat — GREEN-API

Одностраничный Telegram-like клиент на React, который позволяет работать с Telegram через GREEN-API.

## Возможности

- Авторизация по `idInstance` и `apiTokenInstance`.
- Проверка Telegram-пользователя по номеру телефона и открытие чата.
- Загрузка последних сообщений и отправка текстовых сообщений.
- Получение входящих сообщений без перезагрузки через long polling (`ReceiveNotification`).
- Удаление обработанных уведомлений через `DeleteNotification`.
- Сохранение сессии в `sessionStorage`.
- Адаптивный Telegram-like UI.

## Стек

React, TypeScript, Vite, SCSS Modules, Fetch API, GREEN-API Telegram API, ESLint, Prettier.

## Как это работает

`React → GREEN-API → Telegram`

1. Пользователь вводит `idInstance` и `apiTokenInstance`.
2. Приложение проверяет Telegram instance.
3. Пользователь вводит номер телефона.
4. `CheckAccount` возвращает `chatId`.
5. `GetChatHistory` загружает историю.
6. `SendMessage` отправляет сообщение.
7. `ReceiveNotification` получает входящие сообщения.
8. `DeleteNotification` удаляет обработанное уведомление.

## Предварительная настройка GREEN-API

1. Создайте Telegram instance в GREEN-API.
2. Авторизуйте Telegram-аккаунт через QR-код.
3. Получите `apiUrl`, `idInstance` и `apiTokenInstance` в личном кабинете.
4. Для получения входящих сообщений через HTTP API оставьте `webhookUrl` пустым и установите `incomingWebhook` (уведомления о входящих сообщениях) в `yes`.

Приложение не выполняет QR-авторизацию Telegram самостоятельно: instance должен быть авторизован заранее.

## Установка

```sh
git clone <repository-url> green-api-telegram-chat
cd green-api-telegram-chat
npm install
cp .env.example .env
```

В `.env` укажите свой `apiUrl` из GREEN-API вместо примера:

```dotenv
VITE_GREEN_API_BASE_URL=https://YOUR_API_HOST.api.green-api.com
```

`idInstance` и `apiTokenInstance` вводятся в интерфейсе приложения. Добавлять их в `.env` не нужно.

Запустите приложение и откройте адрес, который Vite выведет в терминале:

```sh
npm run dev
```

## Архитектура

```text
src/
  api/
  components/
  hooks/
  styles/
  types/
  utils/
```

- `api` — GREEN-API client и mappers ответов API во внутренние модели.
- `components` — компоненты UI.
- `hooks` — управление long polling.
- `styles` — глобальные стили и SCSS-переменные.
- `types` — внутренние модели приложения.
- `utils` — небольшие вспомогательные функции.

## Ограничения

- Поддерживаются только текстовые сообщения.
- Нет списка всех Telegram-чатов: чат открывается по номеру телефона.
- Нет поддержки файлов, изображений, голосовых сообщений и стикеров.
- Приложение использует уже авторизованный GREEN-API Telegram instance.

## Безопасность

- Реальные credentials не хранятся в Git; `.env` исключён через `.gitignore`.
- `apiTokenInstance` не логируется.
- Credentials сохраняются только в `sessionStorage` на время браузерной сессии.

Хранение API token во frontend не обеспечивает защиту секрета от доступа из браузера. Для production-системы секретные credentials обычно следует обрабатывать через backend.
