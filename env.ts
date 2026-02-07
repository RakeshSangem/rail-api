export const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: process.env.PORT,
  JWT_SECRET: process.env.JWT_SECRET,
};

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

if (!env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}
