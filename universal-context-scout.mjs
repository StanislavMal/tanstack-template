// universal-context-scout.mjs
import fs from 'fs';
import path from 'path';

// МИНИМАЛЬНЫЕ исключения - собираем ВСЁ для анализа
const IGNORE_PATTERNS = [
  'node_modules',
  '.git', 
  'dist',
  'build',
  '.cache',
  '.env',
  'package-lock.json',
  'yarn.lock',
  'generate-context.mjs',
  'PROJECT_CONTEXT.md'
];

function detectTechStack() {
  const stack = {
    framework: 'unknown',
    bundler: 'unknown',
    styling: 'unknown',
    testing: 'unknown',
    features: []
  };
  
  const files = fs.readdirSync('.');
  
  // Фреймворки
  if (files.includes('next.config.js')) stack.framework = 'Next.js';
  else if (files.includes('nuxt.config.ts')) stack.framework = 'Nuxt.js';
  else if (files.includes('angular.json')) stack.framework = 'Angular';
  else if (files.includes('vue.config.js')) stack.framework = 'Vue';
  else if (files.includes('svelte.config.js')) stack.framework = 'Svelte';
  else if (files.includes('remix.config.js')) stack.framework = 'Remix';
  else if (files.includes('vite.config.js')) stack.framework = 'Vite + React';
  
  // Бандлеры
  if (files.includes('webpack.config.js')) stack.bundler = 'Webpack';
  else if (files.includes('vite.config.js')) stack.bundler = 'Vite';
  else if (files.includes('rollup.config.js')) stack.bundler = 'Rollup';
  
  // Стилизация
  if (files.includes('tailwind.config.js')) stack.styling = 'Tailwind';
  if (files.includes('postcss.config.js')) stack.features.push('PostCSS');
  if (files.includes('sass') || files.includes('scss')) stack.features.push('Sass');
  
  // Тестирование
  if (files.includes('jest.config.js')) stack.testing = 'Jest';
  if (files.includes('cypress.json')) stack.features.push('Cypress');
  
  return stack;
}

function scanEverything(dir, depth = 0) {
  let result = '';
  const indent = '  '.repeat(depth);
  
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (IGNORE_PATTERNS.includes(file)) continue;
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        result += `${indent}📁 ${file}/\n`;
        result += scanEverything(fullPath, depth + 1);
      } else {
        // Читаем ВСЕ файлы кроме бинарных
        if (!file.match(/\.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot|mp4|mp3|pdf|zip|tar|gz)$/)) {
          result += `${indent}📄 ${file}\n`;
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            // Для очень больших файлов - ограничиваем длину
            const displayContent = content.length > 50000 
              ? content.substring(0, 50000) + `\n// ... [TRUNCATED: ${content.length} chars total]`
              : content;
              
            result += `${indent}--- BEGIN ${file} ---\n`;
            result += displayContent;
            result += `\n${indent}--- END ${file} ---\n\n`;
          } catch (err) {
            result += `${indent}// Error reading: ${err.message}\n\n`;
          }
        } else {
          result += `${indent}📄 ${file} (binary)\n`;
        }
      }
    }
  } catch (err) {
    result += `${indent}// Error: ${err.message}\n`;
  }
  
  return result;
}

// Собираем полную информацию
const techStack = detectTechStack();
const fullStructure = scanEverything('.');

const context = `
# PROJECT SCOUT REPORT
Generated: ${new Date().toISOString()}

## Detected Tech Stack
- Framework: ${techStack.framework}
- Bundler: ${techStack.bundler} 
- Styling: ${techStack.styling}
- Testing: ${techStack.testing}
- Features: ${techStack.features.join(', ') || 'None detected'}

## Complete Project Structure & Content
${fullStructure}

## Recommendations for Optimized Script:
<!-- AI will analyze this and suggest specific optimizations -->
`;

fs.writeFileSync('PROJECT_SCOUT_REPORT.md', context);
console.log('🔍 Scout report generated: PROJECT_SCOUT_REPORT.md');
console.log('📊 Tech stack detected:', techStack);