"use client";

import { useActionState } from "react";
import { TermInput } from "@/components/product/TermInput";
import { Button } from "@/components/ui/button";
import {
  saveLeadFiltersAction,
  type ProfileState,
} from "@/app/app/product/actions";

export type LeadFiltersFields = {
  projectId: string;
  scoreThreshold: number;
  alertMinScore: number | null;
  /** Undefined when X is not on for this owner, who is not asked about X. */
  xMinScore: number | null | undefined;
  mustMention: string[];
  skipIfMentions: string[];
  /** The house floors, shown as placeholders so an empty box says what it means. */
  defaultAlertScore: number;
};

type LeadFiltersFormProps = {
  filters: LeadFiltersFields;
  /** How many of the month's new Reddit leads the word lists keep out right now. */
  hidden: { hidden: number; total: number } | null;
};

const INITIAL: ProfileState = { error: null, saved: false };
const INPUT = "h-10 rounded-control border bg-surface px-2 text-body text-fg";

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-small text-fg-muted">
      {label}
      {children}
    </label>
  );
}

function Score({
  name,
  value,
  placeholder,
}: {
  name: string;
  value: number | null;
  placeholder?: string;
}) {
  return (
    <input
      name={name}
      type="number"
      min={0}
      max={100}
      step={1}
      defaultValue={value ?? ""}
      placeholder={placeholder}
      className={`${INPUT} w-32 tabular-nums`}
    />
  );
}

/**
 * Which of the judge's leads this project wants shown and sent. The judge
 * decides whether someone is asking; these say which of them the owner cares
 * about, applied when leads are read, so saving never rescans.
 */
export function LeadFiltersForm({ filters, hidden }: LeadFiltersFormProps) {
  const [state, formAction, pending] = useActionState(saveLeadFiltersAction, INITIAL);

  return (
    <form id="lead-filters" action={formAction} className="flex scroll-mt-24 flex-col gap-4 rounded-card border bg-surface p-6">
      <input type="hidden" name="projectId" value={filters.projectId} />
      <div className="flex flex-col gap-1">
        <h2 className="text-h3" style={{ fontWeight: 500 }}>
          Lead filters
        </h2>
        <p className="text-small text-fg-muted">
          Which leads you see and get alerts for. Unlike Keep out on the Product
          page, which the scorer weighs as a hint, these are exact rules. They apply to
          Reddit and X, take effect at once, and never delete a lead: loosen
          one and what it held back comes back.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TermInput
          name="mustMention"
          label="Only leads that mention one of"
          initial={filters.mustMention}
          placeholder="invoice, billing software"
          tone="keep"
        />
        <TermInput
          name="skipIfMentions"
          label="Never leads that mention"
          initial={filters.skipIfMentions}
          placeholder="hiring, homework"
          tone="skip"
        />
      </div>
      <p className="text-small text-fg-muted">
        Press Enter or type a comma after each word or phrase. Each matches
        as whole words in any case, plurals included, in the post&apos;s title and text and the
        reply itself when a lead is one. Leave the first empty to allow every
        topic.
        {hidden && hidden.hidden > 0
          ? ` Right now they keep ${hidden.hidden} of this month's ${hidden.total} new Reddit leads out.`
          : null}
      </p>
      <div className="flex flex-wrap gap-6">
        <Line label="Minimum score to show a lead">
          <Score name="scoreThreshold" value={filters.scoreThreshold} />
        </Line>
        <Line label="Minimum score to alert">
          <Score
            name="alertMinScore"
            value={filters.alertMinScore}
            placeholder={String(filters.defaultAlertScore)}
          />
        </Line>
        {filters.xMinScore === undefined ? null : (
          <Line label="Minimum score for an X ask">
            <Score name="xMinScore" value={filters.xMinScore} placeholder="None" />
          </Line>
        )}
      </div>
      <p className="text-small text-fg-muted">
        Scores run 0 to 100. A Reddit lead under the first is left out of your
        leads; one under the second stays in them but is not sent to your
        alert channels, which never send what the feed hides.
        {filters.xMinScore === undefined
          ? null
          : " An X ask under the third is left out of both."}
      </p>
      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving" : "Save filters"}
        </Button>
        {state.error ? (
          <span aria-live="polite" className="text-small text-fg-muted">
            {state.error}
          </span>
        ) : null}
        {state.saved && !state.error ? (
          <span aria-live="polite" className="text-small text-fg-muted">
            Saved.
          </span>
        ) : null}
      </div>
    </form>
  );
}
