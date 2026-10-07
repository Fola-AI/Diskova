import { Button, Text } from "@react-email/components";

import { BRAND_NAME, SITE_URL } from "@/lib/config";
import { EmailLayout, button, p } from "@/lib/email/templates/layout";

/** Sent to the vendor when they submit their listing for review (§8.9, incl. free-listing notice). */
export function VendorSubmittedEmail({ vendorName, notice }: { vendorName: string; notice: string | null }) {
  return (
    <EmailLayout preview={`${vendorName} is in review`}>
      <Text style={p}>Thanks for listing <strong>{vendorName}</strong> on {BRAND_NAME}.</Text>
      <Text style={p}>
        Our team will review it shortly. Once it&apos;s approved it appears in the directory and you can post
        official crowd updates in two taps.
      </Text>
      {notice ? <Text style={{ ...p, backgroundColor: "#f0f7f2", borderRadius: 8, padding: 12 }}>{notice.replace(/\*\*/g, "")}</Text> : null}
      <Button href={`${SITE_URL}/vendor`} style={button}>Open your dashboard</Button>
    </EmailLayout>
  );
}

/** Admin notification for a new submission. */
export function AdminVendorSubmittedEmail({ vendorName, city }: { vendorName: string; city: string | null }) {
  return (
    <EmailLayout preview={`New vendor to review: ${vendorName}`}>
      <Text style={p}>
        <strong>{vendorName}</strong>{city ? ` (${city})` : ""} was submitted for review.
      </Text>
      <Button href={`${SITE_URL}/admin/vendors`} style={button}>Review vendors</Button>
    </EmailLayout>
  );
}

export function VendorDecisionEmail({
  vendorName,
  slug,
  approved,
  reason,
}: {
  vendorName: string;
  slug: string;
  approved: boolean;
  reason?: string | null;
}) {
  return (
    <EmailLayout preview={approved ? `${vendorName} is live` : `About your listing: ${vendorName}`}>
      {approved ? (
        <>
          <Text style={p}><strong>{vendorName}</strong> is now live on {BRAND_NAME}.</Text>
          <Text style={p}>
            Tip: post an official update when you open tonight. One tap on the crowd level makes your page look alive.
          </Text>
          <Button href={`${SITE_URL}/v/${slug}`} style={button}>See your page</Button>
        </>
      ) : (
        <>
          <Text style={p}>We couldn&apos;t publish <strong>{vendorName}</strong> yet.</Text>
          {reason ? <Text style={p}>Reason: {reason}</Text> : null}
          <Text style={p}>You can update your listing and submit it again from your dashboard.</Text>
          <Button href={`${SITE_URL}/vendor`} style={button}>Open your dashboard</Button>
        </>
      )}
    </EmailLayout>
  );
}

export function VerificationDecisionEmail({
  vendorName,
  approved,
  isClaim,
  reason,
}: {
  vendorName: string;
  approved: boolean;
  isClaim: boolean;
  reason?: string | null;
}) {
  const what = isClaim ? "claim" : "verification request";
  return (
    <EmailLayout preview={`Your ${what} for ${vendorName}`}>
      <Text style={p}>
        Your {what} for <strong>{vendorName}</strong> was {approved ? "approved" : "not approved"}.
      </Text>
      {!approved && reason ? <Text style={p}>Reason: {reason}</Text> : null}
      {approved ? (
        <Text style={p}>Your official updates now show the Verified badge.</Text>
      ) : null}
      <Text style={p}>Uploaded documents are deleted 30 days after this decision.</Text>
      <Button href={`${SITE_URL}/vendor`} style={button}>Open your dashboard</Button>
    </EmailLayout>
  );
}
