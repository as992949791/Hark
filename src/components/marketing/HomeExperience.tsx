"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDown, ArrowRight, ArrowUpRight, AudioLines, Bell, BatteryFull,
  Check, ChevronDown, Code2, Compass, Layers, Lightbulb, MessageSquare,
  Search, Target, Wifi,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { REPO_URL } from "@/lib/brand";
import "./home.css";

type Lead = {
  id: string;
  source: "Reddit" | "X";
  title: string;
  author: string;
  community: string;
  age: string;
  score: number;
  match: string;
  fit: string;
};
const examples: Lead[] = [
  {
    id: "captions",
    source: "Reddit",
    title: "Is there a better way to caption short videos?",
    author: "framebyframe",
    community: "VideoEditing",
    age: "2h",
    score: 91,
    match: "I spend more time fixing captions than editing the video.",
    fit: "CapCut combines automatic captions with a timeline editor, matching this creator’s repeated captioning workflow.",
  },
  {
    id: "interview",
    source: "Reddit",
    title: "Editing interview clips is taking my whole weekend",
    author: "theclipjournal",
    community: "ContentCreation",
    age: "4h",
    score: 86,
    match:
      "I need an easier way to turn one interview into a few captioned clips.",
    fit: "The request combines short-form editing and captions, both supported by the product profile.",
  },
  {
    id: "brand",
    source: "X",
    title: "Looking for a simple editor that keeps captions on-brand",
    author: "smallstudio_notes",
    community: "X",
    age: "5h",
    score: 84,
    match:
      "Any editor recommendations for consistent captions across a small team?",
    fit: "An explicit tool request with a caption styling need. Verify the team’s collaboration requirements before responding.",
  },
  {
    id: "podcast",
    source: "Reddit",
    title: "What do you use to cut a podcast into short clips?",
    author: "weekend_creator",
    community: "SmallYoutubers",
    age: "6h",
    score: 82,
    match:
      "I want to make vertical clips without learning a complicated editor.",
    fit: "A concrete short-form editing need with a preference for an approachable workflow.",
  },
  {
    id: "workflow",
    source: "X",
    title: "Trying to replace three apps in my video workflow",
    author: "create_and_repeat",
    community: "X",
    age: "8h",
    score: 78,
    match: "What would you use to edit, caption and resize in one place?",
    fit: "The requested editing tasks overlap with the product, though budget and device requirements are still unknown.",
  },
  {
    id: "browser",
    source: "Reddit",
    title: "Need an editor without a full desktop learning curve",
    author: "everyday_maker",
    community: "software",
    age: "1d",
    score: 76,
    match: "A simple editor with captions would cover most of what I need.",
    fit: "A relevant lightweight editing request. The intended device and publishing workflow need clarification.",
  },

];

function Brand() {
  return (
    <span className="brand">
      <AudioLines aria-hidden="true" />
      <span>Hark</span>
    </span>
  );
}
function Source({ lead }: { lead: Lead }) {
  return (
    <span className={`source-symbol ${lead.source === "X" ? "source-x" : ""}`}>
      {lead.source === "Reddit" ? (
        <MessageSquare size={12} aria-hidden="true" />
      ) : (
        "X"
      )}
    </span>
  );
}
const features = [
  {
    id: "reddit",
    label: "Reddit leads",
    icon: MessageSquare,
    title: "Meet the need behind the mention.",
    body: "Find people asking for tools like yours. Read the request and the reason it fits before deciding to reply.",
  },
  {
    id: "x",
    label: "X leads",
    icon: Search,
    title: "Catch the conversation while it is fresh.",
    body: "Review public requests on X alongside the product context, with the original words kept in view.",
  },
  {
    id: "seo",
    label: "Reddit SEO",
    icon: Compass,
    title: "See which conversations show up in search.",
    body: "Explore Reddit threads found in search results and understand which product questions they answer.",
  },
  {
    id: "competitors",
    label: "Competitors",
    icon: Target,
    title: "Understand why people look elsewhere.",
    body: "Inspect competitor mentions, switching reasons and the unmet needs behind an alternative request.",
  },
  {
    id: "insights",
    label: "Insights",
    icon: Lightbulb,
    title: "Find the themes worth paying attention to.",
    body: "Bring related pain points together, then return to the conversations behind each observation.",
  },
  {
    id: "alerts",
    label: "Alerts & API",
    icon: Bell,
    title: "Keep the useful context close.",
    body: "Receive email digests, connect a Webhook, or read your saved leads through the API and MCP.",
  },
] as const;

