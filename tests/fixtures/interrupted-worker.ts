import { db } from "../../src/db";
import { claimNextJob, runClaimedJob } from "../../src/jobs/runner";
import { JOB_HANDLERS } from "../../src/jobs/registry";

// This process exists only to exercise a real process death against fixture data.
if (!new URL(process.env.DATABASE_URL!).pathname.endsWith("_test")) {
  throw new Error("Interrupted worker requires a test database");
}
globalThis.fetch = async () => { throw new Error("External requests are disabled"); };
const [projectId, jobId, now] = process.argv.slice(2);
JOB_HANDLERS.recovery_fixture = async () => {
  process.stdout.write("holding\n");
  await new Promise(() => { setInterval(() => {}, 1000); });
};
const job = await claimNextJob(new Date(now), undefined, { projectId, jobId });
if (!job) throw new Error("Fixture claim failed");
await runClaimedJob(job);
await db().$client.end();
