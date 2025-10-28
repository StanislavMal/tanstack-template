// 📄 src/utils/markdown.ts

/**
 * Извлекает язык программирования из className элемента <code>
 * Поддерживает форматы: language-js, lang-python и т.д.
 */
export function extractLanguageFromCode(codeElement: HTMLElement): string {
  const className = codeElement.className || '';
  const match = className.match(/(?:language|lang)-(\w+)/);
  return match ? match[1] : '';
}

/**
 * Извлекает LaTeX код из KaTeX элемента
 * KaTeX хранит оригинальную формулу в атрибуте annotation
 */
export function extractLatexFromKatex(container: HTMLElement): string {
  const annotations: string[] = [];
  
  const annotationElements = container.querySelectorAll('annotation[encoding="application/x-tex"]');
  
  annotationElements.forEach(el => {
    const latex = el.textContent || '';
    if (latex) {
      annotations.push(latex);
    }
  });
  
  if (annotations.length > 0) {
    const katexDisplay = container.querySelector('.katex-display');
    if (katexDisplay) {
      return annotations.map(latex => `$$\n${latex}\n$$`).join('\n\n');
    }
    return annotations.map(latex => `$${latex}$`).join(' ');
  }
  
  return '';
}

/**
 * Конвертирует HTML таблицу в plain text с сохранением структуры
 * Использует символы Unicode для рисования границ
 */
export function extractTableAsPlainText(container: HTMLElement): string {
  const table = container.querySelector('table');
  if (!table) return '';
  
  const rows: string[][] = [];
  const columnWidths: number[] = [];
  
  const allRows = table.querySelectorAll('tr');
  allRows.forEach(tr => {
    const cells: string[] = [];
    const tdElements = tr.querySelectorAll('th, td');
    
    tdElements.forEach((td, index) => {
      const text = (td.textContent || '').trim();
      cells.push(text);
      
      if (!columnWidths[index] || text.length > columnWidths[index]) {
        columnWidths[index] = text.length;
      }
    });
    
    if (cells.length > 0) {
      rows.push(cells);
    }
  });
  
  if (rows.length === 0) return '';
  
  const padCell = (text: string, width: number): string => {
    return text.padEnd(width, ' ');
  };
  
  const createSeparator = (char: string): string => {
    return columnWidths.map(width => char.repeat(width + 2)).join('+');
  };
  
  let result = '';
  const separator = createSeparator('-');
  
  rows.forEach((row, rowIndex) => {
    if (rowIndex === 0 || rowIndex === 1) {
      result += '+' + separator + '+\n';
    }
    
    const cells = row.map((cell, i) => ' ' + padCell(cell, columnWidths[i]) + ' ');
    result += '|' + cells.join('|') + '|\n';
  });
  
  result += '+' + separator + '+\n';
  
  return result;
}

/**
 * Конвертирует HTML в чистый Markdown-текст
 * Сохраняет структуру списков, блоков кода, таблиц, чекбоксов и т.д.
 */
