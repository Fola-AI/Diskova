import type { Metadata } from "next";

import { ProsePage } from "@/components/content/prose-page";
import { BRAND_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "Privacy Policy" };

// Template written to Nigeria Data Protection Act 2023 / UK GDPR-friendly defaults.
// Final wording is reviewed in Stage L13 before launch.
export default function PrivacyPage() {
  return (
    <ProsePage title="Privacy Policy" updated="October 2026">
      <p>
        This policy explains what {BRAND_NAME} collects, why, and the choices you have. We follow the Nigeria Data
        Protection Act 2023 and apply UK GDPR-style safeguards for visitors from abroad.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: email address, username, and anything you add to your profile.</li>
        <li>What you post: check-ins, crowd levels, photos and notes. Photo location data (EXIF) is removed on upload.</li>
        <li>Location, only if you turn it on: used to mark a check-in as &quot;at venue&quot;. It is never shown publicly.</li>
        <li>Technical data: IP address and device information, used for security and abuse prevention.</li>
      </ul>
      <h2>How we use it</h2>
      <p>
        To run the service, show live venue activity, keep the community safe, and prevent spam. We do not sell your
        personal data.
      </p>
      <h2>Your choices</h2>
      <ul>
        <li>Edit your profile and location setting at any time in Settings.</li>
        <li>Delete your account in Settings: your profile is anonymised immediately and your photos are removed within 24 hours.</li>
        <li>Ask us for a copy of your data, or for corrections.</li>
      </ul>
      <h2>Retention</h2>
      <p>
        Vendor verification documents are deleted 30 days after a decision. Activity logs are kept for up to 13 months.
      </p>
    </ProsePage>
  );
}
