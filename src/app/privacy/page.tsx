import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { PRODUCT_NAME, SUPPORT_URL } from "@/lib/brand";

export const metadata: Metadata = { title: `Privacy Policy | ${PRODUCT_NAME}` };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="October 18, 2026"
      intro={<>Hark is an independently maintained, open-source research project. This notice describes the personal test deployment. Self-hosted operators control their own infrastructure and data practices.</>}
      sections={[
        {
          title: "Account and workspace data",
          body: [
            "Clerk handles sign-in. Hark stores your account identifier, product profiles, research inputs, settings, lead decisions and notification destinations to provide your workspace. Provider credentials and webhook URLs must remain private.",
          ],
        },
        {
          title: "Public sources and AI",
          body: [
            "Enabled searches retrieve public Reddit, X and web content through AnyAPI. Product descriptions, selected source text and research instructions are sent to configured model providers through OpenRouter for analysis. Source availability and provider data policies vary. Original quotes and source links let you check generated conclusions.",
          ],
        },
        {
          title: "Infrastructure and notifications",
          body: [
            "The personal test deployment uses Netlify and Neon; a self-hosted instance uses its operator's chosen services. Email goes through the configured SMTP or Azure carrier. Slack, Discord and generic webhooks receive content only when those channels are configured and a send is initiated or scheduled.",
          ],
        },
        {
          title: "Retention and controls",
          body: [
            "Stored evidence is subject to the application's retention rules. Raw research content can expire while cost records remain. Account, project and channel controls are available in settings. Removing a local record cannot retract content already delivered to a recipient or erase a provider's separate records.",
          ],
        },
        {
          title: "Cookies and analytics",
          body: [
            "Clerk uses authentication cookies. Browser storage also keeps interface preferences and temporary notices. Hark does not initialize a product-analytics or session-replay service.",
          ],
        },
        {
          title: "Contact",
          body: [
            <>For project support, use <a href={SUPPORT_URL}>GitHub Issues</a>. Keep passwords, API keys, private webhook URLs and personal account data out of public issues.</>,
          ],
        },
      ]}
    />
  );
}
