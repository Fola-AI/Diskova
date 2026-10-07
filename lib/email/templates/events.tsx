import { Button, Text } from "@react-email/components";

import { SITE_URL } from "@/lib/config";
import { EmailLayout, button, p } from "@/lib/email/templates/layout";

export function AdminEventSubmittedEmail({ title }: { title: string }) {
  return (
    <EmailLayout preview={`New event to review: ${title}`}>
      <Text style={p}><strong>{title}</strong> was submitted and is waiting for review.</Text>
      <Button href={`${SITE_URL}/admin/events`} style={button}>Review events</Button>
    </EmailLayout>
  );
}

export function EventDecisionEmail({ title, slug, approved, reason }: { title: string; slug: string; approved: boolean; reason?: string | null }) {
  return (
    <EmailLayout preview={approved ? `${title} is live` : `About your event: ${title}`}>
      {approved ? (
        <>
          <Text style={p}><strong>{title}</strong> is now listed.</Text>
          <Button href={`${SITE_URL}/events/${slug}`} style={button}>See the event</Button>
        </>
      ) : (
        <>
          <Text style={p}>We couldn&apos;t list <strong>{title}</strong>.</Text>
          {reason ? <Text style={p}>Reason: {reason}</Text> : null}
        </>
      )}
    </EmailLayout>
  );
}
