// 📄 src/utils/markdown-sanitize.ts

import { defaultSchema } from 'rehype-sanitize';

/**
 * Схема санитизации для безопасного отображения Markdown
 * Расширяет дефолтную схему rehype-sanitize
 * Поддержка: таблицы (GFM), математика (KaTeX), code highlighting
 */
export const markdownSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': [
      ...(defaultSchema.attributes?.['*'] || []), 
      'className', 
      'class',
      'style' // ✅ Нужно для KaTeX inline стилей
    ],
    code: [
      ...(defaultSchema.attributes?.code || []), 
      'className', 
      'class', 
      ['data*']
    ],
    pre: [
      ...(defaultSchema.attributes?.pre || []), 
      'className', 
      'class'
    ],
    ol: [
      ...(defaultSchema.attributes?.ol || []), 
      'start', 
      'type'
    ],
    ul: [
      ...(defaultSchema.attributes?.ul || []), 
      'type'
    ],
    // ✅ Таблицы GFM
    table: ['className', 'class'],
    thead: ['className', 'class'],
    tbody: ['className', 'class'],
    tr: ['className', 'class'],
    th: ['className', 'class', 'align', 'scope'],
    td: ['className', 'class', 'align'],
    // ✅ Математика KaTeX
    span: ['className', 'class', 'style', 'aria-hidden'],
    svg: ['className', 'class', 'xmlns', 'width', 'height', 'viewBox', 'style'],
    path: ['d', 'style'],
    use: ['href'],
    g: ['className', 'class'],
    rect: ['className', 'class', 'x', 'y', 'width', 'height', 'style'],
    // ✅ Зачёркнутый текст (GFM)
    del: ['className', 'class'],
    // ✅ Чекбоксы в списках задач (GFM)
    input: ['type', 'checked', 'disabled'],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    // Базовые элементы
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'ul', 'ol', 'li',
    'blockquote',
    'code', 'pre',
    'strong', 'em', 'del', 'ins',
    'a', 'img',
    'div', 'span',
    // ✅ Таблицы
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    // ✅ Математика (KaTeX генерирует SVG)
    'svg', 'path', 'use', 'g', 'rect', 'line', 'circle',
    // ✅ GFM: зачёркивание и чекбоксы
    'input',
  ],
  // ✅ Разрешаем все протоколы для математических символов
  protocols: {
    ...defaultSchema.protocols,
    href: [...(defaultSchema.protocols?.href || []), 'http', 'https', 'mailto'],
  },
};