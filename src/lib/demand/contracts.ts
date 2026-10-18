import { z } from "zod";

export const micros = z.number().int().min(0).max(2_147_483_647);
const productUrl = z.url().max(2048).refine((value) => {
  const url = new URL(value);
  return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
}, "Use an HTTP(S) product URL without credentials.");

export const demandInput = z.intersection(z.object({
  key: z.uuid(),
  budgetMicros: micros,
  sourceRunId: z.uuid().optional(),
}), z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("topic"), topic: z.string().trim().min(1).max(500) }),
  z.object({ mode: z.literal("product"), url: productUrl, projectId: z.uuid().optional() }),
]));

export type DemandInput = z.input<typeof demandInput>;
export type ProfileSnapshot = Readonly<{
  version: number;
  name: string;
  url: string | null;
  pain: string | null;
  solution: string | null;
  targetUsers: string | null;
  geography: string | null;
  budgetFit: string | null;
  brief: unknown;
}>;

export const demandTheme = z.object({
  title: z.string().min(1),
  explanation: z.string().min(1),
  signalIds: z.array(z.uuid()).min(1),
  kind: z.enum(["recurring", "individual"]),
});
export type DemandTheme = z.infer<typeof demandTheme>;
export type DemandAssessment = {
  version: 1;
  problem: string;
  fitReason: string | null;
  requirements: { documentId: string; quote: string; productFact: string | null; status: "supported" | "unknown" | "contradicted" }[];
  evidence: { documentId: string; quoteStart: number; quoteEnd: number; quote: string; author: string | null }[];
};
export type DemandLease = Readonly<{ runId: string; userId: string; token: string }>;

export const attemptInput = z.object({
  key: z.string().min(1).max(200),
  kind: z.enum(["data", "model"]),
  source: z.enum(["reddit", "x", "web"]),
  operation: z.string().min(1).max(100),
  /** Supplied only by a server adapter with a verified endpoint/model ceiling. */
  upperBoundMicros: micros.refine((value) => value > 0),
});
export type AttemptInput = z.infer<typeof attemptInput>;

export class DemandError extends Error {}

/** A job was reclaimed before the run's independently renewed fence expired. */
export class DemandLeaseBusyError extends DemandError {
  readonly code = "DEMAND_LEASE_BUSY";
}
