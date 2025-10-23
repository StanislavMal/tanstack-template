// 📄 src/store/index.ts

// ИЗМЕНЕНИЕ: Экспортируем все именованные константы и типы явно
export { store, actions, selectors } from './store';
export type { State, Prompt, UserSettings, Conversation } from './store';
export * from './hooks';