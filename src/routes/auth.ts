import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { sign } from "hono/jwt";
import { db } from "../db";
import { users } from "../db/schema";
import { env } from "../../env";

const app = new Hono();

app.post("/login", async (c) => {
  const { email, password } = await c.req.json();
  const result = await db.select().from(users).where(eq(users.email, email));
  const user = result[0];

  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const isValid = await Bun.password.verify(password, user.passwordHash);
  if (!isValid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = await sign(
    {
      sub: user.id.toString(),
      email: user.email,
      fullName: user.fullName,
      iat: Math.floor(Date.now() / 1000),
    },
    env.JWT_SECRET!,
    "HS256",
  );

  return c.json({ token });
});

app.post("/register", async (c) => {
  const { email, fullName, password } = await c.req.json();

  if (!email || !fullName || !password) {
    return c.json({ error: "Email, full name and password are required" }, 400);
  }

  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length > 0) {
    return c.json({ error: "User already exists" }, 409);
  }

  const hashedPassword = await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 10,
  });

  const result = await db
    .insert(users)
    .values({ email, fullName, passwordHash: hashedPassword })
    .returning({ id: users.id, email: users.email, fullName: users.fullName });

  return c.json({ user: result[0] }, 201);
});

export default app;
