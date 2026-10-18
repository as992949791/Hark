import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Bell,
  BatteryFull,
  Check,
  ChevronDown,
  CircleHelp,
  Code2,
  Compass,
  EyeOff,
  Filter,
  Layers,
  Lightbulb,
  LoaderCircle,
  Menu,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sun,
  Target,
  Undo2,
  Wallet,
  Wifi,
  X,
} from "lucide-react";
import "./style.css";

type Status = "new" | "replied" | "hidden";
type Lead = {
  id: string;
  project: string;
  source: "Reddit" | "X";
  title: string;
  author: string;
  community: string;
  age: string;
  score: number;
  body: string;
  match: string;
  fit: string;
  status: Status;
};
const examples: Lead[] = [
  {
    id: "captions",
    project: "CapCut",
    source: "Reddit",
    title: "Is there a better way to caption short videos?",
    author: "framebyframe",
    community: "VideoEditing",
    age: "2h",
    score: 91,
    body: "I make short tutorials every week. The editing is fine, but getting every caption right is taking forever. I need something simple that can handle the first pass and let me fix the details.",
    match: "I spend more time fixing captions than editing the video.",
    fit: "CapCut combines automatic captions with a timeline editor, matching this creator’s repeated captioning workflow.",
    status: "new",
  },
  {
    id: "interview",
    project: "CapCut",
    source: "Reddit",
    title: "Editing interview clips is taking my whole weekend",
    author: "theclipjournal",
    community: "ContentCreation",
    age: "4h",
    score: 86,
    body: "I record one long interview and need a few short clips for social. My current setup involves three different tools. Has anyone found a simpler workflow?",
    match:
      "I need an easier way to turn one interview into a few captioned clips.",
    fit: "The request combines short-form editing and captions, both supported by the product profile.",
    status: "new",
  },
  {
    id: "brand",
    project: "CapCut",
    source: "X",
    title: "Looking for a simple editor that keeps captions on-brand",
    author: "smallstudio_notes",
    community: "X",
    age: "5h",
    score: 84,
    body: "Our tiny team needs consistent captions across our videos. We are looking for an editor that makes the routine work easier without a complicated desktop setup.",
    match:
      "Any editor recommendations for consistent captions across a small team?",
    fit: "An explicit tool request with a caption styling need. Verify the team’s collaboration requirements before responding.",
    status: "new",
  },
  {
    id: "podcast",
    project: "CapCut",
    source: "Reddit",
    title: "What do you use to cut a podcast into short clips?",
    author: "weekend_creator",
    community: "SmallYoutubers",
    age: "6h",
    score: 82,
    body: "I have a 40-minute recording and want to make a few vertical clips. I am still learning video editing and would love something approachable.",
    match:
      "I want to make vertical clips without learning a complicated editor.",
    fit: "A concrete short-form editing need with a preference for an approachable workflow.",
    status: "new",
  },
  {
    id: "workflow",
    project: "CapCut",
    source: "X",
    title: "Trying to replace three apps in my video workflow",
    author: "create_and_repeat",
    community: "X",
    age: "8h",
    score: 78,
    body: "I edit in one place, add captions somewhere else, then resize for each platform. There must be a simpler way to do this.",
    match: "What would you use to edit, caption and resize in one place?",
    fit: "The requested editing tasks overlap with the product, though budget and device requirements are still unknown.",
    status: "new",
  },
  {
    id: "browser",
    project: "CapCut",
    source: "Reddit",
    title: "Need an editor without a full desktop learning curve",
    author: "everyday_maker",
    community: "software",
    age: "1d",
    score: 76,
    body: "I occasionally make product videos and do not need a professional editing suite. I am looking for something that helps with the basics.",
    match: "A simple editor with captions would cover most of what I need.",
    fit: "A relevant lightweight editing request. The intended device and publishing workflow need clarification.",
    status: "new",
  },
  {
    id: "booking",
    project: "Cal.com",
    source: "Reddit",
    title: "Need round-robin booking for a small sales team",
    author: "team_operations",
    community: "SaaS",
    age: "3h",
    score: 93,
    body: "Our team has outgrown one shared calendar. I need to distribute bookings between available team members and avoid manual back-and-forth.",
    match: "Looking for a booking tool with round-robin routing.",
    fit: "Cal.com supports team booking and routing, directly matching the stated scheduling requirement.",
    status: "new",
  },
  {
    id: "calendar",
    project: "Cal.com",
    source: "X",
    title: "What are people using for self-hosted scheduling?",
    author: "independent_builder",
    community: "X",
    age: "7h",
    score: 87,
    body: "I want a booking page that I can host myself and connect to our calendars. Recommendations from people using one would help.",
    match: "Is there a self-hosted alternative for scheduling meetings?",
    fit: "An explicit request for the product category and its self-hosting capability.",
    status: "new",
  },
];

