import * as fs from 'node:fs';
import * as path from 'node:path';
import { glob } from 'glob';

export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

export function dirExists(dirPath: string): boolean {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

export function writeFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf-8');
}

export async function getMarkdownFiles(
  rootDir: string,
  subPath?: string
): Promise<string[]> {
  const searchPath = subPath ? path.join(rootDir, subPath) : rootDir;
  const pattern = path.join(searchPath, '**/*.md');

  const files = await glob(pattern, {
    ignore: [
      '**/node_modules/**',
      '**/_book/**',
      '**/dist/**',
      '**/.git/**',
    ],
    nodir: true,
  });

  return files.map(f => path.relative(rootDir, f));
}

export async function getAllFiles(
  rootDir: string,
  extensions: string[] = ['.md']
): Promise<string[]> {
  const patterns = extensions.map(ext => path.join(rootDir, `**/*${ext}`));

  const allFiles: string[] = [];
  for (const pattern of patterns) {
    const files = await glob(pattern, {
      ignore: [
        '**/node_modules/**',
        '**/_book/**',
        '**/dist/**',
        '**/.git/**',
        '**/SUMMARY.md',
        '**/README.md',
      ],
      nodir: true,
    });
    allFiles.push(...files);
  }

  return allFiles.map(f => path.relative(rootDir, f));
}

export function normalizePath(inputPath: string): string {
  return inputPath
    .replace(/\\/g, '/')
    .replace(/\/+$/, '')
    .replace(/^\.\//, '');
}

export function getDirectory(filePath: string): string {
  return path.dirname(filePath);
}

export function joinPaths(...segments: string[]): string {
  return path.join(...segments).replace(/\\/g, '/');
}

export function getBasename(filePath: string, includeExt = false): string {
  return includeExt ? path.basename(filePath) : path.basename(filePath, path.extname(filePath));
}

export function copyDirSync(src: string, dest: string): void {
  if (!dirExists(src)) return;

  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
}

export function removeDirSync(dirPath: string): void {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

export function renameDirSync(src: string, dest: string): void {
  if (!dirExists(src)) return;
  removeDirSync(dest);
  fs.renameSync(src, dest);
}

export function restoreDirSync(src: string, dest: string): void {
  removeDirSync(dest);
  renameDirSync(src, dest);
}
