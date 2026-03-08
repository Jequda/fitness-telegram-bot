import fs from 'node:fs';
import path from 'node:path';
import { getRuntimePath } from '../utils/paths.js';

const mediaDir = getRuntimePath('exercise-media');

function ensureMediaDir() {
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }
}

function extensionFromContentType(contentType: string | null) {
  if (!contentType) return '.jpg';
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('webp')) return '.webp';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return '.jpg';
  return '.jpg';
}

function findCachedFile(exerciseId: string) {
  ensureMediaDir();
  const match = fs.readdirSync(mediaDir).find((file) => file.startsWith(`${exerciseId}.`));
  return match ? path.join(mediaDir, match) : undefined;
}

export async function getExercisePhotoFile(exerciseId: string, photoUrl: string) {
  const cached = findCachedFile(exerciseId);
  if (cached) return cached;

  ensureMediaDir();
  const response = await fetch(photoUrl, {
    headers: {
      Accept: 'image/*'
    }
  });

  if (!response.ok) {
    throw new Error(`Image download failed: ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType?.startsWith('image/')) {
    throw new Error(`Unexpected image content-type: ${contentType ?? 'unknown'}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const filePath = path.join(mediaDir, `${exerciseId}${extensionFromContentType(contentType)}`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}
