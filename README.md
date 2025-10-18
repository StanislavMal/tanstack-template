# AI-чат на TanStack

Чат-приложение с интеграцией **Google Gemini** и базой данных **Supabase**. Отлично подходит для быстрого старта проекта с искусственным интеллектом.

**⚡ Посмотреть демо:** [https://tanstack-starter.netlify.app/](https://tanstack-starter.netlify.app/)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/StanislavMal/tanstack-template)

---

## Особенности

- 🤖 Работает с **Google Gemini API**
- ✨ Поддержка Markdown с подсветкой кода
- ⚡ Потоковая передача ответов (эффект "печатной машинки")
- 🔐 Безопасные серверные вызовы (ключ Gemini не попадает в браузер)
- 💬 Управление диалогами через **Supabase PostgreSQL**
- 🔑 Управление API-ключами
- 📱 Адаптивный интерфейс для всех устройств
- 🎨 Современный UI на Tailwind CSS
- 🧠 Централизованное управление состоянием через **TanStack Store**

---

## Архитектура

- **Фронтенд**: React 19 + Vite 6 + Vinxi  
- **Маршрутизация**: TanStack Router (file-based)  
- **Состояние**: TanStack Store  
- **База данных**: Supabase PostgreSQL  
- **AI-интеграция**: Google Gemini (через серверные функции)  
- **Сборка**: Vite + Vinxi  
- **Стили**: Tailwind CSS 4  
- **Деплой**: Netlify  

---

## Структура проекта

```
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

---

## Начало работы

### Предварительные требования

- **Node.js v20.9+**
- **npm или yarn**
- Аккаунт на [Google AI Studio](https://aistudio.google.com/) (для ключа Gemini)
- Аккаунт на [Supabase](https://supabase.com/) (для базы данных)

---

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
   **Важно:** Файл `.env` добавлен в `.gitignore`. Никогда не коммитьте его!

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

---

### Настройка базы данных (Supabase)

1. Создайте проект на [supabase.com](https://supabase.com).
2. Получите URL проекта и anon-ключ.
3. Добавьте их в `.env` как `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`.
4. В `src/providers/AuthProvider.tsx` уже используется `@supabase/supabase-js` — всё готово к работе.

---

### Интеграция с Google Gemini

- Все вызовы к Gemini происходят **на сервере** через `createServerFn`.
- Ключ `GEMINI_API_KEY` используется только на сервере — это безопасно.
- Логика находится в `utils/ai.ts` → `genAIResponse`.

---

## Сборка и деплой

```bash
# Сборка для production
npm run build

# Просмотр сборки локально
npm run serve
```

После этого вы можете задеплоить проект на Netlify одним кликом (кнопка вверху) или через CLI.

---

## Лицензия

Проект распространяется под лицензией **MIT**.

---

## Developer Tools

Для анализа и документирования кодовой базы проекта доступны два скрипта:

### 1. `universal-context-scout.mjs`

**Назначение:** Первичная разведка незнакомых проектов  
**Особенности:**
- Собирает ВСЮ информацию о проекте.
- Обнаруживает технологический стек.
- Показывает полную структуру "как есть".

**Использование:**
```bash
node universal-context-scout.mjs
```
Создает файл `PROJECT_SCOUT_REPORT.md` с полным анализом проекта.

---

### 2. `generate-context-optimized.mjs`

**Назначение:** Оптимизированная генерация контекста для текущего проекта  
**Особенности:**
- Исключает дублирование кода.
- Суммаризирует автогенерируемые файлы.
- Пропускает бинарные и служебные файлы.
- Создает чистый, структурированный вывод.

**Использование:**
```bash
node generate-context-optimized.mjs
```
Создает файл `PROJECT_CONTEXT.md` с релевантной информацией для AI-ассистентов.

---

### Workflow

- Для новых проектов: используйте `universal-context-scout.mjs` для разведки.
- Для текущего проекта: используйте `generate-context-optimized.mjs` для регулярного использования.

---

💡 **Совет:** Хотите адаптировать этот шаблон под свои нужды? Просто замените логику в `utils/ai.ts` или добавьте новые компоненты в `src/components/`.

Удачи в разработке! 🚀