# AI-чат на TanStack

Чат-приложение с интеграцией Google Gemini и базой данных Supabase. Отлично подходит для быстрого старта проекта с искусственным интеллектом.

**⚡ Посмотреть демо:** [https://tanstack-starter.netlify.app/](https://tanstack-starter.netlify.app/)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/StanislavMal/tanstack-template)

## Особенности

- 🤖 Работает с **Google Gemini API**
- ✨ Поддержка Markdown с подсветкой кода
- ⚡ Потоковая передача ответов (эффект "печатной машинки")
- 🔐 Безопасные серверные вызовы (ключ Gemini не попадает в браузер)
- 💬 Управление диалогами через **Supabase PostgreSQL**
- 🔑 Управление API-ключами
- 📱 Адаптивный интерфейс для всех устройств
- 🎨 Современный UI на Tailwind CSS
- 🧠 Централизованное управление состоянием через TanStack Store

## Архитектура

- **Фронтенд**: React 19 + Vite 6 + Vinxi
- **Маршрутизация**: TanStack Router (file-based)
- **Состояние**: TanStack Store
- **База данных**: Supabase PostgreSQL
- **AI-интеграция**: Google Gemini (через серверные функции)
- **Сборка**: Vite + Vinxi
- **Стили**: Tailwind CSS 4
- **Деплой**: Netlify

## Структура проекта

tanstack-template/
├── public/                  # Статические файлы (иконки, manifest)
├── src/
│   ├── api/                 # Серверные функции (Vinxi)
│   │   └── genAIResponse    # Обработчик запросов к Gemini
│   ├── components/          # Переиспользуемые компоненты
│   │   ├── ChatInput.tsx    # Поле ввода сообщения
│   │   ├── ChatMessage.tsx  # Отображение сообщения
│   │   ├── Sidebar.tsx      # Боковая панель
│   │   └── ...
│   ├── providers/           # Контексты и провайдеры
│   │   └── AuthProvider.tsx # Авторизация через Supabase
│   ├── routes/              # Маршруты приложения
│   │   ├── __root.tsx       # Главный макет
│   │   ├── index.tsx        # Главная страница
│   │   └── ...
│   ├── store/               # Локальное состояние
│   │   ├── store.ts         # Основной store
│   │   └── hooks.ts         # Кастомные хуки
│   ├── utils/               # Вспомогательные функции
│   │   ├── ai.ts            # Логика взаимодействия с AI
│   │   └── supabase.ts      # Клиент Supabase
│   ├── client.tsx           # Точка входа (клиент)
│   ├── router.tsx           # Конфигурация маршрутизатора
│   ├── sentry.ts            # Настройка Sentry (опционально)
│   ├── styles.css           # Глобальные стили
│   └── app.config.ts        # Конфигурация приложения
├── .env                     # Переменные окружения (локально)
├── .env.example             # Шаблон переменных
├── netlify.toml             # Конфигурация Netlify
├── package.json             # Зависимости и скрипты
├── postcss.config.ts        # Конфигурация PostCSS/Tailwind
├── tsconfig.json            # TypeScript
└── vite.config.js           # Конфигурация Vite/Vinxi
```

## Начало работы

### Предварительные требования

- Node.js v20.9+
- npm или yarn
- Аккаунт на [Google AI Studio](https://aistudio.google.com/) (для ключа Gemini)
- Аккаунт на [Supabase](https://supabase.com/) (для базы данных)

### Установка

1. **Клонируйте репозиторий:**
   ```bash
   git clone https://github.com/StanislavMal/tanstack-template.git
   cd tanstack-template
   ```

2. **Установите зависимости:**
   ```bash
   npm install
   ```

3. **Настройте переменные окружения:**
   ```bash
   cp .env.example .env
   ```
   
   Отредактируйте `.env`:
   ```env
   # Ключ Gemini (серверный, НЕ попадает в браузер!)
   GEMINI_API_KEY=ваш_ключ_от_gemini
   
   # Supabase (клиентские переменные)
   VITE_SUPABASE_URL=https://ваш-проект.supabase.co
   VITE_SUPABASE_ANON_KEY=ваш_anon_key
   
   # Sentry (опционально)
   VITE_SENTRY_DSN=ваш-dsn
   SENTRY_AUTH_TOKEN=ваш-auth-token
   ```

   > 🔒 **Важно**: Файл `.env` добавлен в `.gitignore`. Никогда не коммитьте его!

4. **Запустите сервер разработки:**
   ```bash
   npm run dev
   ```
   Приложение будет доступно по адресу: [http://localhost:3000](http://localhost:3000)

5. **Или используйте Netlify Dev:**
   ```bash
   npm install -g netlify-cli
   netlify dev
   ```
   Доступно по: [http://localhost:8888](http://localhost:8888)

## Настройка базы данных (Supabase)

1. Создайте проект на [supabase.com](https://supabase.com/)
2. Получите URL проекта и anon-ключ
3. Добавьте их в `.env` как `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`
4. В `src/providers/AuthProvider.tsx` уже используется `@supabase/supabase-js` — всё готово к работе

## Интеграция с Google Gemini

- Все вызовы к Gemini происходят **на сервере** через `createServerFn`.
- Ключ `GEMINI_API_KEY` используется только на сервере — это безопасно.
- Логика находится в `utils/ai.ts` → `genAIResponse`.

## Сборка и деплой

```bash
# Сборка для production
npm run build

# Просмотр сборки локально
npm run serve
```

После этого вы можете задеплоить проект на Netlify одним кликом (кнопка вверху) или через CLI.

## Лицензия

Проект распространяется под лицензией MIT.


### 🛠️ Developer Tools

Для упрощения анализа и рефакторинга проекта, мы предоставляем специальный скрипт для генерации полного контекста кода.

#### `generate-context.mjs`

Это вспомогательный скрипт, который автоматически собирает ключевую информацию о проекте в один файл.

**Что он делает:**
1.  Генерирует древовидную структуру проекта (исключая `node_modules`, `.git` и другие служебные папки).
2.  Собирает содержимое всех TypeScript/JSX/JavaScript файлов из папки `src/`.
3.  Сохраняет всё в один файл `PROJECT_CONTEXT.md`.

**Как использовать:**

1.  Убедитесь, что установлен `tree-node-cli`:
    ```bash
    npm install -g tree-node-cli
    ```

2.  Запустите скрипт из корня проекта:
    ```bash
    node generate-context.mjs
    ```

3.  После выполнения появится файл `PROJECT_CONTEXT.md`.

4.  Этот файл можно:
    -   Отправить ИИ-ассистенту для анализа.
    -   Приложить к задаче в трекере багов.
    -   Использовать для быстрого обзора проекта при наставничестве.

> 💡 **Зачем это нужно?**  
> Вместо того чтобы открывать десятки файлов вручную, вы можете сгенерировать один документ, содержащий всю суть вашего кода. Это экономит часы времени и позволяет точно передать состояние проекта.

#### `PROJECT_CONTEXT.md`

Этот файл является результатом работы `generate-context.mjs`. Он не добавляется в систему контроля версий (указан в `.gitignore`), так как генерируется динамически.

**Структура файла:**

# Project Structure
[результат команды tree]

# Key Files Content
[содержимое каждого .ts/.tsx/.js файла из src/]


---

Хотите адаптировать этот шаблон под свои нужды? Просто замените логику в `utils/ai.ts` или добавьте новые компоненты в `src/components/`.

Удачи в разработке! 🚀