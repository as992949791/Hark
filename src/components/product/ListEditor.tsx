"use client";

import { X } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  addListItemAction,
  removeListItemAction,
  type ListKind,
} from "@/app/app/product/actions";

/** One place or one phrasing, with the page text it was read from. */
export type ListItem = {
  value: string;
  sourceText: string | null;
  /** The list this one lives in, where a card shows more than one. */
  kind?: ListKind;
};

type ListEditorProps = {
  title: string;
  hint: string;
  placeholder: string;
  kind: ListKind;
  /**
   * The lists a card holds when it holds more than one, in the words a person
   * choosing between them would use. What is added goes to the one picked.
   */
  kinds?: { value: ListKind; label: string }[];
  projectId: string;
  items: ListItem[];
};

/**
 * The two lists discovery builds its questions from: the places this product
 * serves and the way its buyers say the problem. Both are read off the product
 * page, and both are worth correcting by hand when the page is thin.
 */
export function ListEditor({
  title,
  hint,
  placeholder,
  kind,
  kinds,
  projectId,
  items,
}: ListEditorProps) {
  const [draft, setDraft] = useState("");
  const [addTo, setAddTo] = useState<ListKind>(kind);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section aria-busy={pending} className="flex min-w-0 flex-col gap-3 rounded-card border bg-surface p-4 md:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-h3" style={{ fontWeight: 500 }}>
          {title}
        </h2>
        <span className="text-small text-fg-muted tabular-nums">{items.length}</span>
      </div>
      <p className="text-small text-fg-muted">{hint}</p>
      <ul className="flex flex-col divide-y">
        {items.length === 0 ? (
          <li className="py-2 text-body text-fg-muted">Nothing added yet. Use the field below to add an item.</li>
        ) : (
          items.map((item) => (
            <li
              key={`${item.kind ?? kind}:${item.value}`}
              className="flex min-w-0 items-start gap-2 py-2"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1 [overflow-wrap:anywhere]">
                <span className="text-body text-fg">{item.value}</span>
                {/* A place the page names outright quotes itself, which says nothing twice. */}
                {item.sourceText && item.sourceText !== item.value ? (
                  <span className="text-small text-fg-muted">{item.sourceText}</span>
                ) : null}
              </span>
              <button
                type="button"
                aria-label={`Remove ${item.value}`}
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    await removeListItemAction(item.kind ?? kind, projectId, item.value);
                  })
                }
                className="transition-motion flex size-9 shrink-0 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-50"
              >
                <X className="size-4" />
              </button>
            </li>
          ))
        )}
      </ul>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const result = await addListItemAction(addTo, projectId, draft);
            setError(result.error);
            if (!result.error) {
              setDraft("");
            }
          });
        }}
        className="flex flex-wrap gap-2"
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          aria-label={`Add to ${title}`}
          className="min-w-0 flex-1 basis-full sm:basis-0"
        />
        {kinds ? (
          <Select
            className="h-10"
            ariaLabel={`Which part of ${title}`}
            value={addTo}
            onValueChange={(next) => setAddTo(next as ListKind)}
            options={kinds}
          />
        ) : null}
        <Button type="submit" variant="outline" size="lg" disabled={pending}>
          {pending ? "Saving" : "Add"}
        </Button>
      </form>
      {error ? (
        <p aria-live="polite" className="text-small text-fg-muted">
          {error}
        </p>
      ) : null}
    </section>
  );
}
