import type { Metadata } from "next";

import { ProsePage } from "@/components/content/prose-page";
import { BRAND_NAME, UNVERIFIED_LABEL } from "@/lib/config";

export const metadata: Metadata = { title: "Community Guidelines" };

export default function GuidelinesPage() {
  return (
    <ProsePage title="Community Guidelines" updated="October 2026">
      <p>
        {BRAND_NAME} works because people share what a place is really like, right now. Keep it honest, keep it kind,
        keep it about the venue.
      </p>
      <h2>Post what you see</h2>
      <ul>
        <li>Only check in to a venue you are at, or have just left.</li>
        <li>Crowd level and vibe should reflect what you saw — not what you wish, and not to help or hurt a business.</li>
        <li>Photos must be your own and taken at that venue.</li>
      </ul>
      <h2>Not allowed</h2>
      <ul>
        <li>Hate, harassment, threats or sexual content.</li>
        <li>Photos of people who clearly don&apos;t want to be photographed, or of children.</li>
        <li>Personal information about anyone (phone numbers, addresses, car plates).</li>
        <li>Fake posts, spam, advertising, or posts by a rival to damage a venue.</li>
        <li>Anything illegal, dangerous, or that encourages harm.</li>
      </ul>
      <h2>How moderation works</h2>
      <p>
        Posts are checked automatically. Some photos — for example from new accounts — are reviewed by a person before
        they appear, usually within an hour. Anyone can report a post; reports are private. Venue staff can tell us if a
        post isn&apos;t from their venue.
      </p>
      <p>
        Community posts carry the label &ldquo;{UNVERIFIED_LABEL}&rdquo;. Updates marked <strong>Official</strong> come
        from the venue itself.
      </p>
      <h2>What happens if you break the rules</h2>
      <p>
        We remove the post and may warn you, pause your posting, or close your account. Repeated problems lower how much
        we trust your future posts.
      </p>
      <h2>Safety</h2>
      <p>
        {BRAND_NAME} is not an emergency service and cannot send help. If you are in danger, call 112.
      </p>
    </ProsePage>
  );
}
