import { Button, Text } from "@react-email/components";

import { BRAND_NAME, SITE_URL } from "@/lib/config";
import { EmailLayout, button, p } from "@/lib/email/templates/layout";

/** §8.5 step 8: removal notice. Neutral wording; links to the guidelines. */
export function PostRemovedEmail({ vendorName, reason, sanction }: { vendorName: string | null; reason: string; sanction: string | null }) {
  return (
    <EmailLayout preview="A post of yours was removed">
      <Text style={p}>
        We removed your post{vendorName ? ` at ${vendorName}` : ""} because it didn&apos;t meet the {BRAND_NAME} Community Guidelines.
      </Text>
      <Text style={p}>Reason: {reason}</Text>
      {sanction ? <Text style={p}>{sanction}</Text> : null}
      <Text style={p}>If you think we got this wrong, reply to this email.</Text>
      <Button href={`${SITE_URL}/guidelines`} style={button}>Read the guidelines</Button>
    </EmailLayout>
  );
}
