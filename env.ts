export const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: process.env.PORT,
};

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}
