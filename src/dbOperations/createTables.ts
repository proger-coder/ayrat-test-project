import log from '../utils/logger';

export async function createTables(sql: any) {
  try {
    log.info('Начинаем создание таблиц ...');

    log.info('Включаем расширение uuid-ossp');
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;

    log.info('Создаём таблицу users ...');
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id            UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
        username      VARCHAR(50)     NOT NULL,
        email         VARCHAR(255)    NOT NULL UNIQUE,
        password_hash TEXT            NOT NULL,
        balance       FLOAT           DEFAULT 50000.0 NOT NULL CHECK (balance >= 0),
        created_at    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    log.info('Создаём таблицу products ...');
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
        name        VARCHAR(100)    NOT NULL,
        price       FLOAT           NOT NULL,
        quantity    INT             NOT NULL CHECK (quantity >= 0)
      );
    `;

    log.info('Создаём таблицу purchases ...');
    await sql`
      CREATE TABLE IF NOT EXISTS purchases (
        id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id       UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        product_id    UUID          NOT NULL REFERENCES products (id) ON DELETE CASCADE,
        purchase_date TIMESTAMP     DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;

    log.info('Таблицы успешно созданы ✔️');
  } catch (error) {
    log.error('❌ Ошибка при создании таблиц: ' + (error instanceof Error ? error.message : String(error)));
    throw error;
  }
}
