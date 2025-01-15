import { Request, Response, NextFunction } from "express";
import {sql} from "../dbOperations/prepareDatabase";

// получить юзера из базы
async function getUserById(userId: number): Promise<boolean> {
  const result = await sql`
    SELECT id FROM users WHERE id = ${userId}
  `;
  return result.length > 0;
}

export async function isAuthenticated(req: Request, res: Response, next: NextFunction): Promise<void> {
  const session = req.session as { userId?: number };

  if (!session.userId) {
    // res.status(401).send("Unauthorized");
    res.redirect("login")
    return;
  }

  // Есть ли юзер с таким userId ?
  const userExists = await getUserById(session.userId);
  if (!userExists) {
    // res.status(401).send("Invalid session");
    res.redirect("login")
    return;
  }

  next(); // всё норм, идём далее
}

