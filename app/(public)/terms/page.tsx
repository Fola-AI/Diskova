import type { Metadata } from "next";
import Link from "next/link";

import { ProsePage } from "@/components/content/prose-page";
import { BRAND_NAME, COMMUNITY_DISCLAIMER, CONTACT_EMAIL } from "@/lib/config";

export const metadata: Metadata = { title: "Terms", alternates: { canonical: "/terms" } };

// Template — have it reviewed by a lawyer before launch (LAUNCH.md).
export default function TermsPage() {
  return (
    <ProsePage title="Terms of Use" updated="October 2026">
      <p>
        {BRAND_NAME} helps you see what&apos;s happening at venues across Nigeria. By using it you agree to these
        terms and to our <Link href="/guidelines">Community Guidelines</Link> and <Link href="/privacy">Privacy Policy</Link>.
        You must be 18 or over to create an account.
      </p>

      <h2>Community posts</h2>
      <p>{COMMUNITY_DISCLAIMER}</p>
      <p>
        Post only what you saw yourself, at the venue you tag. Don&apos;t post anything illegal, hateful, sexual, or
        about other people without their consent. We may hold, hide or remove posts, and warn, suspend or ban
        accounts that break these rules. You can report any post.
      </p>
      <p>
        You keep ownership of what you post. You give {BRAND_NAME} a non-exclusive licence to show it on the service
        and in links shared from it. Deleting a post or your account ends that licence for new uses.
      </p>

      <h2>Information is a guide, not a guarantee</h2>
      <p>
        Crowd levels, prices, opening hours and event details come from the community and from venues. They can be
        wrong or out of date. Check with the venue before you travel.
      </p>

      <h2>No bookings or payments</h2>
      <p>
        {BRAND_NAME} does not take bookings or payments. Links to venues&apos; own websites leave {BRAND_NAME}, and
        any arrangement you make there is between you and the venue.
      </p>

      <h2>Vendors</h2>
      <p>
        Listing is free. Vendors are responsible for the accuracy of their prices, hours and official updates, and
        must only claim venues they are authorised to represent. Verification documents are used only to check that
        claim.
      </p>

      <h2>Safety</h2>
      <p>
        {BRAND_NAME} is not an emergency service. If you are in danger, call 112. Safety reports you send us are
        private and reviewed by our team.
      </p>

      <h2>Accounts</h2>
      <p>
        Keep your login secure. You can delete your account at any time in Settings. We may suspend accounts used for
        spam, fake posts or abuse.
      </p>

      <h2>Contact</h2>
      <p>Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </ProsePage>
  );
}