function FeatureExplorer() {
  const [active, setActive] =
    useState<(typeof features)[number]["id"]>("reddit");
  const feature = features.find((item) => item.id === active)!;
  const sampleLeads = examples
    .filter(
      (lead) => lead.source === (active === "x" ? "X" : "Reddit"),
    )
    .slice(0, 3);
  return (
    <section id="features" className="feature-section wrap">
      <div className="section-intro">
        <h2>
          A wider view.
          <br />
          <span className="gradient-text">A more useful next step.</span>
        </h2>
        <p>
          From the first request to the patterns behind it. Explore the tools in
          Hark.
        </p>
      </div>
      <div
        className="feature-tabs"
        role="group"
        aria-label="Explore Hark features"
      >
        {features.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            aria-pressed={active === id}
            aria-controls="feature-preview"
            className={active === id ? "selected" : ""}
          >
            {id === "x" ? (
              <span className="x-icon" aria-hidden="true">
                X
              </span>
            ) : (
              <Icon size={17} aria-hidden="true" />
            )}
            {label}
          </button>
        ))}
      </div>
      <div id="feature-preview" className="feature-deck">
        <div className="feature-copy">
          <h3>{feature.title}</h3>
          <p>{feature.body}</p>
          <Link className="text-link" href="/app/leads">
            Open workspace <ArrowRight size={16} />
          </Link>
          <span className="feature-disclosure">
            Illustrative previews · synthetic examples
          </span>
        </div>
        <div className="feature-example" aria-live="polite" aria-atomic="true">
          <div className="example-bar">
            <span className="example-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <strong>CapCut / {feature.label}</strong>
            <span>Sample</span>
          </div>
          {(active === "reddit" || active === "x") && (
            <div className="feature-leads">
              {sampleLeads.map((lead) => (
                <div key={lead.id}>
                  <Source lead={lead} />
                  <div>
                    <strong>{lead.title}</strong>
                    <small>
                      {lead.source === "Reddit"
                        ? `r/${lead.community}`
                        : `@${lead.author}`}
                    </small>
                  </div>
                  <span className="fit-pill">{lead.score} fit</span>
                </div>
              ))}
              <p>
                <Target size={15} /> Every match comes with a reason to inspect.
              </p>
            </div>
          )}
          {active === "seo" && (
            <div className="seo-preview">
              <p>
                Search query <strong>best automatic caption tool</strong>
              </p>
              <div className="preview-table-head">
                <span>Reddit thread</span>
                <span>Example position</span>
              </div>
              {[
                ["What do you use for accurate captions?", "#3"],
                ["Caption tools for short videos", "#6"],
                ["A simpler workflow for interview clips", "#9"],
              ].map(([title, rank]) => (
                <div className="preview-table-row" key={title}>
                  <span>
                    <MessageSquare size={14} />
                    {title}
                  </span>
                  <strong>{rank}</strong>
                </div>
              ))}
              <small>
                Illustrative positions, not measured search rankings.
              </small>
            </div>
          )}
          {active === "competitors" && (
            <div className="research-preview">
              <div className="research-summary">
                <Target size={21} />
                <span>
                  Alternative requests
                  <strong>What makes someone switch?</strong>
                </span>
              </div>
              <blockquote>
                “Our editor works, but captions still take too much manual
                cleanup.”
              </blockquote>
              <div className="research-tags">
                <span>Caption accuracy</span>
                <span>Editing effort</span>
                <span>Tool switching</span>
              </div>
              <p>A starting point for research. Check the original context.</p>
            </div>
          )}
          {active === "insights" && (
            <div className="insight-preview">
              {[
                [
                  "Caption cleanup",
                  "Repeated manual corrections slow down publishing.",
                  86,
                ],
                [
                  "Too many tools",
                  "Editing, captions and resizing happen in different places.",
                  67,
                ],
                [
                  "Learning curve",
                  "Occasional creators want a simpler way to start.",
                  49,
                ],
              ].map(([title, body, width]) => (
                <div key={title}>
                  <strong>{title}</strong>
                  <p>{body}</p>
                  <span className="insight-track">
                    <i style={{ width: `${width}%` }} />
                  </span>
                </div>
              ))}
              <small>
                Illustrative theme distribution, not a measured report.
              </small>
            </div>
          )}
          {active === "alerts" && (
            <div className="alert-preview">
              <div className="mail-preview">
                <Bell size={21} />
                <span>
                  Email digest<strong>3 new leads for CapCut</strong>
                </span>
                <span className="fit-pill">Example</span>
              </div>
              <p>
                A short summary, the matching reason and a link back to the
                conversation.
              </p>
              <div className="delivery-options">
                <span>
                  <Check size={14} /> Email
                </span>
                <span>
                  <Code2 size={14} /> Webhook
                </span>
                <span>
                  <Layers size={14} /> REST / MCP
                </span>
              </div>
              <small>This preview does not send a notification.</small>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function HomeExperience() {
  const [sample, setSample] = useState(0);
  const lead = examples[sample];
  return (
    <div className="hark-home homepage">
      <div className="sky-stage">
        <header className="home-nav wrap">
          <Link href="/" aria-label="Hark home">
            <Brand />
          </Link>
          <nav aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#data-costs">Data costs</a>
          </nav>
          <div className="home-account">
            <ThemeToggle />
            <Link className="button small dark-button" href="/app/leads">
              Open workspace <ArrowUpRight size={15} />
            </Link>
          </div>
        </header>
        <section className="hero wrap">
          <div className="hero-copy">
            <h1>
              Find people asking
              <br />
              <span className="gradient-text">for what you build.</span>
            </h1>
            <p className="hero-description">
              Turn conversations on Reddit and X into relevant leads. See the
              request, understand the fit, and decide where you can help.
            </p>
            <div className="hero-actions">
              <Link className="button primary" href="/app/leads">
                Explore the workspace <ArrowRight size={17} />
              </Link>
              <a className="text-link" href="#how-it-works">
                See how it works <ArrowDown size={15} />
              </a>
            </div>
            <div className="hero-secondary">
              <a
                href={`${REPO_URL}#five-minute-self-host`}
                target="_blank"
                rel="noreferrer"
              >
                <Code2 size={14} /> Self-host Hark <ArrowUpRight size={12} />
              </a>
              <a href="#features">
                Browse all features <ArrowDown size={12} />
              </a>
            </div>
            <p className="hero-assurance">
              <Check size={14} /> Open source <span>·</span> You choose when to
              reply
            </p>
          </div>
          <figure
            className="device-showcase"
            aria-label="Interactive desktop and phone product previews"
          >
            <div className="desktop-device">
              <div className="desktop-camera" aria-hidden="true">
                <i />
              </div>
              <div className="desktop-display">
                <div className="device-app-rail" aria-hidden="true">
                  <Brand />
                  <span className="device-project">
                    C <strong>CapCut</strong>
                  </span>
                  <span className="device-nav-item selected">
                    <MessageSquare size={14} /> Leads
                  </span>
                  <span className="device-nav-item">
                    <Search size={14} /> X leads
                  </span>
                  <span className="device-nav-item">
                    <Compass size={14} /> Reddit SEO
                  </span>
                  <span className="device-nav-item">
                    <Lightbulb size={14} /> Insights
                  </span>
                  <span className="device-nav-item">
                    <Target size={14} /> Competitors
                  </span>
                  <span className="device-nav-item">
                    <Bell size={14} /> Alerts
                  </span>
                  <span className="device-rail-note">Sample workspace</span>
                </div>
                <div
                  className="hero-product"
                  aria-label="Interactive sample of lead matching"
                >
                  <div className="product-topline">
                    <Brand />
                    <span className="sample-label">Sample project</span>
                    <span className="project-corner">
                      CapCut <ChevronDown size={13} />
                    </span>
                  </div>
                  <div className="mini-work">
                    <div className="mini-heading">
                      <span>Conversations worth a closer look</span>
                      <span>Reddit + X</span>
                    </div>
                    <div className="mini-rows">
                      {examples.slice(0, 3).map((item, i) => (
                        <button
                          key={item.id}
                          className={`mini-row ${sample === i ? "selected" : ""}`}
                          onClick={() => setSample(i)}
                          aria-pressed={sample === i}
                        >
                          <Source lead={item} />
                          <span>
                            <strong>{item.title}</strong>
                            <small>
                              {item.source === "Reddit"
                                ? `r/${item.community}`
                                : `@${item.author}`}{" "}
                              <span>·</span> {item.age} ago
                            </small>
                          </span>
                          <span className="mini-score">
                            {item.score}
                            <small>fit</small>
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="mini-evidence">
                      <div>
                        <Target size={15} />
                        <strong>Why it matches</strong>
                      </div>
                      <p key={lead.id}>{lead.fit}</p>
                      <span className="evidence-link">
                        The request, in their words <ArrowDown size={12} />
                      </span>
                      <blockquote>“{lead.match}”</blockquote>
                    </div>
                  </div>
                  <div className="product-bottomline">
                    <span>Synthetic examples · not live leads</span>
                    <Link href="/app/leads">
                      Take a closer look <ArrowUpRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
              <div className="laptop-base" aria-hidden="true">
                <i />
              </div>
            </div>
            <div className="phone-device">
              <div className="phone-island" aria-hidden="true" />
              <div className="phone-screen">
                <div className="phone-status" aria-hidden="true">
                  <span>9:41</span>
                  <span>
                    <Wifi size={13} />
                    <BatteryFull size={16} />
                  </span>
                </div>
                <div className="phone-app-nav">
                  <Brand />
                  <span className="phone-avatar" aria-hidden="true">
                    C
                  </span>
                </div>
                <div
                  className="phone-content"
                  role="region"
                  aria-label="Phone screen preview"
                  tabIndex={0}
                >
                  <h2>
                    Good conversations.
                    <br />
                    <span className="gradient-text">Within reach.</span>
                  </h2>
                  <p className="phone-project-label">
                    CapCut · Synthetic examples
                  </p>
                  <div
                    className="phone-leads"
                    role="group"
                    aria-label="Phone sample conversations"
                  >
                    {examples.slice(0, 3).map((item, i) => (
                      <button
                        key={item.id}
                        className={sample === i ? "selected" : ""}
                        aria-pressed={sample === i}
                        onClick={() => setSample(i)}
                      >
                        <Source lead={item} />
                        <span>
                          <strong>{item.title}</strong>
                          <small>
                            {item.score} fit · {item.source}
                          </small>
                        </span>
                        <ArrowUpRight size={13} />
                      </button>
                    ))}
                  </div>
                  <div className="phone-match">
                    <span>
                      <Target size={14} /> Why it matches
                    </span>
                    <p>{lead.fit}</p>
                    <blockquote aria-label="Selected conversation quote">
                      “{lead.match}”
                    </blockquote>
                  </div>
                  <Link
                    className="button primary phone-open"
                    href="/app/leads"
                  >
                    Open workspace <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
              <div className="phone-home-indicator" aria-hidden="true" />
            </div>
            <figcaption>
              One workspace. Every screen.{" "}
              <span>Synthetic examples · no live requests</span>
            </figcaption>
          </figure>
        </section>
      </div>
      <main>
        <section
          className="principle-strip wrap"
          aria-label="Product principles"
        >
          <p>
            Better conversations begin
            <br />
            <strong>with better context.</strong>
          </p>
          <div>
            <MessageSquare size={18} />
            <span>
              Public conversations.
              <br />
              Specific needs.
            </span>
          </div>
          <div>
            <Target size={18} />
            <span>
              A reason for every match.
              <br />
              Evidence you can inspect.
            </span>
          </div>
          <div>
            <Check size={18} />
            <span>
              No automated replies.
              <br />
              No unsolicited DMs.
            </span>
          </div>
        </section>
        <FeatureExplorer />
        <section id="how-it-works" className="method-section">
          <div className="wrap method-grid">
            <div>
              <h2>
                Less noise.
                <br />
                More understanding.
              </h2>
              <p>
                A keyword mention is only the beginning. Hark brings the
                product, the conversation and the reason together.
              </p>
              <Link className="text-link" href="/app/leads">
                Follow a conversation <ArrowRight size={16} />
              </Link>
            </div>
            <ol className="method-list">
              <li>
                <span className="method-number">1</span>
                <div>
                  <h3>Start with your product</h3>
                  <p>
                    A URL becomes an editable profile of what you offer and who
                    it helps.
                  </p>
                </div>
              </li>
              <li>
                <span className="method-number">2</span>
                <div>
                  <h3>Find the relevant conversations</h3>
                  <p>
                    Search public posts and judge the request against that
                    product profile.
                  </p>
                </div>
              </li>
              <li>
                <span className="method-number">3</span>
                <div>
                  <h3>Read the evidence. Make the call.</h3>
                  <p>
                    Review the match, inspect the community context and manage
                    your response.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>
        <section id="what-you-get" className="capabilities wrap">
          <div className="section-intro">
            <h2>
              The context behind
              <br />
              every opportunity.
            </h2>
            <p>One place to move from discovery to a useful conversation.</p>
          </div>
          <div className="capability-table">
            {[
              [
                MessageSquare,
                "Reddit & X leads",
                "Requests, alternatives and relevant conversations, with a written judgement.",
              ],
              [
                Compass,
                "Research",
                "Competitor mentions, pain themes and Reddit threads found in search results.",
              ],
              [
                Bell,
                "Your workflow",
                "Email digests, Webhook delivery and read-only API / MCP access.",
              ],
            ].map(([Icon, title, body]) => {
              const I = Icon as typeof MessageSquare;
              return (
                <div className="capability-row" key={String(title)}>
                  <I size={22} />
                  <h3>{String(title)}</h3>
                  <p>{String(body)}</p>
                  <ArrowUpRight size={17} />
                </div>
              );
            })}
          </div>
        </section>
        <section id="data-costs" className="cost-section wrap">
          <div>
            <h2>
              Open source.
              <br />
              Clear about usage.
            </h2>
            <p>
              Host the code yourself. Data and model providers charge separately
              for their requests, so start small and set a budget.
            </p>
          </div>
          <a
            className="button subtle"
            href={`${REPO_URL}#costs-measured`}
            target="_blank"
            rel="noreferrer"
          >
            Read the cost notes <ArrowUpRight size={16} />
          </a>
        </section>
        <section className="closing wrap">
          <div>
            <h2>
              Your next useful conversation
              <br />
              starts with listening.
            </h2>
            <p>Bring your product. Find the conversations that matter.</p>
          </div>
          <Link className="button primary" href="/app/leads">
            Explore Hark <ArrowRight size={17} />
          </Link>
        </section>
      </main>
      <footer className="home-footer wrap">
        <Brand />
        <p>
          Built from{" "}
          <a
            href="https://github.com/getanyapi-com/lurk"
            target="_blank"
            rel="noreferrer"
          >
            Lurk
          </a>
          , under MIT. Data by AnyAPI.
        </p>
        <nav className="home-legal" aria-label="Legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
        <span>Data and AI requests can incur usage costs.</span>
      </footer>
    </div>
  );
}
