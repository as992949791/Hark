import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { alerts, demandMonitorRuns, demandMonitors, demandRuns, jobs, projects } from "@/db/schema";
import { emailSender } from "@/lib/alerts/config";
import { config } from "@/lib/config";
import { DemandError, micros } from "./contracts";
import { researchAvailability } from "./report";
import { createDemandRunInTransaction } from "./runs";
import { committedDemandBudget, demandEnabled, lockBudget, type Transaction } from "./store";

export function monitoringAvailable(userId: string) {
  const settings = config();
  return settings.DEMAND_MONITORING_ENABLED && settings.SCHEDULED_WORKER_ENABLED && researchAvailability(userId).enabled &&
    !!settings.ANYAPI_HOUSE_API_KEY && !!settings.OPENROUTER_API_KEY && !!emailSender();
}

export async function monitorEmailChannels(userId: string, reader: Pick<Transaction, "select"> = db()) {
  return reader.select({ id: alerts.id, target: alerts.target, projectName: projects.name }).from(alerts)
    .innerJoin(projects, eq(projects.id, alerts.projectId)).where(and(eq(projects.userId, userId), eq(alerts.channel, "email")));
}

const monitorInput = z.object({ key: z.uuid(), sourceRunId: z.uuid(), emailChannelId: z.uuid(),
  perRunBudgetMicros: micros.min(1).max(1_000_000), totalBudgetMicros: micros.min(1).max(10_000_000),
}).refine(input => input.totalBudgetMicros >= input.perRunBudgetMicros);
export type MonitorInput = z.input<typeof monitorInput>;

/** Saves conditions only: sourceRunId is never reused as a source-content cache. */
export async function saveDemandMonitor(userId: string, raw: MonitorInput) {
  demandEnabled();
  const input = monitorInput.parse(raw);
  return db().transaction(async tx => {
    await lockBudget(tx);
    const [source] = await tx.select().from(demandRuns).where(and(eq(demandRuns.id, input.sourceRunId), eq(demandRuns.userId, userId)));
    if (!source?.input || source.expiresAt.getTime() <= Date.now()) throw new DemandError("Research condition unavailable.");
    const channel = (await monitorEmailChannels(userId, tx)).find(row => row.id === input.emailChannelId);
    if (!channel) throw new DemandError("Owned email channel required.");
    const [existing] = await tx.select().from(demandMonitors).where(and(eq(demandMonitors.userId, userId), eq(demandMonitors.key, input.key)));
    if (existing) {
      if (existing.mode !== source.mode || existing.input !== source.input || existing.emailChannelId !== input.emailChannelId ||
        existing.perRunBudgetMicros !== input.perRunBudgetMicros || existing.totalBudgetMicros !== input.totalBudgetMicros) throw new DemandError("Monitor request key already used.");
      return existing;
    }
    const count = await tx.select({ id: demandMonitors.id }).from(demandMonitors).where(eq(demandMonitors.userId, userId));
    if (count.length >= 20) throw new DemandError("At most 20 saved monitors.");
    const [monitor] = await tx.insert(demandMonitors).values({ userId, key: input.key, mode: source.mode, input: source.input,
      projectId: source.projectId, emailChannelId: channel.id, perRunBudgetMicros: input.perRunBudgetMicros, totalBudgetMicros: input.totalBudgetMicros }).returning();
    return monitor;
  });
}

export async function listDemandMonitors(userId: string) {
  const monitors = await db().select().from(demandMonitors).where(eq(demandMonitors.userId, userId)).orderBy(desc(demandMonitors.createdAt));
  if (!monitors.length) return [];
  const history = await db().select({ monitorId: demandMonitorRuns.monitorId, run: demandRuns, delivery: demandMonitorRuns }).from(demandMonitorRuns)
    .innerJoin(demandRuns, eq(demandRuns.id, demandMonitorRuns.runId)).where(inArray(demandMonitorRuns.monitorId, monitors.map(row => row.id))).orderBy(desc(demandRuns.createdAt));
  return monitors.map(monitor => {
    const runs = history.filter(row => row.monitorId === monitor.id);
    return { ...monitor, spentMicros: runs.reduce((sum, row) => sum + row.run.spentMicros, 0),
      committedMicros: runs.reduce((sum, row) => sum + committedDemandBudget(row.run), 0),
      latestRunId: runs[0]?.run.id ?? null, latestStatus: runs[0]?.run.status ?? null,
      deliveryState: runs[0]?.delivery.deliveryState ?? "none", deliveryError: runs[0]?.delivery.deliveryError ?? null };
  });
}

export async function setDemandMonitorEnabled(userId: string, monitorId: string, enabled: boolean) {
  if (enabled && !monitoringAvailable(userId)) throw new DemandError("Scheduled monitoring is not configured.");
  return db().transaction(async tx => {
    await lockBudget(tx);
    const [monitor] = await tx.select().from(demandMonitors).where(and(eq(demandMonitors.id, monitorId), eq(demandMonitors.userId, userId))).for("update");
    if (!monitor) throw new DemandError("Monitor not found.");
    if (enabled && !(await monitorEmailChannels(userId, tx)).some(channel => channel.id === monitor.emailChannelId)) throw new DemandError("Owned email channel required.");
    await tx.update(demandMonitors).set({ enabled, reason: enabled ? null : "manual" }).where(eq(demandMonitors.id, monitor.id));
  });
}

