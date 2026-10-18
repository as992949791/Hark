import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { PRODUCT_NAME, SUPPORT_URL } from "@/lib/brand";

export const metadata: Metadata = { title: `Terms of Service | ${PRODUCT_NAME}` };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="October 18, 2026"
      intro={<>Hark is an independently maintained project for researching public demand signals. The hosted test instance is experimental. The source code is distributed under the MIT license.</>}
      sections={[
        {
          title: "Your account",
          body: [
            "Use an account and notification destinations you control. Keep your credentials secure and respect the instance's ownership boundaries and access limits.",
          ],
        },
        {
          title: "Acceptable use",
          body: [
            "Follow source-platform and community rules. Do not use Hark to spam, harass, deceive, bypass access controls or overload another service. Hark does not automatically contact prospects; you are responsible for any follow-up you choose to make.",
          ],
        },
        {
          title: "Provider costs",
          body: [
            "Data and model requests can incur usage charges on configured provider accounts. Open-source code and free hosting allowances do not make those calls free. Configure budgets before enabling searches or scheduled tasks. Wallet integration exists in the source but has not completed Hark's live acceptance.",
          ],
        },
        {
          title: "Generated research",
          body: [
            "Candidates, scores and themes can be incomplete or wrong. Check the original evidence before making decisions. A score is not a purchase probability, and repeated discussion does not establish market size or commercial demand.",
          ],
        },
        {
          title: "Availability and license",
          body: [
            "The experimental service may change or be unavailable. Software is provided as is under the warranty and liability terms in LICENSE. Third-party services have their own terms.",
          ],
        },
        {
          title: "Project support",
          body: [
            <>Report reproducible project issues at <a href={SUPPORT_URL}>GitHub Issues</a>, without including secrets or private account data.</>,
          ],
        },
      ]}
    />
  );
}
