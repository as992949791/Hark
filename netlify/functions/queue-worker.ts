import { runBackgroundRequest } from "../../src/jobs/serverless";
import { withWorkerTrial } from "../../src/lib/sweepScale";

export default async function handler(request: Request): Promise<void> {
  await withWorkerTrial(() => runBackgroundRequest(request));
}

export const config = { background: true };
