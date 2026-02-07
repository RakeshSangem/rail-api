import { bearerAuth } from "hono/bearer-auth";
import { verify } from "hono/jwt";
import type { Context, Next } from "hono";
import { env } from "../../env";

export const authMiddleware = async (c: Context, next: Next) => {
  const middleware = bearerAuth({
    verifyToken: async (token, c) => {
      try {
        const payload = await verify(token, env.JWT_SECRET!, "HS256");
        c.set("jwtPayload", payload);
        return true;
      } catch {
        return false;
      }
    },
  });
  return middleware(c, next);
};
