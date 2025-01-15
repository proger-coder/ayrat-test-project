import postgres from 'postgres';
import log from '../utils/logger';
import { createTables } from "./createTables";
import { seedTables } from "./seedTables";

const DATABASE_URL = `${process.env.DATABASE_URL}`;
export const sql = postgres(DATABASE_URL, { ssl: false });

export async function prepareDatabase() {
  try {
    log.info('Проверяем соединение с БД ...');
    await sql`SELECT 1`; // проверка соединения
    log.info('База на связи 🤝🏻');

    await createTables(sql);
    await seedTables(sql);

  } catch (err) {
    throw new Error('❌ Ошибка подготовки БД: ' + JSON.stringify(err));
  }
  // finally {
  //   await sql.end();
  // }
}
