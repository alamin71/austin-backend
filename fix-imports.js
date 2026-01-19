#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Recursively find all .ts files in src/
function findFiles(dir, pattern = /\.ts$/) {
     let files = [];
     const items = fs.readdirSync(dir);
     
     items.forEach(item => {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !fullPath.includes('node_modules')) {
               files = files.concat(findFiles(fullPath, pattern));
          } else if (pattern.test(fullPath)) {
               files.push(fullPath);
          }
     });
     
     return files;
}

// Fix imports by adding .js extension
function fixImportsInFile(filePath) {
     let content = fs.readFileSync(filePath, 'utf-8');
     const original = content;
     
     // Match relative imports and append .js if missing
     content = content.replace(
          /from\s+(['"])(\.[^'\"]+?)(?<!\.js)\1/g,
          'from $1$2.js$1'
     );
     // Cleanup any double quotes introduced by earlier runs
     content = content.replace(/\.js''/g, ".js'").replace(/\.js\"\"/g, '.js"');
     // Normalize config import to explicit index file
     content = content.replace(/config\.js(['"])/g, 'config/index.js$1');
     
     if (content !== original) {
          fs.writeFileSync(filePath, content, 'utf-8');
          console.log(`✓ Fixed imports in ${filePath}`);
     }
}

// Main
const srcDir = path.join(__dirname, 'src');
const files = findFiles(srcDir);

console.log(`Found ${files.length} TypeScript files. Fixing imports...`);
files.forEach(fixImportsInFile);
console.log('✓ Done!');