function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={`brand ${inverse ? "inverse" : ""}`}>
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

function FeatureExplorer({ openWorkspace }: { openWorkspace: () => void }) {
  const [active, setActive] =
    useState<(typeof features)[number]["id"]>("reddit");
  const feature = features.find((item) => item.id === active)!;
  const sampleLeads = examples
    .filter(
      (lead) =>
        lead.project === "CapCut" &&
        lead.source === (active === "x" ? "X" : "Reddit"),
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
          <button className="text-link" onClick={openWorkspace}>
            Explore sample leads <ArrowRight size={16} />
          </button>
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

function Home({ openWorkspace }: { openWorkspace: () => void }) {
  const [sample, setSample] = useState(0);
  const lead = examples[sample];
  return (
    <div className="homepage">
      <div className="sky-stage">
        <header className="home-nav wrap">
          <a href="#home" aria-label="Hark home">
            <Brand />
          </a>
          <nav aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#data-costs">Data costs</a>
          </nav>
          <button className="button small dark-button" onClick={openWorkspace}>
            Open workspace <ArrowUpRight size={15} />
          </button>
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
              <button className="button primary" onClick={openWorkspace}>
                Explore the workspace <ArrowRight size={17} />
              </button>
              <a className="text-link" href="#how-it-works">
                See how it works <ArrowDown size={15} />
              </a>
            </div>
            <div className="hero-secondary">
              <a
                href="https://github.com/as992949791/Hark#five-minute-self-host"
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
                    <span>Synthetic examples for this design draft</span>
                    <button onClick={openWorkspace}>
                      Take a closer look <ArrowUpRight size={13} />
                    </button>
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
                  <button
                    className="button primary phone-open"
                    onClick={openWorkspace}
                  >
                    Open sample workspace <ArrowRight size={14} />
                  </button>
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
        <FeatureExplorer openWorkspace={openWorkspace} />
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
              <button className="text-link" onClick={openWorkspace}>
                Follow a conversation <ArrowRight size={16} />
              </button>
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
            href="https://github.com/as992949791/Hark#costs-measured"
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
            <p>Take a look around the sample workspace.</p>
          </div>
          <button className="button primary" onClick={openWorkspace}>
            Explore Hark <ArrowRight size={17} />
          </button>
        </section>
      </main>
      <footer className="home-footer wrap">
        <Brand />
        <p>MIT licensed. Data by AnyAPI.</p>
        <span>Data and AI requests can incur usage costs.</span>
      </footer>
    </div>
  );
}

function Workspace({
  viewState,
  setViewState,
}: {
  viewState: string;
  setViewState: (state: string) => void;
}) {
  const [leads, setLeads] = useState(examples);
  const [project, setProject] = useState("CapCut");
  const [selectedId, setSelectedId] = useState("captions");
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState<Status>("new");
  const [search, setSearch] = useState("");
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const leadList = useRef<HTMLElement>(null);
  const mobileBack = useRef<HTMLButtonElement>(null);
  const openedRow = useRef<HTMLButtonElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [undo, setUndo] = useState<{
    id: string;
    previous: Status;
    message: string;
  } | null>(null);
  useEffect(() => {
    if (viewState !== "loading") return;
    const timer = setTimeout(() => setViewState("ready"), 1000);
    return () => clearTimeout(timer);
  }, [viewState, setViewState]);
  useEffect(() => {
    if (!menuOpen) return;
    const trigger = menuTrigger.current;
    const first = sidebar.current?.querySelector<HTMLElement>(
      "a, button:not(:disabled), select",
    );
    first?.focus();
    const keepFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>(
          "a, button:not(:disabled), select",
        ) ?? [],
      );
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keepFocus);
    return () => {
      document.removeEventListener("keydown", keepFocus);
      if (trigger?.getClientRects().length) trigger.focus();
    };
  }, [menuOpen]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 821px)");
    const closeDrawer = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener("change", closeDrawer);
    return () => desktop.removeEventListener("change", closeDrawer);
  }, []);
  useEffect(() => {
    if (!detailOpen || !window.matchMedia("(max-width: 600px)").matches) return;
    const row = openedRow.current;
    const list = leadList.current;
    mobileBack.current?.focus();
    return () => {
      const target =
        row?.isConnected && row.getClientRects().length
          ? row
          : list?.querySelector<HTMLElement>("button");
      if (target?.isConnected && target.getClientRects().length) target.focus();
    };
  }, [detailOpen, viewState]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (menuOpen) setMenuOpen(false);
        else setDetailOpen(false);
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [menuOpen]);
  const projectLeads = leads.filter((lead) => lead.project === project);
  const filtered =
    viewState === "empty"
      ? []
      : projectLeads.filter(
          (lead) =>
            lead.status === status &&
            (source === "all" || lead.source === source) &&
            `${lead.title} ${lead.community} ${lead.body}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        );
  const selected =
    filtered.find((lead) => lead.id === selectedId) ?? filtered[0];
  function chooseSource(value: string) {
    setSource(value);
    setMenuOpen(false);
    setDetailOpen(false);
  }
  function changeStatus(value: Status) {
    if (!selected) return;
    setLeads((items) =>
      items.map((lead) =>
        lead.id === selected.id ? { ...lead, status: value } : lead,
      ),
    );
    setUndo({
      id: selected.id,
      previous: selected.status,
      message:
        value === "hidden"
          ? "Conversation hidden"
          : value === "replied"
            ? "Marked as replied"
            : "Conversation restored",
    });
    setDetailOpen(false);
  }
  const disabledItems = [
    { label: "Reddit SEO", icon: Compass },
    { label: "Insights", icon: Lightbulb },
    { label: "Competitors", icon: Target },
    { label: "Product", icon: Layers },
    { label: "Sources", icon: Filter },
    { label: "Filters", icon: SlidersHorizontal },
    { label: "Alerts", icon: Bell },
    { label: "Data usage", icon: Wallet },
    { label: "Settings", icon: Settings },
  ];
  return (
    <div className={`workspace ${detailOpen ? "show-detail" : ""}`}>
      {menuOpen && (
        <button
          className="nav-scrim"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <aside
        ref={sidebar}
        id="workspace-navigation"
        className={`sidebar ${menuOpen ? "is-open" : ""}`}
        role={menuOpen ? "dialog" : undefined}
        aria-modal={menuOpen ? true : undefined}
        aria-label={menuOpen ? "Workspace navigation" : undefined}
      >
        <a href="#home" aria-label="Hark home">
          <Brand inverse />
        </a>
        <label className="project-picker">
          <span className="project-avatar">
            {project === "CapCut" ? "C" : "Cal"}
          </span>
          <select
            aria-label="Active project"
            value={project}
            onChange={(event) => {
              setProject(event.target.value);
              setSearch("");
              setSource("all");
              setStatus("new");
              setDetailOpen(false);
              setMenuOpen(false);
            }}
          >
            <option>CapCut</option>
            <option>Cal.com</option>
          </select>
          <ChevronDown size={13} />
        </label>
        <button
          className="new-project"
          disabled
          title="Project creation is not connected in this visual draft"
        >
          <Plus size={15} /> New project
        </button>
        <nav aria-label="Workspace navigation">
          <p className="nav-group">Engage</p>
          <button
            className={source !== "X" ? "active" : ""}
            onClick={() => chooseSource("all")}
            aria-current={source !== "X" ? "page" : undefined}
          >
            <MessageSquare size={16} /> Leads{" "}
            <span>
              {projectLeads.filter((lead) => lead.status === "new").length}
            </span>
          </button>
          <button
            className={source === "X" ? "active" : ""}
            onClick={() => chooseSource("X")}
            aria-current={source === "X" ? "page" : undefined}
          >
            <span className="x-icon">X</span> X leads{" "}
            <span>
              {
                projectLeads.filter(
                  (lead) => lead.source === "X" && lead.status === "new",
                ).length
              }
            </span>
          </button>
          {disabledItems.map(({ label, icon: Icon }, i) => (
            <div key={label}>
              {i === 1 && <p className="nav-group">Research</p>}
              {i === 3 && <p className="nav-group">Setup</p>}
              <button
                disabled
                title="This draft focuses on the homepage and lead workspace"
              >
                <Icon size={16} />
                {label}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="owner-avatar">S</span>
          <div>
            Sample workspace<small>Local design preview</small>
          </div>
          <CircleHelp size={16} />
        </div>
      </aside>
      <div className="work-body" inert={menuOpen}>
        <header className="workspace-header">
          <div>
            <button
              ref={menuTrigger}
              aria-expanded={menuOpen}
              aria-controls="workspace-navigation"
              className="icon-button mobile-menu"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{project}</strong>
          </div>
          <span className="sample-label">Synthetic sample data</span>
        </header>
        <main className="work-main">
          <div className="work-heading">
            <div>
              <h1>{source === "X" ? "X leads" : "Leads"}</h1>
              <p>People asking for what {project} can help with.</p>
            </div>
            <button
              className="button small primary"
              onClick={() => setViewState("loading")}
              disabled={viewState === "loading"}
            >
              {viewState === "loading" ? (
                <LoaderCircle size={15} className="spin" />
              ) : (
                <Search size={15} />
              )}{" "}
              Preview scan
            </button>
          </div>
          <div className="work-toolbar">
            <div
              className="source-tabs"
              role="group"
              aria-label="Conversation source"
            >
              {["all", "Reddit", "X"].map((value) => (
                <button
                  key={value}
                  className={source === value ? "selected" : ""}
                  aria-pressed={source === value}
                  onClick={() => chooseSource(value)}
                >
                  {value === "all" ? "All sources" : value}
                </button>
              ))}
            </div>
            <div className="toolbar-filters">
              <label className="search-field">
                <Search size={15} />
                <input
                  aria-label="Search conversations"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search conversations…"
                />
              </label>
              <label className="status-select">
                <Filter size={14} />
                <select
                  aria-label="Conversation status"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as Status);
                    setDetailOpen(false);
                  }}
                >
                  <option value="new">New</option>
                  <option value="replied">Replied</option>
                  <option value="hidden">Hidden</option>
                </select>
                <ChevronDown size={12} />
              </label>
            </div>
          </div>
          {viewState === "error" ? (
            <div className="connection-error" role="alert">
              <CircleHelp size={22} />
              <h2>Couldn’t load conversations</h2>
              <p>
                This is the connection-error design state. Your saved
                conversations stay in place.
              </p>
              <button
                className="button primary small"
                onClick={() => setViewState("ready")}
              >
                Try again
              </button>
            </div>
          ) : viewState === "loading" ? (
            <div
              className="skeleton-work"
              aria-label="Loading conversations"
              role="status"
            >
              <div>
                {[1, 2, 3, 4].map((id) => (
                  <div className="skeleton-row" key={id}>
                    <span />
                    <i />
                    <i />
                  </div>
                ))}
              </div>
              <div className="skeleton-detail">
                <span />
                <i />
                <i />
                <i />
              </div>
            </div>
          ) : (
            <div className="lead-workspace">
              <section
                ref={leadList}
                className="lead-list"
                aria-label="Conversations"
              >
                <div className="list-heading">
                  <span>
                    {filtered.length}{" "}
                    {filtered.length === 1 ? "conversation" : "conversations"}
                  </span>
                  <span>Best fit first</span>
                </div>
                {filtered.length ? (
                  filtered.map((lead) => (
                    <button
                      className={`lead-row ${selected?.id === lead.id ? "selected" : ""}`}
                      key={lead.id}
                      onClick={(event) => {
                        openedRow.current = event.currentTarget;
                        setSelectedId(lead.id);
                        setDetailOpen(true);
                      }}
                      aria-pressed={selected?.id === lead.id}
                    >
                      <div className="lead-row-meta">
                        <Source lead={lead} />
                        <span>
                          {lead.source === "Reddit"
                            ? `r/${lead.community}`
                            : `@${lead.author}`}
                        </span>
                        <time>{lead.age} ago</time>
                      </div>
                      <h2>{lead.title}</h2>
                      <div className="lead-row-bottom">
                        <span>
                          {lead.status === "replied"
                            ? "Replied"
                            : lead.status === "hidden"
                              ? "Hidden"
                              : "Asking for a tool"}
                        </span>
                        <strong>
                          {lead.score}
                          <small> fit</small>
                        </strong>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="empty-list">
                    <Search size={24} />
                    <h2>No conversations here</h2>
                    <p>Try another source or status, or clear your search.</p>
                    <button
                      className="text-link"
                      onClick={() => {
                        setSearch("");
                        setSource("all");
                        setStatus("new");
                        setViewState("ready");
                      }}
                    >
                      Reset filters <ArrowRight size={14} />
                    </button>
                  </div>
                )}
                <div className="list-foot">
                  Saved examples. No live scan is running.
                </div>
              </section>
              <section
                className="lead-detail"
                aria-label="Conversation details"
              >
                {selected ? (
                  <>
                    <button
                      ref={mobileBack}
                      className="mobile-back text-link"
                      onClick={() => setDetailOpen(false)}
                    >
                      <ArrowLeft size={16} /> Back to leads
                    </button>
                    <div className="detail-header">
                      <div className="detail-meta">
                        <Source lead={selected} />
                        <span>
                          {selected.source === "Reddit"
                            ? `r/${selected.community}`
                            : "Post on X"}
                        </span>
                        <span>·</span>
                        <span>{selected.age} ago</span>
                      </div>
                      <h2>{selected.title}</h2>
                      <div className="author-line">
                        <span className="author-avatar">
                          {selected.author[0].toUpperCase()}
                        </span>
                        <span>
                          {selected.source === "Reddit" ? "u/" : "@"}
                          {selected.author}
                        </span>
                        <span className="intent-label">
                          Looking for a solution
                        </span>
                      </div>
                    </div>
                    <div className="detail-scroll">
                      <div className="match-verdict">
                        <div>
                          <Target size={17} />
                          <h3>Why this is a match</h3>
                          <strong>
                            {selected.score}
                            <span> / 100</span>
                          </strong>
                        </div>
                        <p>{selected.fit}</p>
                        <div className="verdict-tags">
                          <span>
                            <Check size={12} /> Product fit
                          </span>
                          <span>
                            <Check size={12} /> Explicit need
                          </span>
                          <span>
                            <Check size={12} /> Open request
                          </span>
                        </div>
                      </div>
                      <div className="original-conversation">
                        <div className="conversation-label">
                          <MessageSquare size={15} />
                          <h3>The conversation</h3>
                          <span>Example</span>
                        </div>
                        <p>{selected.body}</p>
                        <blockquote>
                          <mark>{selected.match}</mark>
                        </blockquote>
                        <p className="conversation-last">
                          I would love to hear what has worked for people with a
                          similar workflow.
                        </p>
                      </div>
                      <div className="context-grid">
                        <div>
                          <h3>Intent</h3>
                          <p>Asking what to use</p>
                        </div>
                        <div>
                          <h3>Community context</h3>
                          <p>
                            {selected.source === "Reddit"
                              ? "Check the community rules before replying."
                              : "Read the full conversation before responding."}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="detail-actions">
                      <button
                        className="button primary small"
                        onClick={() =>
                          changeStatus(
                            selected.status === "new" ? "replied" : "new",
                          )
                        }
                      >
                        {selected.status === "new" ? (
                          <Check size={15} />
                        ) : (
                          <Undo2 size={15} />
                        )}
                        {selected.status === "new"
                          ? "Mark replied"
                          : "Restore to new"}
                      </button>
                      <button
                        className="button subtle small"
                        onClick={() => changeStatus("hidden")}
                        disabled={selected.status === "hidden"}
                      >
                        <EyeOff size={15} /> Hide
                      </button>
                      <span>Read the context. Reply thoughtfully.</span>
                    </div>
                  </>
                ) : (
                  <div className="empty-detail">
                    <MessageSquare size={30} />
                    <h2>A conversation, with context.</h2>
                    <p>
                      Choose a lead to read the request and understand the
                      match.
                    </p>
                  </div>
                )}
              </section>
            </div>
          )}
          {undo && (
            <div className="undo-notice" role="status">
              <Check size={15} />
              <span>{undo.message}</span>
              <button
                onClick={() => {
                  setLeads((items) =>
                    items.map((lead) =>
                      lead.id === undo.id
                        ? { ...lead, status: undo.previous }
                        : lead,
                    ),
                  );
                  setUndo(null);
                }}
              >
                Undo
              </button>
              <button
                className="icon-button"
                aria-label="Dismiss notification"
                onClick={() => setUndo(null)}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function App() {
  const [page, setPage] = useState(
    location.hash === "#workspace" ? "workspace" : "home",
  );
  const [dark, setDark] = useState(false);
  const [viewState, setViewState] = useState("ready");
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => {
    const update = () => {
      if (location.hash === "#workspace") setPage("workspace");
      else if (location.hash === "#home") setPage("home");
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  function navigate(value: string) {
    setPage(value);
    location.hash = value;
    window.scrollTo({ top: 0 });
  }
  return (
    <>
      <div className="preview-toolbar">
        <div>
          <span className="preview-tag">
            <Code2 size={13} /> Design draft
          </span>
          <span className="preview-explanation">示例数据 · 不调用真实服务</span>
        </div>
        <div className="preview-options">
          {page === "workspace" && (
            <select
              aria-label="Preview state"
              value={viewState}
              onChange={(event) => setViewState(event.target.value)}
            >
              <option value="ready">正常状态</option>
              <option value="loading">加载状态</option>
              <option value="empty">空状态</option>
              <option value="error">错误状态</option>
            </select>
          )}
          <button
            className="icon-button"
            onClick={() => setDark(!dark)}
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
      {page === "home" ? (
        <Home openWorkspace={() => navigate("workspace")} />
      ) : (
        <Workspace viewState={viewState} setViewState={setViewState} />
      )}
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
