import type { Metadata } from "next";

import { ProsePage } from "@/components/content/prose-page";
import { BRAND_NAME, COMMUNITY_DISCLAIMER } from "@/lib/config";

export const metadata: Metadata = { title: "Terms" };

// Template — final wording is reviewed in Stage L13 before launch.
export default function TermsPage() {
  return (
    <ProsePage title="Terms of Use" updated="October 2026">
      <p>
        {BRAND_NAME} helps you see what&apos;s happening at venues across Nigeria. By using it you agree to these terms.
      </p>
      <h2>Community posts</h2>
      <p>{COMMUNITY_DISCLAIMER}</p>
      <p>
        Post only what you saw yourself, at the venue you tag. Don&apos;t post anything illegal, hateful, sexual, or
        about other people without their consent. We may remove posts and restrict accounts that break these rules.
      </p>
      <h2>No bookings or payments</h2>
      <p>
        {BRAND_NAME} does not take bookings or payments. Links to venues&apos; own websites leave {BRAND_NAME}, and
        any arrangement you make there is between you and the venue.
      </p>
      <h2>Vendors</h2>
      <p>Listing is free. Vendors are responsible for the accuracy of their prices, hours and official updates.</p>
      <h2>Safety</h2>
      <p>
        {BRAND_NAME} is not an emergency service. If you are in danger, call 112.
      </p>
    </ProsePage>
  );
}
