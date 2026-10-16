/** One Google result that argued for a community or a phrase. */
export type EvidenceThread = {
  postId: string;
  canonicalUrl: string;
  subreddit: string;
  title: string;
  relevance: string;
};

const RELEVANCE_LABEL: Record<string, string> = {
  relevant: "Has this problem",
  plausible: "Might have it",
  irrelevant: "Not this problem",
  unlabeled: "Not read yet",
};

/**
 * The threads behind the plan, folded away. Nothing above is a guess, and this
 * is where a person checks that: every community and every search on this page
 * came from one of these.
 */
export function EvidenceThreads({ threads }: { threads: EvidenceThread[] }) {
  return (
    <details className="rounded-card border bg-surface p-4 md:p-6">
      <summary className="cursor-pointer text-h3" style={{ fontWeight: 500 }}>
        Evidence
        <span className="ml-2 text-small text-fg-muted tabular-nums">
          {threads.length} {threads.length === 1 ? "thread" : "threads"}
        </span>
      </summary>
      <ul className="mt-4 flex flex-col gap-2">
        {threads.length === 0 ? (
          <li className="text-body text-fg-muted">
            Nothing yet. Rebuilding the profile asks Google where your buyers post.
          </li>
        ) : (
          threads.map((thread) => (
            <li key={thread.postId} className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 border-t pt-3 [overflow-wrap:anywhere]">
              <a
                href={thread.canonicalUrl}
                target="_blank"
                rel="noreferrer"
                className="text-body text-fg underline-offset-2 hover:underline"
              >
                {thread.title || thread.canonicalUrl}
              </a>
              <span className="text-small text-fg-muted">r/{thread.subreddit}</span>
              <span className="text-small text-fg-muted">
                {RELEVANCE_LABEL[thread.relevance] ?? thread.relevance}
              </span>
            </li>
          ))
        )}
      </ul>
    </details>
  );
}
