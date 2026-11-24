import { mkdirSync, copyFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const srcDir = join(rootDir, 'node_modules', '@yowasp', 'clang', 'gen');
const destDir = join(rootDir, 'public', 'compiler');

if (!existsSync(srcDir)) {
  console.warn('[sync-compiler-assets] @yowasp/clang/gen not found; skipping.');
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });

const files = readdirSync(srcDir);
let totalBytes = 0;

for (const file of files) {
  const srcPath = join(srcDir, file);
  const destPath = join(destDir, file);
  const srcStat = statSync(srcPath);
  if (!srcStat.isFile()) continue;

  const needsCopy =
    !existsSync(destPath) || statSync(destPath).size !== srcStat.size;

  if (needsCopy) {
    copyFileSync(srcPath, destPath);
  }
  totalBytes += srcStat.size;
}

console.log(
  `[sync-compiler-assets] Synced ${files.length} compiler files (${(totalBytes / (1024 * 1024)).toFixed(1)} MB) to public/compiler/`
);
