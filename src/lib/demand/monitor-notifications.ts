import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { alerts, demandDocuments, demandMonitorRuns, demandMonitorSeen, demandMonitors, demandRuns, demandSignals, projects } from "@/db/schema";
import { sendEmail } from "@/lib/alerts/email";
import { escapeHtml } from "@/lib/alerts/tokens";
import { config } from "@/lib/config";
import { contentHash } from "./evidence";
import { monitoringAvailable } from "./monitors";
import { lockBudget } from "./store";

/** Publication and dedup marks commit together, independent of email transport success. */
export async function processDemandMonitorRun(userId: string, runId: string, now = new Date()) {
  return db().transaction(async tx => {
    await lockBudget(tx);
    const [row] = await tx.select({ monitor: demandMonitors, record: demandMonitorRuns, run: demandRuns }).from(demandMonitorRuns)
      .innerJoin(demandMonitors, eq(demandMonitors.id, demandMonitorRuns.monitorId)).innerJoin(demandRuns, eq(demandRuns.id, demandMonitorRuns.runId))
      .where(and(eq(demandMonitorRuns.runId, runId), eq(demandMonitors.userId, userId), eq(demandRuns.userId, userId)));
    if (!row || row.record.processedAt || !["complete", "partial"].includes(row.run.status) || row.run.reservedMicros !== 0) return;
    if (row.run.expiresAt <= now) {
      await tx.update(demandMonitorRuns).set({ processedAt: now, deliveryState: "expired" }).where(eq(demandMonitorRuns.runId, runId)); return;
    }
    const documents = await tx.select().from(demandDocuments).where(eq(demandDocuments.runId, runId));
    const signals = await tx.select().from(demandSignals).where(eq(demandSignals.runId, runId));
    const seen = new Set((await tx.select().from(demandMonitorSeen).where(eq(demandMonitorSeen.monitorId, row.monitor.id))).map(item => item.fingerprint));
    const newSignalIds: string[] = [];
    const discovered = new Set<string>();
    for (const signal of signals) {
      if (!signal.assessment?.evidence.length) continue;
      const keys: string[] = [];
      for (const evidence of signal.assessment.evidence) {
        const doc = documents.find(item => item.id === evidence.documentId);
        if (!doc?.body || doc.purpose !== "demand" || doc.outcome !== "retrieved" || doc.body.slice(evidence.quoteStart, evidence.quoteEnd) !== evidence.quote) continue;
        keys.push(`url:${contentHash(doc.canonicalUrl)}`, `quote:${contentHash(evidence.quote)}`);
      }
      // A shared source or verbatim quote is conservative evidence of an already seen case.
      if (keys.length && !keys.some(key => seen.has(key) || discovered.has(key)) && row.monitor.baselineAt) newSignalIds.push(signal.id);
      keys.forEach(key => discovered.add(key));
    }
    if (discovered.size) await tx.insert(demandMonitorSeen).values([...discovered].map(fingerprint => ({ monitorId: row.monitor.id, fingerprint }))).onConflictDoNothing();
    await tx.update(demandMonitorRuns).set({ processedAt: now, newSignalIds, deliveryState: newSignalIds.length ? "pending" : "none" }).where(eq(demandMonitorRuns.runId, runId));
    if (!row.monitor.baselineAt) await tx.update(demandMonitors).set({ baselineAt: now }).where(eq(demandMonitors.id, row.monitor.id));
  });
}

/** The normal background research job also carries notification retries: no extra paid run. */
export async function deliverDemandMonitorRun(userId: string, runId: string, now = new Date()) {
  if (!monitoringAvailable(userId)) return;
  const leaseUntil = new Date(now.getTime() + 5 * 60_000);
  const recipient = await db().transaction(async tx => {
    await lockBudget(tx);
    const [row] = await tx.select({ record: demandMonitorRuns, monitor: demandMonitors, run: demandRuns }).from(demandMonitorRuns)
      .innerJoin(demandMonitors, eq(demandMonitors.id, demandMonitorRuns.monitorId)).innerJoin(demandRuns, eq(demandRuns.id, demandMonitorRuns.runId))
      .where(and(eq(demandMonitorRuns.runId, runId), eq(demandMonitors.userId, userId), eq(demandRuns.userId, userId)));
    if (!row?.monitor.enabled || !["pending", "sending"].includes(row.record.deliveryState) ||
      row.record.deliveryState === "sending" && row.record.deliveryLeaseUntil && row.record.deliveryLeaseUntil > now) return null;
    if (row.run.expiresAt <= now || row.run.status === "expired") {
      await tx.update(demandMonitorRuns).set({ deliveryState: "expired", newSignalIds: [], deliveryLeaseUntil: null, deliveryError: null }).where(eq(demandMonitorRuns.runId, runId)); return null;
    }
    const [channel] = await tx.select({ target: alerts.target }).from(alerts).innerJoin(projects, eq(projects.id, alerts.projectId))
      .where(and(eq(alerts.id, row.monitor.emailChannelId ?? ""), eq(alerts.channel, "email"), eq(projects.userId, userId)));
    if (!channel) {
      await tx.update(demandMonitors).set({ enabled: false, reason: "channel" }).where(eq(demandMonitors.id, row.monitor.id)); return null;
    }
    await tx.update(demandMonitorRuns).set({ deliveryState: "sending", deliveryLeaseUntil: leaseUntil, deliveryError: null }).where(eq(demandMonitorRuns.runId, runId));
    return { to: channel.target, count: row.record.newSignalIds.length };
  });
  if (!recipient) return;
  const url = `${config().APP_URL}/app/research?run=${runId}`;
  const subject = `Hark · ${recipient.count} 条新增需求证据`;
  try {
    await sendEmail({ to: recipient.to, subject,
      text: `${subject}\n监控发现之前未记录的需求证据。这不代表新发布的帖子或新增独立用户。\n查看原文与分析：${url}\n可在跨平台研究页面暂停监控。`,
      html: `<p>${subject}</p><p>监控发现之前未记录的需求证据。这不代表新发布的帖子或新增独立用户。</p><p><a href="${escapeHtml(url)}">查看原文与分析</a></p><p>可在跨平台研究页面暂停监控。</p>`,
    });
    await db().update(demandMonitorRuns).set({ deliveryState: "sent", deliveredAt: new Date(), deliveryLeaseUntil: null, deliveryError: null })
      .where(and(eq(demandMonitorRuns.runId, runId), eq(demandMonitorRuns.deliveryState, "sending"), eq(demandMonitorRuns.deliveryLeaseUntil, leaseUntil)));
  } catch {
    await db().update(demandMonitorRuns).set({ deliveryState: "pending", deliveryLeaseUntil: null, deliveryError: "邮件暂未发送，等待重试。" })
      .where(and(eq(demandMonitorRuns.runId, runId), eq(demandMonitorRuns.deliveryState, "sending"), eq(demandMonitorRuns.deliveryLeaseUntil, leaseUntil)));
  }
}
