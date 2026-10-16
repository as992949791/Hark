import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { SubredditChip } from "@/components/SubredditChip";
import { themeHref, type ThemeView } from "@/lib/insights/read";
import { redditAvatar } from "@/lib/redditAvatar";

type ThemeCardProps = { theme: ThemeView; projectId: string };

/** One group of leads: what these people struggle with, and who they are. */
export function ThemeCard({ theme, projectId }: ThemeCardProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-card border bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-h3 break-words text-fg" style={{ fontWeight: 500 }}>
          {theme.label}
        </h3>
        <span className="shrink-0 rounded-control bg-surface-2 px-2 py-0.5 text-small tabular-nums text-fg-muted">
          {theme.count} {theme.count === 1 ? "lead" : "leads"}
        </span>
      </div>
      {theme.summary ? <p className="max-w-[75ch] text-body break-words text-fg-muted">{theme.summary}</p> : null}
      {theme.quotes.length > 0 ? (
        <ul className="flex flex-col gap-3 border-l pl-3">
          {theme.quotes.map((quote) => (
            <li key={quote} className="text-small break-words text-fg-muted">
              &ldquo;{quote}&rdquo;
            </li>
          ))}
        </ul>
      ) : null}
      {theme.communities.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {theme.communities.map((community) => (
            <SubredditChip key={community.name} name={community.name} iconUrl={community.iconUrl} />
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <span className="flex items-center">
          {theme.faces.map((face, index) => (
            <span
              key={`${face.name ?? "unknown"}-${index}`}
              className={index === 0 ? "" : "-ml-2"}
              title={face.name ? `u/${face.name}` : undefined}
            >
              <Avatar name={face.name} src={redditAvatar(face.name, face.avatarUrl)} size={28} />
            </span>
          ))}
        </span>
        <Link
          href={themeHref(projectId, theme.id)}
          className="transition-motion inline-flex min-h-10 items-center rounded-control px-2 text-small text-primary transition-colors hover:bg-surface-2"
        >
          View leads
        </Link>
      </div>
    </div>
  );
}
