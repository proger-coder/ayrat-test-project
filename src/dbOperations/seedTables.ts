import bcrypt from 'bcrypt';
import log from "../utils/logger";
import {SALT_ROUNDS} from "../auth/userController";

const initialUsers = [
  {id: '7e9cf40e-4ef3-40f4-8d24-5173da3087f5', username: 'Anna Petrova', email: 'anna.petrova@mail.ru', balance: 20000.0 },
  {id: '7e9cf40e-9fad-4c54-8454-20e81308aacb', username: 'Petr Sidorov', email: 'petr.sidorov@mail.ru', balance: 70000.0 },
];

const products = [
  {id: '3b112f14-85af-4a22-9e73-df01fd84fb64', name: 'Скин для AK-47 | Император', price: 35999.99, quantity: 10 },
  {id: '3b112f14-b71f-4cd1-8763-b401bf791602', name: 'Скин для AWP | Азимов', price: 49999.99, quantity: 10 },
  {id: '3b112f14-615b-42aa-ab9c-7b13e922517a', name: 'Нож | Керамбит | Доплер', price: 8999.99, quantity: 10 },
  {id: '3b112f14-319f-4fdb-88b6-b6a9af2dbb9e', name: 'Перчатки | Спортивные | Пандора', price: 69999.99, quantity: 10 },
  {id: '3b112f14-6ffb-43a7-b88d-c21ba85a202a', name: 'Скин для Desert Eagle | Золотой Карп', price: 11999.99, quantity: 10 },
  {id: '3b112f14-9326-4e3e-b6b0-6a4333ffade1', name: 'Скин для M4A4 | Вой', price: 42999.99, quantity: 10 },
  {id: '3b112f14-eff5-42c3-98d5-b7d2be0977cc', name: 'Нож | Бабочка | Тигровый Зуб', price: 7999.99, quantity: 10 },
  {id: '3b112f14-e46d-4d39-a694-ac4f561b839c', name: 'Стикер | Катовица 2014', price: 2999.99, quantity: 10 },
  {id: '3b112f14-8085-4160-87c5-f9495634ce70', name: 'Скин для Glock-18 | Неоновый Ноар', price: 2499, quantity: 10 },
  {id: '3b112f14-3db6-4b37-b3cb-48a7c68a83a2', name: 'Скин для USP-S | Убийство подтверждено', price: 4999.90, quantity: 10 }
];

const purchases = [
  {id: '6446005e-231a-4744-8e70-00140cacbc21', user_id: '7e9cf40e-4ef3-40f4-8d24-5173da3087f5', product_id: '3b112f14-b71f-4cd1-8763-b401bf791602' },
  {id: '6446005e-d944-49bc-8e40-1d156e7cdb77', user_id: '7e9cf40e-9fad-4c54-8454-20e81308aacb', product_id: '3b112f14-615b-42aa-ab9c-7b13e922517a' },
  {id: '6446005e-80d2-4d9f-9012-df137a46f567', user_id: '7e9cf40e-4ef3-40f4-8d24-5173da3087f5', product_id: '3b112f14-eff5-42c3-98d5-b7d2be0977cc' },
  {id: '6446005e-a025-446a-9890-8370a6aab98c', user_id: '7e9cf40e-9fad-4c54-8454-20e81308aacb', product_id: '3b112f14-e46d-4d39-a694-ac4f561b839c' },
];

export async function seedTables(sql: any) {
  try {
    log.info('Начинаем заполнение базы данных ...');

    // если таблица не пуста, пропускаем сидинг
    const userCount = await sql`SELECT COUNT(*)::int AS count FROM users`;
    if (userCount[0].count > 0) {
      log.info('Таблица users уже содержит данные, пропускаем сидирование.');
    } else {
      log.info('Заполняем таблицу users ...');
      for (const user of initialUsers) {
        const hashedPassword = await bcrypt.hash(user.email, SALT_ROUNDS);
        await sql`
        INSERT INTO users (id, username, email, password_hash, balance, created_at)
        VALUES (${user.id}, ${user.username}, ${user.email}, ${hashedPassword}, ${user.balance}, CURRENT_TIMESTAMP)
      `;
      }
      log.info('Успешно ✔️');
    }

    // если таблица не пуста, пропускаем сидинг
    const productsCount = await sql`SELECT COUNT(*)::int AS count FROM products`;
    if (productsCount[0].count > 0) {
      log.info('Таблица products уже содержит данные, пропускаем сидирование.');
    } else {
      log.info('Заполняем таблицу products ...');
      for (const product of products) {
        await sql`
        INSERT INTO products (id, name, price, quantity)
        VALUES (${product.id}, ${product.name}, ${product.price}, ${product.quantity})
      `;
      }
      log.info('Успешно ✔️');
    }

    // если таблица не пуста, пропускаем сидинг
    const purchasesCount = await sql`SELECT COUNT(*)::int AS count FROM purchases`;
    if (purchasesCount[0].count > 0) {
      log.info('Таблица purchases уже содержит данные, пропускаем сидирование.');
    } else {
      log.info('Заполняем таблицу purchases ...');
      for (const purchase of purchases) {
        await sql`
        INSERT INTO purchases (id, user_id, product_id, purchase_date)
        VALUES (${purchase.id}, ${purchase.user_id}, ${purchase.product_id}, CURRENT_TIMESTAMP)
      `;
      }
      log.info('Успешно ✔️');
    }
  } catch (error) {
    log.error('❌ Ошибка при наполнении таблиц: ' + (error instanceof Error ? error.message : String(error)));
    throw error;
  }
}
















