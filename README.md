# Rail API

A minimal REST API for railway data (stations, trains) built with **Hono**, **Bun**, and **Drizzle ORM** on PostgreSQL.

## Stack

- **[Bun](https://bun.sh)** – runtime & package manager  
- **[Hono](https://hono.dev)** – web framework  
- **[Drizzle ORM](https://orm.drizzle.team)** – type-safe Postgres access  
- **PostgreSQL 16** – database (via Docker)

## Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- [Docker](https://docs.docker.com/get-docker/) (for Postgres)

## Setup

1. **Clone and install**

   ```bash
   git clone <repo-url>
   cd rail-api
   bun install
   ```

2. **Environment**

   Copy the example env and adjust if needed:

   ```bash
   cp .env.example .env
   ```

   Or create a `.env` with at least:

   ```env
   DATABASE_URL=postgresql://rail_api:rail_pass@localhost:5433/rail_api_db
   ```

3. **Start Postgres**

   ```bash
   docker compose up -d
   ```

   Postgres runs on **port 5433** (host) to avoid clashing with a local Postgres on 5432.

4. **Apply schema**

   ```bash
   bun run db:push
   ```

5. **(Optional) Seed trains**

   Place a CSV with columns  
   `no,name,type,zone,source,destination,departure,arrival,duration,halts,distance,speed,return,classes,days`  
   (e.g. `trains.csv` or path set in `seed-trains.ts`), then:

   ```bash
   bun run seed-trains.ts
   ```

## Scripts

| Command              | Description                    |
|----------------------|--------------------------------|
| `bun run dev`        | Start dev server (hot reload)   |
| `bun run db:generate` | Generate Drizzle migrations  |
| `bun run db:push`    | Push schema to DB (no migrations) |
| `bun run db:studio`  | Open Drizzle Studio            |

## API

- **Base URL:** `http://localhost:3000`

| Method | Path        | Description                    |
|--------|-------------|--------------------------------|
| GET    | `/`         | Health / hello                 |
| GET    | `/stations` | List stations; `?q=` search by name, code, or city |

## Project structure

```
rail-api/
├── src/
│   ├── index.ts           # Hono app & routes
│   └── db/
│       ├── index.ts       # Drizzle client
│       └── schema/
│           ├── index.ts
│           ├── stations.ts
│           └── trains.ts
├── drizzle/               # Migrations (SQL)
├── drizzle.config.ts
├── env.ts                 # Env validation
├── seed-trains.ts         # Seed trains from CSV
├── docker-compose.yml
└── package.json
```

## License

MIT
