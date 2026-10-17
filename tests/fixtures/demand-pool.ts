import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../../src/db/schema";
import { executeDemandAttempt } from "../../src/lib/demand/budget";
import { finishDemandRun } from "../../src/lib/demand/runs";
import type { DemandLease } from "../../src/lib/demand/contracts";

if (!new URL(process.env.DATABASE_URL!).pathname.endsWith("_test")) throw new Error("Fixture requires a test database.");
const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
(globalThis as typeof globalThis & { __lurkDb?: unknown }).__lurkDb = drizzle(sql, { schema });
const lease: DemandLease = JSON.parse(process.argv[2]);
try {
  console.log("pool-fixture-ready");
  for (const source of ["web", "x"] as const) {
    for (const kind of ["data", "model"] as const) {
      await executeDemandAttempt(lease, { key: `${kind}:${source}`, kind, source,
        operation: source === "x" ? "twitter.search" : "test.pool", upperBoundMicros: 100 },
      async () => ({ value: null, charge: { actualMicros: 10, requestId: `${kind}:${source}` } }));
    }
  }
  await finishDemandRun(lease, "complete");
  console.log("pool-fixture-complete");
} finally {
  await sql.end();
}
