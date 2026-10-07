import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";

const root = new URL("../../", import.meta.url);
const envFile = fileURLToPath(new URL(".env", root));
if (existsSync(envFile)) process.loadEnvFile(envFile);
const url = new URL(process.env.DATABASE_URL);
if (url.hostname !== "127.0.0.1") {
  throw new Error("The local PostgreSQL helper requires a 127.0.0.1 DATABASE_URL.");
}
const databaseDir = fileURLToPath(new URL(".local/postgres", root));
const postgres = new EmbeddedPostgres({
  databaseDir,
  port: Number(url.port || 5432),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  authMethod: "scram-sha-256",
  persistent: true,
  postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
});
if (!existsSync(`${databaseDir}/PG_VERSION`)) {
  await postgres.initialise();
}
await postgres.start();
const database = decodeURIComponent(url.pathname.slice(1));
const client = postgres.getPgClient("postgres", "127.0.0.1");
await client.connect();
const result = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);
if (!result.rowCount) {
  await client.query(`CREATE DATABASE ${client.escapeIdentifier(database)}`);
}
await client.end();
console.log(`Local PostgreSQL is ready on 127.0.0.1:${url.port || 5432}. Ctrl+C stops it; data is retained.`);
