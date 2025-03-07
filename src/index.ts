import express from 'express';
import log from "./utils/logger";
import {prepareDatabase, sql} from "./dbOperations/prepareDatabase";
import {connectRedis, redisClient} from "./cacheOperations/redisClient";
import {makeDualPricedArray} from "./getItems";
import session from "express-session";
import {RedisStore} from "connect-redis";
import {changePassword, login, register} from "./auth/userController";
import {isAuthenticated} from "./auth/authMiddleware";
import bodyParser from "body-parser";
import {join} from "path";
import {Product, PurchasedProduct, User, UserSession, UserWithBalance} from "./dbOperations/types";

const PORT = 3000;
const secretKey = 'easter-egg';
const CACHE_KEY = 'skinport_items';
const CACHE_TTL = 3600;
const COOKIE_MAX_AGE = 3600000;

async function bootstrap() {
  await prepareDatabase();
  await connectRedis();

  const app = express();

  app.set("view engine", "pug");
  app.set("views", join(__dirname, '..', "views"));
  app.use(express.static("public"));

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(express.json());

  // хранилище сессий
  const redisStore = new RedisStore({
    client: redisClient,
    prefix: "sess:",
  });

// тюнинг сессии
  app.use(
    session({
      store: redisStore,
      secret: secretKey,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: COOKIE_MAX_AGE,
      },
    })
  );

  app.get("/login", (req, res) => {
    const session = req.session as UserSession;
    if (session && session.userId) {
      return res.redirect("/profile");
    }
    res.render("auth");
  });

  app.post("/login", login);

  app.get("/register", (req, res) => res.render("auth"));

  app.post("/register", register);

  app.post("/change-password", changePassword);

  app.get('/', (req, res) => {
    res.render("main", {title: "Главная"});
  });

  app.get("/products", async (req, res) => {
    let user = undefined;

    const session = req.session as UserSession;
    if (session.userId) {
      const usernameAndBalanceArray = await sql<UserWithBalance[]>`
        SELECT username, balance FROM users WHERE id = ${session.userId}
      `;

      const {username, balance} = usernameAndBalanceArray[0];
      user = {
        username, balance
      }
    }

    try {
      // получение списка товаров из базы данных
      const products = await sql<Product[]>`
      SELECT id, name, price, quantity FROM products
    `;

      res.render("products", {
        title: "Товары",
        products,
        user
      });
    } catch (err) {
      res.status(500).send("Error fetching products.");
    }
  });

  app.get("/profile", isAuthenticated, async (req, res, next) => {
    const session = req.session as UserSession;

    if (!session.userId) {
      throw new Error("User is not authenticated.");
    }

    try {
      // получение списка покупок из БД с жойном
      const purchased = await sql<PurchasedProduct[]>`
        SELECT 
          p.id, 
          p.name, 
          p.price, 
          pu.purchase_date
        FROM 
          products p
        JOIN 
          purchases pu
        ON 
          p.id = pu.product_id
        WHERE 
          pu.user_id = ${session.userId}
      `;

      const usernameAndBalanceArray = await sql<UserWithBalance[]>`
        SELECT username, balance FROM users WHERE id = ${session.userId}
      `;
      const {username, balance} = usernameAndBalanceArray[0];

      res.render("profile", {
        title: `Профиль`,
        username,
        purchased,
        balance
      });
    } catch (err) {
      const prefix = "Ошибка загрузки профиля: ";
      const errMessage = err instanceof Error ? prefix + err.message : prefix + String(err);
      log.error(errMessage);
      res.status(500).send(errMessage);
    }
  });

  app.get("/items", async (req, res) => {
    const page = parseInt(req.query.page as string) || 1; // текущая страница
    const limit = parseInt(req.query.limit as string) || 100; // лимит штук на страницу
    const offset = (page - 1) * limit;

    try {
      const itemsFromCache = await redisClient.get(CACHE_KEY);

      if (itemsFromCache) {
        log.info("Предметы есть в кеше. Отдаём из него.");
        const itemsArray = JSON.parse(itemsFromCache);

        // пагинация
        const paginatedItems = itemsArray.slice(offset, offset + limit);
        res.render("items", {title: "Список предметов", items: paginatedItems})
      } else {
        log.info("Кеш пуст. Получаем данные с ресурса и отдаём ...");
        const dualPricedArray = await makeDualPricedArray();

        // пагинация
        const paginatedItems = dualPricedArray.slice(offset, offset + limit);
        res.render("items", {title: "Список предметов", items: paginatedItems})

        // кэшируем Предметы
        log.info("Пишем предметы в кеш ...");
        await redisClient.set(CACHE_KEY, JSON.stringify(dualPricedArray), {
          EX: CACHE_TTL,
        });
        log.info("Предметы записаны в кеш.");
      }
    } catch (error) {
      log.error("Ошибка при обработке /items:", error);
      res.status(500).send("Ошибка при загрузке данных.");
    }
  });

  app.post("/buy/:productId", isAuthenticated, async (req, res) => {
    const session = req.session as UserSession;
    if (!session.userId) {
      res.status(401).send(`Ошибка: не аутентифицирован`);
      return;
    }
    const { productId } = req.params;

    try {
      const userId = session.userId;

      // проверка наличия товара и его количества
      const product = await sql<Product[]>`
            SELECT id, name, price, quantity FROM products WHERE id = ${productId}
        `;

      if (product.length === 0) {
        res.status(404).send(`Ошибка: товар не найден`);
        return;
      }

      const { price, quantity: availableQuantity, name } = product[0];

      if (availableQuantity < 1) {
        res.status(400).send(`Ошибка: товар ${name} закончился`);
        return;
      }

      // проверка баланса юзера
      const user = await sql<User[]>`
            SELECT balance FROM users WHERE id = ${userId}
        `;

      const userBalance = user[0].balance;

      if (userBalance < price) {
        res.status(400).send(`Ошибка: недостаточно средств: ${userBalance}`);
        return;
      }

      let updatedBalance;
      // транзакция: апдейтим количество товара и баланс юзера
      await sql.begin(async (trx) => {
        await trx`
                UPDATE products
                SET quantity = quantity - 1
                WHERE id = ${productId}
            `;

        const balanceUpdate = await trx`
              UPDATE users
              SET balance = ROUND((balance::NUMERIC - ${price}::NUMERIC), 2)
              WHERE id = ${userId}
              RETURNING balance;
          `;

        updatedBalance = balanceUpdate[0].balance;

        // добавляем запись о покупке
        await trx`
                INSERT INTO purchases (user_id, product_id, purchase_date)
                VALUES (${userId}, ${productId}, NOW())
            `;
      });
      res.status(201).send(`Куплено: ${name} ! Ваш баланс: ${updatedBalance}`);
    } catch (error) {
      const errMessage = `Ошибка при покупке: ${error instanceof Error ? error.message : String(error)}`;
      log.error(errMessage);
      res.status(500).send(errMessage)
    }
  });

  app.post("/logout", (req, res) => {
    req.session.destroy(err => {
      if (err) {
        log.error("Ошибка при завершении сессии:", err);
        res.status(500).send("Ошибка при завершении сессии.");
        return;
      }
      res.redirect("/");
    });
  });

  app.listen(PORT, () => {
    log.info('Программа запущена');
    log.info(`Главная http://localhost:${PORT}`);
  });
}

bootstrap()



