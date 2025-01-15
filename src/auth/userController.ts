import { Request, Response } from "express";
import bcrypt from "bcrypt";
import {sql} from "../dbOperations/prepareDatabase";
import log from "../utils/logger";

export const SALT_ROUNDS = 10;

// Регистрация пользователя
export async function register(req: Request, res: Response): Promise<void> {
  const { username, email, password } = req.body;

  log.info("Получен запрос на регистрацию нового пользователя.");

  if (!email || !password || !username) {
    log.warn("Не указаны все обязательные данные: email, username или password.");
    res.status(400).send("Email, username and password are required.");
    return;
  }

  try {
    log.info(`Начало регистрации пользователя: ${username}`);
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = await sql`
      INSERT INTO users (username, email, password_hash)
      VALUES (${username}, ${email}, ${password_hash})
      RETURNING id
    `;
    log.info(`Пользователь ${username} успешно зарегистрирован.`);

    // Сохраняем ID нового пользователя в сессии
    (req.session as { userId?: number }).userId = newUser[0].id;

    // Перенаправляем на /profile
    res.redirect("/profile");
  } catch (err: any) {
    if (err.code === "23505") { // PostgreSQL error code for unique violation
      log.warn(`Ошибка: пользователь с email ${email} уже существует.`);
      res.status(409).send("User with this email already exists.");
    } else {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const addedLoginErrorMessage = "Ошибка при регистрации: " + errorMessage;
      log.error(addedLoginErrorMessage);
      res.status(500).send(addedLoginErrorMessage);
    }
  }
}

// Аутентификация пользователя
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  log.info("Получен запрос на вход в систему.");

  if (!email || !password) {
    log.warn("Попытка входа с отсутствующими данными: email или пароль.");
    res.status(400).send("Требуются и email, и пароль.");
    return;
  }

  try {
    log.info(`Проверка пользователя: ${email}`);
    const user = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;

    if (user.length === 0) {
      log.warn(`Пользователь ${email} не найден.`);
      res.status(401).send("Неправильный email");
      return;
    }

    // может кидать тихую ошибку-шептуна
    log.info(`Пользователь ${email} найден. Проверка пароля.`);
    const passwordMatches = await bcrypt.compare(password, user[0].password_hash);

    if (!passwordMatches) {
      log.warn(`Неверный пароль для пользователя ${email}.`);
      res.status(401).send("Неправильный пароль");
      return;
    }

    (req.session as { userId?: number }).userId = user[0].id; // складываем ID пользователя в сессии

    log.info(`Пользователь ${email} успешно вошёл в систему.`);
    res.redirect("/profile");
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const addedLoginErrorMessage = "Ошибка при логине: " + errorMessage;
    log.error(addedLoginErrorMessage);
    res.status(500).send(addedLoginErrorMessage);
  }
}

// Смена пароля
export async function changePassword(req: Request, res: Response): Promise<void> {
  const { oldPassword, newPassword } = req.body;

  log.info("Получен запрос на смену пароля.");

  const userId = (req.session as { userId?: number }).userId;

  if (!userId) {
    log.warn("Попытка смены пароля без авторизации.");
    res.status(401).send("Неавторизован.");
    return
  }

  try {
    log.info(`Начало поиска пользователя по userId: ${userId}`);

    const user = await sql`
      SELECT * FROM users WHERE id = ${userId}
    `;

    if (!user || !(await bcrypt.compare(oldPassword, user[0].password_hash))) {
      const message = `Старый пароль неправильный. Попробуйте снова.`
      log.warn(message);
      res.status(401).send(message);
      return;
    }

    log.info(`Пользователь ${userId} найден. Хэширование нового пароля.`);
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    log.info(`Обновление пароля для пользователя с userId: ${userId}`);
    await sql`
      UPDATE users SET password_hash = ${hashedPassword} WHERE id = ${userId}
    `;
    log.info(`Пароль для пользователя ${userId} успешно обновлен.`);

    res.status(200).send("Пароль успешно обновлен.");
  } catch (err: any) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const addedLoginErrorMessage = "Ошибка при смене пароля: " + errorMessage;
    log.error(addedLoginErrorMessage);
    res.status(500).send(addedLoginErrorMessage);
  }
};
