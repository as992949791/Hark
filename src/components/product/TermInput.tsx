"use client";

import { X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { FILTER_TERM_CAP, termsOf, wordsOf } from "@/lib/filterWords";

type TermInputProps = {
  /** The form field each term is posted under, once per term. */
  name: string;
  label: string;
  initial: string[];
  placeholder: string;
  /** What a chip in this list does, for its colour: keep a lead in, or leave it out. */
  tone: "keep" | "skip";
};

/**
 * A list of words or phrases as chips in one field. Enter, a comma or Tab ends
 * a term; Backspace in an empty box takes the last one back to edit; a pasted
 * list is split on commas and lines. A term already in the list, compared the
 * way the filter compares it, is not added twice. The chips post as hidden
 * inputs, so the card's one Save button saves them with the scores.
 */
export function TermInput({ name, label, initial, placeholder, tone }: TermInputProps) {
  const [terms, setTerms] = useState(initial);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();

  function add(raw: string) {
    const typed = termsOf(raw);
    if (typed.length === 0) {
      setNote(raw.trim() ? "A term needs a letter or a digit." : null);
      return;
    }
    const known = new Set(terms.map(wordsOf));
    const fresh = typed.filter((term) => !known.has(wordsOf(term)));
    const room = FILTER_TERM_CAP - terms.length;
    setTerms([...terms, ...fresh.slice(0, room)]);
    setDraft("");
    setNote(
      fresh.length > room
        ? `A list holds up to ${FILTER_TERM_CAP}.`
        : fresh.length < typed.length
          ? "Already in the list."
          : null,
    );
  }

  function remove(index: number) {
    setTerms(terms.filter((_, at) => at !== index));
    setNote(null);
    input.current?.focus();
  }

  const chip =
    tone === "skip"
      ? "border-score-cool/40 bg-score-cool/10"
      : "border-score-hot/40 bg-score-hot/10";

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-small text-fg-muted">
        {label}
      </label>
      <div
        onClick={() => input.current?.focus()}
        className="flex min-h-10 cursor-text flex-wrap items-center gap-1.5 rounded-control border bg-surface p-1.5 focus-within:border-fg-muted"
      >
        {terms.map((term, index) => (
          <span
            key={wordsOf(term)}
            className={`flex items-center gap-1 rounded-control border py-0.5 pl-2 pr-1 text-body text-fg ${chip}`}
          >
            {term}
            <input type="hidden" name={name} value={term} />
            <button
              type="button"
              aria-label={`Remove ${term}`}
              onClick={(event) => {
                event.stopPropagation();
                remove(index);
              }}
              className="transition-motion rounded-sm p-0.5 text-fg-muted transition-colors hover:text-fg"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          ref={input}
          value={draft}
          placeholder={terms.length === 0 ? placeholder : "Add another"}
          onChange={(event) => {
            const value = event.target.value;
            // A comma typed ends the term before it, as Enter does.
            if (value.includes(",")) {
              add(value);
            } else {
              setDraft(value);
              setNote(null);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || (event.key === "Tab" && draft.trim())) {
              // Enter would submit the card; it ends the term instead.
              event.preventDefault();
              add(draft);
            } else if (event.key === "Backspace" && draft === "" && terms.length > 0) {
              event.preventDefault();
              setDraft(terms[terms.length - 1]);
              setTerms(terms.slice(0, -1));
            }
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData("text");
            if (/[\n,]/.test(pasted)) {
              event.preventDefault();
              add(draft + pasted);
            }
          }}
          // A term typed and never ended still counts when the card is saved.
          onBlur={() => draft.trim() && add(draft)}
          className="h-7 min-w-32 flex-1 bg-transparent px-1 text-body text-fg outline-none placeholder:text-fg-muted"
        />
      </div>
      {note ? (
        <span aria-live="polite" className="text-small text-fg-muted">
          {note}
        </span>
      ) : null}
    </div>
  );
}
