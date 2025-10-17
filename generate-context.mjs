// generate-context.mjs
import fs from 'fs';
import path from 'path';

const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.cache',
  '.env',
  'package-lock.json',
  'yarn.lock',
  'tsconfig.json',
  'vite.config.js',
  'postcss.config.ts',
  'app.config.ts',
  'netlify.toml',
  'renovate.json'
];

function shouldIgnore(name) {
  return IGNORE_PATTERNS.includes(name);
}

function scanDir(dir, depth = 0) {
  let result = '';
  const indent = '  '.repeat(depth);
  
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (shouldIgnore(file)) continue;
      
      if (stat.isDirectory()) {
        result += `${indent}📁 ${file}/\n`;
        result += scanDir(fullPath, depth + 1);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        result += `${indent}📄 ${file}\n`;
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          result += `${indent}--- BEGIN ${file} ---\n`;
          result += content;
          result += `\n${indent}--- END ${file} ---\n\n`;
        } catch (err) {
          result += `${indent}// Error reading file: ${err.message}\n\n`;
        }
      }
    }
  } catch (err) {
    result += `${indent}// Error reading directory: ${err.message}\n`;
  }
  
  return result;
}

// Генерируем контекст
let treeOutput = 'Not available (tree-node-cli not installed or error occurred)\n';

try {
  // Используем динамический import для child_process
  const { execSync } = await import('child_process');
  treeOutput = new TextDecoder().decode(
    execSync('npx tree-node-cli -I "node_modules|.git|.cache|dist|build"')
  );
} catch (err) {
  treeOutput = `Error running tree command:\n${err.message}\n`;
}

const context = `
# Project Structure
${treeOutput}

# Key Files Content
${scanDir('./src')}
`;

// Сохраняем в файл
fs.writeFileSync('PROJECT_CONTEXT.md', context);
console.log('✅ Context generated in PROJECT_CONTEXT.md');