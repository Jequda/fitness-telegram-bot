import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const projectRoot = path.resolve(currentDir, '..', '..');

export function getProjectRoot() {
  return projectRoot;
}

export function getRuntimePath(...segments: string[]) {
  return path.join(projectRoot, '.runtime', ...segments);
}
