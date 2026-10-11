import { runScheduledTick } from "../../src/jobs/scheduled";

export default async function handler(): Promise<void> {
  const dispatched = await runScheduledTick();
  console.log(`Scheduled tick dispatched ${dispatched} jobs.`);
}

export const config = { schedule: "*/15 * * * *" };
