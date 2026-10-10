import { config } from "@/lib/config";
import { AsyncLocalStorage } from "node:async_hooks";

const workerTrial = new AsyncLocalStorage<boolean>();

/** Explicit personal-test workers may use the existing small sweep in production. */
export function withWorkerTrial<T>(run: () => Promise<T>): Promise<T> {
  return workerTrial.run(true, run);
}

/**
 * Normal production stays full size. Only the explicit worker trial context
 * may opt into the small setting; an environment variable alone cannot do it.
 */
export function smallSweep(): boolean {
  return (process.env.NODE_ENV !== "production" || workerTrial.getStore() === true) &&
    config().SWEEP_SCALE === "small";
}

/** What a trial-size project reads. About $0.02 of Reddit and scoring, against $0.20. */
export const SMALL_SWEEP = {
  /** Reddit searches walked, a page being about 100 posts. */
  queries: 4,
  /** Pages each walk reads, with no second pass. */
  pages: 1,
  /** Posts the sweep may find. */
  posts: 300,
  /** Google queries discovery may buy. */
  discoveryQueries: 3,
} as const;

/**
 * A few of a list, taken evenly across it. The first few of a plan's searches
 * are all one sort: on 2026-09-18 a trial sweep of getanyapi.com searched its
 * first four phrasings, which were four things its customers do with it, and
 * never reached "reddit api" or any of the sixty platform searches after them.
 */
export function spread<T>(items: T[], count: number): T[] {
  if (items.length <= count) {
    return items;
  }
  return Array.from({ length: count }, (_, index) => items[Math.floor((index * items.length) / count)]);
}
