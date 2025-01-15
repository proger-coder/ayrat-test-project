import { createClient } from 'redis';
import log from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6380';

export const redisClient = createClient({
  url: REDIS_URL,
});

redisClient.on('connect', () => {
  log.info('Подключение к Redis установлено 🤝🏻');
});

redisClient.on('ready', () => {
  log.info('Клиент Redis готов к работе.');
});

redisClient.on('error', (err) => {
  log.error('Ошибка клиента Redis: ' + err.message);
});

redisClient.on('end', () => {
  log.info('Соединение с Redis закрыто.');
});

export async function connectRedis() {
  try {
    await redisClient.connect();
  } catch (err) {
    log.error('Ошибка при подключении к Redis: ' + (err instanceof Error ? err.message : String(err)));
    throw err;
  }
}
