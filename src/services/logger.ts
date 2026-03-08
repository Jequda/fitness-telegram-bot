import fs from 'node:fs';
import { getRuntimePath } from '../utils/paths.js';

const runtimeDir = getRuntimePath();
const logFilePath = getRuntimePath('app.log');

function ensureRuntimeDir() {
  if (!fs.existsSync(runtimeDir)) {
    fs.mkdirSync(runtimeDir, { recursive: true });
  }
}

function stringifyMeta(meta?: Record<string, unknown>) {
  if (!meta) return '';

  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ' {"meta":"unserializable"}';
  }
}

function writeLine(level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: Record<string, unknown>) {
  ensureRuntimeDir();
  const line = `${new Date().toISOString()} [${level}] ${message}${stringifyMeta(meta)}\n`;
  fs.appendFileSync(logFilePath, line, 'utf-8');
  const target = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
  target(line.trimEnd());
}

export function getRuntimeDir() {
  ensureRuntimeDir();
  return runtimeDir;
}

export function getLogFilePath() {
  ensureRuntimeDir();
  return logFilePath;
}

export function initLogger() {
  ensureRuntimeDir();
  writeLine('INFO', 'Logger initialized', { logFilePath });
}

export function logInfo(message: string, meta?: Record<string, unknown>) {
  writeLine('INFO', message, meta);
}

export function logWarn(message: string, meta?: Record<string, unknown>) {
  writeLine('WARN', message, meta);
}

export function logError(message: string, meta?: Record<string, unknown>) {
  writeLine('ERROR', message, meta);
}
