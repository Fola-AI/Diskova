import type { Metadata } from "next";

import { ProsePage } from "@/components/content/prose-page";
import { BRAND_NAME, CONTACT_EMAIL } from "@/lib/config";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

// Template written to Nigeria Data Protection Act 2023 (NDPA) / UK GDPR-friendly defaults.
// It describes what the code actually does; have it reviewed by a lawyer before launch (LAUNCH.md).
export default function PrivacyPage() {
  return (
    <ProsePage title="Privacy Policy" updated="October 2026">
      <p>
        This policy explains what {BRAND_NAME} collects, why, who processes it for us, how long we keep it, and the
        choices you have. We follow the Nigeria Data Protection Act 2023 and apply UK GDPR-style safeguards for
        visitors from abroad. {BRAND_NAME} is the data controller.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> email address, username, and anything you add to your profile (display name, home city, bio, photo).</li>
        <li><strong>What you post:</strong> check-ins, crowd levels, photos and notes. Photo metadata (including GPS/EXIF) is removed on upload.</li>
        <li><strong>Location, only if you turn it on:</strong> used once per post to mark it &quot;at venue&quot;. Your exact location is never shown publicly.</li>
        <li><strong>Safety reports:</strong> what you write, and an approximate location if you choose to attach it. Reports are private to our admin team.</li>
        <li><strong>Vendor verification:</strong> business and ID documents you upload to claim or verify a venue.</li>
        <li><strong>Security data:</strong> IP address, browser/device information and sign-in events, used to protect accounts and stop abuse.</li>
      </ul>

      <h2>Why we use it (legal bases)</h2>
      <ul>
        <li><strong>To provide the service</strong> you sign up for (contract): your account, posts, venue pages and settings.</li>
        <li><strong>Legitimate interests</strong>: keeping the community safe — moderation, spam and fraud prevention, security logs.</li>
        <li><strong>Consent</strong>: location on posts, and analytics cookies. You can withdraw consent at any time.</li>
        <li><strong>Legal obligations</strong>: responding to lawful requests.</li>
      </ul>
      <p>We do not sell your personal data, and we do not use it for advertising.</p>

      <h2 id="cookies">Cookies</h2>
      <ul>
        <li><strong>Essential:</strong> sign-in session cookies (needed to keep you logged in) and your cookie choice. These are always on.</li>
        <li><strong>Analytics (optional):</strong> anonymous page-view and page-speed measurement, loaded only if you choose &quot;Allow analytics&quot;. No ads, no cross-site tracking. Change your choice any time with &quot;Cookie settings&quot; in the footer.</li>
      </ul>

      <h2>Who processes data for us</h2>
      <p>We use these service providers, under contracts that require them to protect your data:</p>
      <ul>
        <li>Supabase (database, sign-in and file storage — hosted in London, UK)</li>
        <li>Vercel (website hosting — UK/EU region)</li>
        <li>Sentry (error monitoring — EU; emails, IP addresses and tokens are stripped before sending)</li>
        <li>Upstash (rate limiting — stores short-lived counters, not your content)</li>
        <li>OpenAI (automated content moderation of posts and photos; not used to train their models via the API)</li>
        <li>Mapbox (maps), Resend (emails)</li>
      </ul>
      <p>Some providers process data outside Nigeria. Where they do, we rely on contractual safeguards as the NDPA and UK GDPR require.</p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Accounts: until you delete your account. On deletion your profile is anonymised immediately; photos and avatars are removed within 24 hours.</li>
        <li>Unfinished uploads: deleted after 24 hours.</li>
        <li>Vendor verification documents: deleted 30 days after a decision.</li>
        <li>Crowd statistics: kept 70 days in aggregate form.</li>
        <li>Activity and security logs: up to 13 months. Our audit log of staff actions is kept for accountability.</li>
        <li>Backups: rolling, kept for up to 8 weeks.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You can access, correct, export or delete your data, object to or restrict some processing, and withdraw
        consent. Most of this is self-serve in Settings (edit profile, location setting, delete account). For anything
        else, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>; we reply within 30 days. You can also
        complain to the Nigeria Data Protection Commission (NDPC) or, in the UK, the Information Commissioner&apos;s
        Office (ICO).
      </p>

      <h2>Children</h2>
      <p>{BRAND_NAME} is for people aged 18 and over. We don&apos;t knowingly collect data from children.</p>

      <h2>Changes</h2>
      <p>We&apos;ll update the date above when this policy changes, and tell signed-in users about significant changes.</p>
    </ProsePage>
  );
}
