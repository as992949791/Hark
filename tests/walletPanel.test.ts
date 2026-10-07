import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WalletPanel, type PlanScope } from "@/components/WalletPanel";

vi.mock("@/app/app/settings/actions", () => ({ disconnectWalletAction: vi.fn() }));

const scopes: PlanScope[] = ["general", "reddit", "x"];

describe("wallet funding in settings", () => {
  it.each(scopes)("does not offer a hosted plan to an unconnected self-hosted %s instance", (scope) => {
    const html = renderToStaticMarkup(createElement(WalletPanel, { connectedAt: null, selfHosted: true, scope }));

    expect(html).toContain("Hosted plan limits do not apply");
    expect(html).not.toContain("$0, shared wallet");
    expect(html).not.toContain('href="/connect"');
  });

  it.each(scopes)("discloses a connected wallet in self-hosted %s settings", (scope) => {
    const html = renderToStaticMarkup(
      createElement(WalletPanel, { connectedAt: new Date("2026-10-01"), selfHosted: true, scope }),
    );

    expect(html).toContain("AnyAPI wallet connected on 2026-10-01");
    expect(html).not.toContain("uses your own API keys");
    expect(html).not.toContain("$0, shared wallet");
    expect(html.includes("Disconnect wallet")).toBe(scope === "general");
  });

  it("offers connection for an unconnected hosted account", () => {
    const html = renderToStaticMarkup(createElement(WalletPanel, { connectedAt: null, selfHosted: false }));

    expect(html).toContain("$0, shared wallet");
    expect(html).toContain('href="/connect"');
  });

  it("keeps disconnection available for a connected hosted account", () => {
    const html = renderToStaticMarkup(
      createElement(WalletPanel, { connectedAt: new Date("2026-10-01"), selfHosted: false }),
    );

    expect(html).toContain("Disconnect wallet");
    expect(html).not.toContain('href="/connect"');
  });
});
