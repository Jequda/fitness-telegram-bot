import https from 'node:https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { UserProfile } from '../types/index.js';

const OPENAI_HOST = 'api.openai.com';
const COMPLETIONS_PATH = '/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

function buildSystemPrompt(profile: UserProfile): string {
  const lines = [
    'Ты опытный персональный тренер и нутрициолог.',
    'Общайся на русском языке, кратко и по делу.',
    'Давай конкретные практические советы по тренировкам, питанию и восстановлению.',
    '',
    'Профиль клиента:'
  ];
  if (profile.name) lines.push(`Имя: ${profile.name}`);
  if (profile.sex) lines.push(`Пол: ${profile.sex === 'male' ? 'мужчина' : 'женщина'}`);
  if (profile.age) lines.push(`Возраст: ${profile.age} лет`);
  if (profile.heightCm) lines.push(`Рост: ${profile.heightCm} см`);
  if (profile.weightKg) lines.push(`Вес: ${profile.weightKg} кг`);
  if (profile.goal) lines.push(`Цель: ${profile.goal}`);
  if (profile.goalTargetWeeks) lines.push(`Срок: ${profile.goalTargetWeeks} недель`);
  if (profile.experienceLevel) lines.push(`Опыт: ${profile.experienceLevel}`);
  if (profile.activityLevel) lines.push(`Активность: ${profile.activityLevel}`);
  if (profile.equipment?.length) lines.push(`Инвентарь: ${profile.equipment.join(', ')}`);
  if (profile.workoutDaysPerWeek) lines.push(`Тренировок в неделю: ${profile.workoutDaysPerWeek}`);
  if (profile.workoutMinutesPerDay) lines.push(`Минут на тренировку: ${profile.workoutMinutesPerDay}`);
  if (profile.hasDailyCardio != null)
    lines.push(`Ежедневное кардио: ${profile.hasDailyCardio ? `да${profile.cardioTypes?.length ? ` (${profile.cardioTypes.join(', ')})` : ''}` : 'нет'}`);
  if (profile.injuries && profile.injuries !== 'нет') lines.push(`Травмы: ${profile.injuries}`);
  if (profile.limitations && profile.limitations !== 'нет') lines.push(`Ограничения: ${profile.limitations}`);
  if (profile.averageSleepHours) lines.push(`Сон: ${profile.averageSleepHours} ч`);
  return lines.join('\n');
}

function httpsRequest(body: string, apiKey: string): Promise<{ status: number; text: string }> {
  const proxyUrl = process.env.HTTPS_PROXY;
  const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
  const bodyBuf = Buffer.from(body, 'utf-8');

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: OPENAI_HOST,
        path: COMPLETIONS_PATH,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': bodyBuf.length
        },
        agent
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString('utf-8') })
        );
      }
    );
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}

export async function askTrainer(
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  profile: UserProfile
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY не задан');

  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  const messages = [
    { role: 'system' as const, content: buildSystemPrompt(profile) },
    ...history.map(({ role, content }) => ({ role, content })),
    { role: 'user' as const, content: userMessage }
  ];

  const { status, text } = await httpsRequest(
    JSON.stringify({ model, messages, max_tokens: 600 }),
    apiKey
  );

  if (status < 200 || status >= 300) {
    throw new Error(`OpenAI ${status}: ${text}`);
  }

  const data = JSON.parse(text) as { choices: Array<{ message: { content: string } }> };
  return data.choices[0].message.content;
}
