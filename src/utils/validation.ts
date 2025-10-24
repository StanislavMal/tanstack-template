// 📄 src/utils/validation.ts

/**
 * Утилиты для валидации данных перед отправкой в Supabase
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Валидация названия промпта
 */
export function validatePromptName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'Prompt name cannot be empty' };
  }
  
  if (name.length > 100) {
    return { isValid: false, error: 'Prompt name must be less than 100 characters' };
  }
  
  return { isValid: true };
}

/**
 * Валидация содержимого промпта
 */
export function validatePromptContent(content: string): ValidationResult {
  if (!content || !content.trim()) {
    return { isValid: false, error: 'Prompt content cannot be empty' };
  }
  
  if (content.length > 10000) {
    return { isValid: false, error: 'Prompt content must be less than 10,000 characters' };
  }
  
  return { isValid: true };
}

/**
 * Валидация названия чата
 */
export function validateConversationTitle(title: string): ValidationResult {
  if (!title || !title.trim()) {
    return { isValid: false, error: 'Conversation title cannot be empty' };
  }
  
  if (title.length > 200) {
    return { isValid: false, error: 'Conversation title must be less than 200 characters' };
  }
  
  return { isValid: true };
}

/**
 * Валидация содержимого сообщения
 */
export function validateMessageContent(content: string): ValidationResult {
  if (!content || !content.trim()) {
    return { isValid: false, error: 'Message cannot be empty' };
  }
  
  if (content.length > 50000) {
    return { isValid: false, error: 'Message must be less than 50,000 characters' };
  }
  
  return { isValid: true };
}

/**
 * Санитизация строки (удаление лишних пробелов и опасных символов)
 */
export function sanitizeString(str: string): string {
  return str
    .trim()
    .replace(/\s+/g, ' ') // Множественные пробелы → один пробел
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Удаляем управляющие символы
}