// generate-context-optimized.mjs (Версия 2.0 - Единый проход)
import fs from 'fs';
import path from 'path';

// --- КОНФИГУРАЦИЯ ---

const IGNORE_LIST = [
  'node_modules', '.git', 'dist', 'build', '.cache', '.netlify', '.env', 'pnpm-lock.yaml',
  'package-lock.json', 'yarn.lock', 'README.md', 'LICENSE', '.gitignore', 'PROJECT_SCOUT_REPORT.md', 'PROJECT_CONTEXT.md', 
  // Игнорируем сами скрипты-сборщики
  path.basename(import.meta.url.substring(7)), // Игнорирует сам себя (для Windows/Linux)
  'export-supabase-schema.mjs', 'SUPABASE_SCHEMA.md', 'universal-context-scout.mjs', 'generate_project_summary.mjs', 'project_summary.txt', 
  // Игнорируем специфичные для IDE/OS файлы
  '.DS_Store', 'Thumbs.db'
];

const BINARY_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mp3'
];

// Файлы, которые нужно суммировать, а не показывать полностью
const SUMMARIZE_FILES = {
  'renovate.json': (content) => '// Файл renovate.json (содержимое пропущено для экономии места)',
  'tsconfig.json': (content) => '// Файл tsconfig.json (содержимое пропущено для экономии места)',
  'routeTree.gen.ts': (content) => '// Автогенерируемый файл TanStack Router\n// Используемые маршруты: ', // Упрощено, т.к. дерево уже показывает все
  'manifest.json': (content) => '// Файл manifest.json (содержимое пропущено для экономии места)',
};

// Файлы, которые нужно пропустить полностью, даже если они текстовые
const SKIP_CONTENT_FILES = [
    'robots.txt'
];

// --- ЛОГИКА ---

function scanDirectory(dir, prefix = '') {
  let tree = '';
  let contents = '';

  const items = fs.readdirSync(dir).filter(item => !IGNORE_LIST.includes(item));

  items.forEach((item, index) => {
    const fullPath = path.join(dir, item);
    const isLast = index === items.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const nextPrefix = prefix + (isLast ? '    ' : '│   ');

    try {
      const stat = fs.statSync(fullPath);
      const relativePath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');

      if (stat.isDirectory()) {
        tree += `${prefix}${connector}📁 ${item}/\n`;
        const result = scanDirectory(fullPath, nextPrefix);
        tree += result.tree;
        contents += result.contents;
      } else {
        const isBinary = BINARY_EXTENSIONS.some(ext => item.endsWith(ext));
        tree += `${prefix}${connector}📄 ${item}${isBinary ? ' (binary)' : ''}\n`;

        if (!isBinary) {
          if (SKIP_CONTENT_FILES.includes(item)) {
             contents += `📄 ${relativePath} (skipped)\n\n`;
             return;
          }

          const fileContent = fs.readFileSync(fullPath, 'utf8');

          if (SUMMARIZE_FILES[item]) {
            contents += `📄 ${relativePath}\n${SUMMARIZE_FILES[item](fileContent)}\n\n`;
          } else {
            contents += `# ${relativePath}\n`;
            contents += `--- BEGIN ${relativePath} ---\n`;
            contents += fileContent.trim();
            contents += `\n--- END ${relativePath} ---\n\n`;
          }
        }
      }
    } catch (err) {
      // Игнорируем ошибки для недоступных файлов (например, системных)
    }
  });

  return { tree, contents };
}

// --- ГЕНЕРАЦИЯ ---
console.log('🚀 Запуск сканирования проекта...');

const { tree, contents } = scanDirectory('.');

const finalOutput = `# Project Structure
${tree}

# File Contents
${contents}`;

fs.writeFileSync('PROJECT_CONTEXT.md', finalOutput.trim());

console.log('✅ Контекст проекта успешно сгенерирован в PROJECT_CONTEXT.md');
console.log('✨ Особенности: Единый проход, нет дублирования, чистота и порядок!');