export function htmlToPlainText(element: HTMLElement): string {
  let result = '';
  
  function processNode(
    node: Node, 
    depth: number = 0, 
    orderedCounters: Map<number, number> = new Map()
  ): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.trim()) {
        result += text;
      }
      return;
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    
    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();
    
    // === СПИСКИ (UL/OL) ===
    if (tagName === 'ul' || tagName === 'ol') {
            
      if (tagName === 'ol') {
        const start = parseInt(el.getAttribute('start') || '1');
        orderedCounters.set(depth, start);
      }
      
      Array.from(el.children).forEach((child) => {
        if (child.tagName.toLowerCase() === 'li') {
          // ✅ Передаем информацию о том, что это список задач
          processNode(child, depth, orderedCounters);
        }
      });
      
      if (tagName === 'ol') {
        orderedCounters.delete(depth);
      }
      
      if (depth === 0) {
        result += '\n';
      }
      return;
    }
    
    // === ЭЛЕМЕНТЫ СПИСКА (LI) ===
    if (tagName === 'li') {
      const indent = '  '.repeat(depth);
      const parent = el.parentElement;
      const isOrdered = parent?.tagName.toLowerCase() === 'ol';
      
      // ✅ Проверяем наличие чекбокса
      const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
      
      if (checkbox) {
        // ✅ Список задач - форматируем как Markdown checkbox
        const isChecked = checkbox.checked;
        result += `${indent}- [${isChecked ? 'x' : ' '}] `;
        
        // Обрабатываем содержимое без чекбокса
        Array.from(el.childNodes).forEach((child) => {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const childEl = child as HTMLElement;
            // Пропускаем сам checkbox
            if (childEl.tagName.toLowerCase() === 'input') return;
            
            const childTag = childEl.tagName.toLowerCase();
            if (childTag === 'ul' || childTag === 'ol') {
              result += '\n';
              processNode(child, depth + 1, orderedCounters);
            } else {
              processNode(child, depth, orderedCounters);
            }
          } else {
            processNode(child, depth, orderedCounters);
          }
        });
        
        result += '\n';
        return;
      }
      
      // Обычный список
      if (isOrdered) {
        const counter = orderedCounters.get(depth) || 1;
        result += `${indent}${counter}. `;
        orderedCounters.set(depth, counter + 1);
      } else {
        const bullets = ['•', '◦', '▪'];
        const bullet = bullets[Math.min(depth, bullets.length - 1)];
        result += `${indent}${bullet} `;
      }
      
      let hasNestedList = false;
      
      Array.from(el.childNodes).forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const childEl = child as HTMLElement;
          const childTag = childEl.tagName.toLowerCase();
          
          if (childTag === 'ul' || childTag === 'ol') {
            hasNestedList = true;
            processNode(child, depth + 1, orderedCounters);
          } else {
            processNode(child, depth, orderedCounters);
          }
        } else {
          processNode(child, depth, orderedCounters);
        }
      });
      
      if (!hasNestedList) {
        result += '\n';
      }
      return;
    }
    
    // === ЗАГОЛОВКИ (H1-H6) ===
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      Array.from(el.childNodes).forEach((child) => {
        processNode(child, depth, orderedCounters);
      });
      result += '\n\n';
      return;
    }
    
    // === БЛОКИ (P, DIV, BLOCKQUOTE) ===
    if (['p', 'div', 'blockquote'].includes(tagName)) {
      if (tagName === 'div') {
        const directChildren = Array.from(el.children);
        const preChild = directChildren.find(child => child.tagName.toLowerCase() === 'pre');
        
        if (preChild) {
          let language = '';
          
          for (const child of directChildren) {
            if (child !== preChild) {
              const text = (child.textContent || '').trim();
              if (text.length > 0 && text.length < 20 && !text.toLowerCase().includes('cop')) {
                language = text;
                break;
              }
            }
          }
          
          if (!language) {
            const codeElement = preChild.querySelector('code');
            if (codeElement) {
              language = extractLanguageFromCode(codeElement);
            }
          }
          
          const codeElement = preChild.querySelector('code');
          const codeText = codeElement ? (codeElement.textContent || '').trim() : '';
          
          result += `\`\`\`${language}\n${codeText}\n\`\`\`\n\n`;
          return;
        }
      }
      
      Array.from(el.childNodes).forEach((child) => {
        processNode(child, depth, orderedCounters);
      });
      
      if (depth === 0) {
        result += '\n\n';
      }
      return;
    }
    
    // === ПЕРЕНОСЫ СТРОК ===
    if (tagName === 'br') {
      result += '\n';
      return;
    }
    
    // === БЛОКИ КОДА (PRE) ===
    if (tagName === 'pre') {
      const codeElement = el.querySelector('code');
      
      if (codeElement) {
        const language = extractLanguageFromCode(codeElement);
        const codeText = (codeElement.textContent || '').trim();
        
        result += `\`\`\`${language}\n${codeText}\n\`\`\`\n\n`;
      } else {
        result += el.textContent || '';
        result += '\n\n';
      }
      return;
    }
    
    // === ИНЛАЙН КОД ===
    if (tagName === 'code' && el.parentElement?.tagName.toLowerCase() !== 'pre') {
      result += el.textContent || '';
      return;
    }
    
    // === ТАБЛИЦЫ ===
    if (tagName === 'table') {
      result += '\n';
      Array.from(el.childNodes).forEach((child) => {
        processNode(child, depth, orderedCounters);
      });
      result += '\n';
      return;
    }
    
    if (tagName === 'tr') {
      Array.from(el.childNodes).forEach((child, index) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          processNode(child, depth, orderedCounters);
          if (index < el.childNodes.length - 1) {
            result += ' | ';
          }
        }
      });
      result += '\n';
      return;
    }
    
    if (tagName === 'th' || tagName === 'td') {
      Array.from(el.childNodes).forEach((child) => {
        processNode(child, depth, orderedCounters);
      });
      return;
    }
    
    // === ФОРМАТИРОВАНИЕ ТЕКСТА ===
    if (tagName === 'strong' || tagName === 'b' || tagName === 'em' || tagName === 'i') {
      Array.from(el.childNodes).forEach((child) => {
        processNode(child, depth, orderedCounters);
      });
      return;
    }
    
    // === ССЫЛКИ ===
    if (tagName === 'a') {
      Array.from(el.childNodes).forEach((child) => {
        processNode(child, depth, orderedCounters);
      });
      return;
    }
    
    // === ГОРИЗОНТАЛЬНАЯ ЛИНИЯ ===
    if (tagName === 'hr') {
      result += '\n---\n\n';
      return;
    }
    
    // === ЧЕКБОКСЫ (пропускаем, обрабатываются в <li>) ===
    if (tagName === 'input' && el.getAttribute('type') === 'checkbox') {
      return;
    }
    
    // === FALLBACK ===
    Array.from(el.childNodes).forEach((child) => {
      processNode(child, depth, orderedCounters);
    });
  }
  
  processNode(element);
  
  return result
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n+$/g, '\n')
    .trim();
}