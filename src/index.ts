import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { registerCommands } from './handlers/commands.js';
import { registerOnboarding } from './handlers/onboarding.js';
import { getLogFilePath, initLogger, logError, logInfo } from './services/logger.js';
import { registerSchedulers } from './services/scheduler.js';
import { initializeDb, closeDb, getDatabaseConfig, getMaskedDatabaseUrl } from './services/db.js';
import { initializeState, readState, writeState } from './services/storage.js';

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error('BOT_TOKEN not found in .env');
}

await initializeDb();
initLogger();
const storageBackend = await initializeState();
const dbConfig = getDatabaseConfig();
logInfo('Application bootstrapping started', {
  storageBackend,
  logFilePath: getLogFilePath(),
  timezone: process.env.TIMEZONE || 'Europe/Moscow',
  model: process.env.OPENAI_MODEL || 'gpt-5-mini',
  databaseUrl: getMaskedDatabaseUrl(),
  databaseHost: dbConfig.host,
  databasePort: dbConfig.port,
  databaseName: dbConfig.database,
  databaseUser: dbConfig.user
});

const bot = new Telegraf(token);

bot.use(async (ctx, next) => {
  const chatId = ctx.chat?.id;
  if (chatId) {
    const state = await readState(chatId);
    if (state.chatId !== chatId) {
      state.chatId = chatId;
      await writeState(state);
      logInfo('Chat id stored', { chatId });
    }
  }

  logInfo('Incoming update', {
    updateType: ctx.updateType,
    chatId: ctx.chat?.id,
    fromId: ctx.from?.id
  });

  await next();
});

bot.catch((error, ctx) => {
  const message = error instanceof Error ? error.message : 'Unknown bot error';
  logError('Unhandled Telegraf error', {
    error: message,
    updateType: ctx.updateType,
    chatId: ctx.chat?.id,
    fromId: ctx.from?.id
  });
});

registerCommands(bot);
registerOnboarding(bot);
registerSchedulers(bot);

if (process.argv.includes('--test-flow')) {
  logInfo('Test flow mode enabled; bot not launched');
} else {
  await bot.launch();
  logInfo('Bot launched');
}

process.once('SIGINT', async () => {
  logInfo('Received SIGINT, stopping bot');
  bot.stop('SIGINT');
  await closeDb();
});

process.once('SIGTERM', async () => {
  logInfo('Received SIGTERM, stopping bot');
  bot.stop('SIGTERM');
  await closeDb();
});

process.on('uncaughtException', (error) => {
  logError('Uncaught exception', { error: error.message, stack: error.stack });
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  logError('Unhandled rejection', { error: message });
});