export async function deleteDemandMonitor(userId: string, monitorId: string) {
  return db().transaction(async tx => {
    await lockBudget(tx);
    const [monitor] = await tx.select().from(demandMonitors).where(and(eq(demandMonitors.id, monitorId), eq(demandMonitors.userId, userId))).for("update");
    if (!monitor) throw new DemandError("Monitor not found.");
    const linked = await tx.select({ id: demandRuns.id }).from(demandMonitorRuns).innerJoin(demandRuns, eq(demandRuns.id, demandMonitorRuns.runId))
      .where(and(eq(demandMonitorRuns.monitorId, monitor.id), eq(demandRuns.status, "queued")));
    const ids = linked.map(row => row.id);
    if (ids.length) {
      await tx.update(demandRuns).set({ status: "blocked", error: "Monitor deleted before execution.", finishedAt: new Date() }).where(inArray(demandRuns.id, ids));
      await tx.update(jobs).set({ finishedAt: new Date(), error: "Monitor deleted." }).where(and(inArray(jobs.demandRunId, ids), isNull(jobs.startedAt)));
    }
    await tx.delete(demandMonitors).where(eq(demandMonitors.id, monitor.id));
  });
}

/** Called only by the scheduled worker; all admission writes share the run-budget lock. */
export async function admitDemandMonitors(userId: string, now = new Date()) {
  if (!monitoringAvailable(userId)) return [];
  return db().transaction(async tx => {
    await lockBudget(tx);
    const monitors = await tx.select().from(demandMonitors).where(and(eq(demandMonitors.userId, userId), eq(demandMonitors.enabled, true)))
      .orderBy(asc(demandMonitors.nextRunAt)).limit(20).for("update");
    const admitted: (typeof jobs.$inferSelect)[] = [];
    for (const monitor of monitors) {
      const history = await tx.select({ run: demandRuns, processedAt: demandMonitorRuns.processedAt, deliveryState: demandMonitorRuns.deliveryState }).from(demandMonitorRuns)
        .innerJoin(demandRuns, eq(demandRuns.id, demandMonitorRuns.runId)).where(eq(demandMonitorRuns.monitorId, monitor.id));
      const pause = async (reason: string) => { await tx.update(demandMonitors).set({ enabled: false, reason }).where(eq(demandMonitors.id, monitor.id)); };
      if (!(await monitorEmailChannels(userId, tx)).some(row => row.id === monitor.emailChannelId)) { await pause("channel"); continue; }
      if (history.some(({ run, processedAt }) => run.reservedMicros > 0 && !["queued", "running"].includes(run.status) || ["failed", "blocked"].includes(run.status) || run.status === "expired" && !processedAt)) { await pause("review"); continue; }
      if (history.reduce((sum, row) => sum + committedDemandBudget(row.run), 0) + monitor.perRunBudgetMicros > monitor.totalBudgetMicros) {
        // An active run already owns its ceiling; do not pause it prematurely.
        if (!history.some(({ run, deliveryState }) => ["queued", "running"].includes(run.status) || ["pending", "sending"].includes(deliveryState))) await pause("budget");
        continue;
      }
      if (history.some(({ run, processedAt }) => ["queued", "running"].includes(run.status) || !processedAt) || monitor.nextRunAt > now || admitted.length === 2) continue;
      // Capacity is shared with manual research; wait rather than undo another monitor's admission.
      const active = await tx.select({ id: demandRuns.id }).from(demandRuns).where(and(eq(demandRuns.userId, userId), inArray(demandRuns.status, ["queued", "running"])));
      if (active.length >= 3) break;
      const run = await createDemandRunInTransaction(tx, userId, { key: randomUUID(), budgetMicros: monitor.perRunBudgetMicros,
        // The saved URL stays authoritative even if its former project now has another URL.
        ...(monitor.mode === "product" ? { mode: "product", url: monitor.input } : { mode: "topic", topic: monitor.input }) });
      await tx.insert(demandMonitorRuns).values({ monitorId: monitor.id, runId: run.id });
      await tx.update(demandMonitors).set({ nextRunAt: new Date(now.getTime() + 86_400_000) }).where(eq(demandMonitors.id, monitor.id));
      const [job] = await tx.update(jobs).set({ runAt: now }).where(eq(jobs.demandRunId, run.id)).returning(); admitted.push(job);
    }
    return admitted;
  });
}

export async function monitorForRun(runId: string) {
  const [row] = await db().select({ monitor: demandMonitors }).from(demandMonitorRuns)
    .innerJoin(demandMonitors, eq(demandMonitors.id, demandMonitorRuns.monitorId)).where(eq(demandMonitorRuns.runId, runId));
  return row?.monitor ?? null;
}
