// generate-context-optimized.mjs
import fs from 'fs';
import path from 'path';

const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.cache',
  '.netlify',
  '.env',
  'package-lock.json',
  'yarn.lock',
  'README.md',
  'generate-context-optimized.mjs',
  'PROJECT_CONTEXT.md',
  'PROJECT_SCOUT_REPORT.md',
  'universal-context-scout.mjs',
  'LICENSE',
  '.gitignore',
  'tanstack-starter-preview.jpg',
  'export-supabase-schema.mjs',
  'SUPABASE_SCHEMA.md'
];

const BINARY_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.ico', '.svg',
  '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mp3'
];

function shouldIgnore(name) {
  return IGNORE_PATTERNS.includes(name);
}

function isBinaryFile(filename) {
  return BINARY_EXTENSIONS.some(ext => filename.endsWith(ext));
}

function generateTreeStructure(dir, depth = 0, prefix = '') {
  let result = '';
  const indent = '  '.repeat(depth);
  const connector = depth === 0 ? '' : '├── ';
  
  try {
    const items = fs.readdirSync(dir);
    const validItems = items.filter(item => !shouldIgnore(item));
    
    validItems.forEach((item, index) => {
      const fullPath = path.join(dir, item);
      const isLast = index === validItems.length - 1;
      const currentPrefix = depth === 0 ? '' : (isLast ? '└── ' : '├── ');
      const nextPrefix = depth === 0 ? '' : (isLast ? '    ' : '│   ');
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        result += `${prefix}${currentPrefix}📁 ${item}/\n`;
        result += generateTreeStructure(fullPath, depth + 1, prefix + nextPrefix);
      } else {
        if (isBinaryFile(item)) {
          result += `${prefix}${currentPrefix}📄 ${item} (binary)\n`;
        } else {
          result += `${prefix}${currentPrefix}📄 ${item}\n`;
        }
      }
    });
  } catch (err) {
    result += `${prefix}└── // Error reading directory: ${err.message}\n`;
  }
  
  return result;
}

function summarizeRouteTree(content) {
  const routes = [];
  const routeMatches = content.match(/routeTree\.(.*?)\s*=/g);
  
  if (routeMatches) {
    routeMatches.forEach(match => {
      const routeName = match.replace('routeTree.', '').replace(' =', '');
      if (routeName && !routeName.includes('root')) {
        routes.push(`/${routeName}`);
      }
    });
  }
  
  return `// Автогенерируемый файл TanStack Router
// Используемые маршруты: ${routes.join(', ')}`;
}

function summarizePackageJson(content) {
  try {
    const pkg = JSON.parse(content);
    const importantDeps = [
      '@tanstack/react-router', '@tanstack/react-start', 'react', 'react-dom',
      '@google/generative-ai', '@supabase/supabase-js', 'tailwindcss'
    ];
    
    const importantDevDeps = [
      '@tanstack/router-plugin', '@vitejs/plugin-react', 'typescript', 'vite'
    ];
    
    const filteredDeps = Object.keys(pkg.dependencies || {})
      .filter(dep => importantDeps.some(important => dep.includes(important)));
    
    const filteredDevDeps = Object.keys(pkg.devDependencies || {})
      .filter(dep => importantDevDeps.some(important => dep.includes(important)));
    
    return `{
  "name": "${pkg.name}",
  "scripts": ${JSON.stringify(pkg.scripts, null, 2)},
  "dependencies": ${JSON.stringify(filteredDeps, null, 2)},
  "devDependencies": ${JSON.stringify(filteredDevDeps, null, 2)}
}`;
  } catch {
    return content;
  }
}

function shouldSkipContent(filePath, content) {
  const filename = path.basename(filePath);
  
  if (filename === 'routeTree.gen.ts') {
    return summarizeRouteTree(content);
  }
  
  if (filename === 'package.json') {
    return summarizePackageJson(content);
  }
  
  // Пропускаем большие JSON файлы кроме package.json
  if (filename.endsWith('.json') && filename !== 'package.json') {
    return `// Файл ${filename} (содержимое пропущено для экономии места)`;
  }
  
  return null;
}

function scanDir(dir, depth = 0, isRootScan = false) {
  let result = '';
  const indent = '  '.repeat(depth);
  
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      
      if (shouldIgnore(file)) continue;
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // При корневом сканировании пропускаем уже обработанные папки
        if (isRootScan && ['src', 'public', '.vscode'].includes(file)) {
          continue;
        }
        
        result += `${indent}📁 ${file}/\n`;
        result += scanDir(fullPath, depth + 1, isRootScan);
      } else {
        if (isBinaryFile(file)) {
          result += `${indent}📄 ${file} (binary)\n`;
          continue;
        }
        
        // Обрабатываем только релевантные файлы
        const shouldRead = [
          '.ts', '.tsx', '.js', '.jsx', '.json', '.md',
          '.css', '.scss', '.config.js', '.config.ts'
        ].some(ext => file.endsWith(ext)) ||
        [
          'package.json', '.env.example', 'netlify.toml',
          'postcss.config.ts', 'app.config.ts', 'vite.config.js',
          'tsconfig.json'
        ].includes(file);
        
        if (shouldRead) {
          result += `${indent}📄 ${file}\n`;
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            
            const skippedContent = shouldSkipContent(fullPath, content);
            if (skippedContent) {
              result += `${indent}${skippedContent}\n\n`;
              continue;
            }
            
            result += `${indent}--- BEGIN ${file} ---\n`;
            result += content;
            result += `\n${indent}--- END ${file} ---\n\n`;
          } catch (err) {
            result += `${indent}// Error reading file: ${err.message}\n\n`;
          }
        } else {
          result += `${indent}📄 ${file} (skipped)\n`;
        }
      }
    }
  } catch (err) {
    result += `${indent}// Error reading directory: ${err.message}\n`;
  }
  
  return result;
}

// Генерируем контекст
console.log('🌳 Generating project structure...');
const treeOutput = generateTreeStructure('.');

const context = `
# Project Structure
${treeOutput}

# Project Configuration
${scanDir('.', 0, true)}

# Source Code Architecture
${scanDir('./src')}

# Public Assets
${scanDir('./public')}
`;

// Сохраняем в файл
fs.writeFileSync('PROJECT_CONTEXT.md', context);
console.log('✅ Optimized context generated in PROJECT_CONTEXT.md');
console.log('📊 Tailored for: TanStack Start + React + Vite + Gemini + Supabase');
console.log('🚫 Excluded: Binary files, generated code, Netlify internals');
console.log('💡 Features: Route tree summarization, no duplicates');
console.log('🌳 Using custom tree generator (no external dependencies)');