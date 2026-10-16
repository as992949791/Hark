import { SubredditChip } from "@/components/SubredditChip";
import { fullCount } from "@/lib/format";
import type { CommunityRow } from "@/lib/insights/read";

type CommunitiesTableProps = { rows: CommunityRow[] };

/** Where the leads come from, and what each community allows you to say. */
export function CommunitiesTable({ rows }: CommunitiesTableProps) {
  return (
    <div
      role="region"
      aria-label="Community comparison; scroll horizontally for more columns"
      tabIndex={0}
      className="overflow-x-auto rounded-card border bg-surface"
    >
      <table className="w-full min-w-[42rem] text-body">
        <caption className="sr-only">Lead quality and participation rules by community</caption>
        <thead>
          <tr className="border-b text-left text-small text-fg-muted">
            <th scope="col" className="bg-surface-2 p-4" style={{ fontWeight: 400 }}>
              Community
            </th>
            <th scope="col" className="bg-surface-2 p-4" style={{ fontWeight: 400 }}>
              Leads
            </th>
            <th scope="col" className="bg-surface-2 p-4" style={{ fontWeight: 400 }}>
              Average score
            </th>
            <th scope="col" className="bg-surface-2 p-4" style={{ fontWeight: 400 }}>
              Self-promotion
            </th>
            <th scope="col" className="bg-surface-2 p-4" style={{ fontWeight: 400 }}>
              Weekly active users
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="p-4 text-fg-muted" colSpan={5}>
                No leads yet, so there is nothing to compare.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.name} className="border-b last:border-0">
                <td className="p-4">
                  <SubredditChip name={row.name} iconUrl={row.iconUrl} />
                </td>
                <td className="p-4 tabular-nums">{row.leads}</td>
                <td className="p-4 tabular-nums">{row.averageScore}</td>
                <td className="max-w-sm p-4 text-small break-words text-fg-muted">
                  {row.promoPolicy ?? "No rule stored yet"}
                </td>
                <td className="p-4 tabular-nums">{fullCount(row.weeklyActiveUsers)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
