import Link from "next/link";

type NoPhrasingsProps = { projectId: string };

/**
 * The refresh ran, found no way your buyers say the problem, and so asked
 * Google nothing. The only fix is on the Product page, so the card is the way there.
 */
export function NoPhrasings({ projectId }: NoPhrasingsProps) {
  return (
    <div className="flex flex-col gap-2 rounded-card border bg-surface p-5 sm:p-8">
      <h2 className="text-h3" style={{ fontWeight: 500 }}>
        Nothing to look up yet
      </h2>
      <p className="max-w-[75ch] text-body text-fg-muted">
        The last refresh had no problem phrasings to search for, so it asked Google nothing. Write
        the problem in your buyers&rsquo; own words under{" "}
        <Link
          href={`/app/product?project=${encodeURIComponent(projectId)}`}
          className="transition-motion text-fg underline underline-offset-4 transition-colors hover:text-fg-muted"
        >
          How buyers say it
        </Link>{" "}
        on the Product page, and the next refresh searches them.
      </p>
    </div>
  );
}
