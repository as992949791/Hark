import { CopyField } from "@/components/api/CopyField";

type ApiAccessPanelProps = { restBaseUrl: string; mcpUrl: string };

/** Where to point a script and where to point an agent. */
export function ApiAccessPanel({ restBaseUrl, mcpUrl }: ApiAccessPanelProps) {
  return (
    <section className="flex flex-col gap-4 rounded-card border bg-surface p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-h3" style={{ fontWeight: 500 }}>
          Endpoints
        </h2>
        <p className="text-body text-fg-muted">
          Send your key as an Authorization Bearer header. Reading costs nothing: every response
          comes back with X-Request-Cost-Usd set to 0.
        </p>
      </div>
      <CopyField label="REST base URL" value={restBaseUrl} />
      <CopyField label="MCP endpoint" value={mcpUrl} />
      <p className="text-body text-fg-muted">
        <a className="underline underline-offset-4" href="/openapi.json">
          OpenAPI schema
        </a>{" "}
        and the{" "}
        <a className="underline underline-offset-4" href="/agent-guide.md">
          agent guide
        </a>
        , which explains what a lead is, how to triage one, and where its cost is shown.
      </p>
    </section>
  );
}
