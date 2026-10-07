import { Button, Section, Text } from "@react-email/components";

import { SITE_URL } from "@/lib/config";
import { EmailLayout, button, p } from "@/lib/email/templates/layout";

/** Platform data export ready (§11.14). The link is signed and expires. */
export function ExportReadyEmail({ url, expiresHours }: { url: string; expiresHours: number }) {
  return (
    <EmailLayout preview="Your data export is ready">
      <Text style={p}>The platform data export you requested is ready.</Text>
      <Button href={url} style={button}>Download export</Button>
      <Text style={p}>This link expires in {expiresHours} hours. It contains no passwords, emails or IP addresses.</Text>
    </EmailLayout>
  );
}

export interface DigestData {
  date: string;
  signups: number;
  vendorSignups: number;
  pendingVendors: number;
  posts: number;
  officialUpdates: number;
  checkins: number;
  openModeration: number;
  openP1: number;
  openReports: number;
  openIssues: number;
  pendingEvents: number;
  overdueTasks: number;
}

const row = { margin: "0 0 4px", fontSize: "14px" } as const;

/** §11.15 daily digest, 08:00 WAT. Counts only — no user content in email. */
export function DailyDigestEmail({ d }: { d: DigestData }) {
  const lines: Array<[string, number]> = [
    ["New users (24h)", d.signups],
    ["New vendor listings (24h)", d.vendorSignups],
    ["Posts (24h)", d.posts],
    ["Official updates (24h)", d.officialUpdates],
    ["Check-ins (24h)", d.checkins],
    ["Vendors awaiting review", d.pendingVendors],
    ["Events awaiting review", d.pendingEvents],
    ["Open moderation items", d.openModeration],
    ["…of which P1", d.openP1],
    ["Open reports", d.openReports],
    ["Open issue reports", d.openIssues],
    ["Overdue tasks", d.overdueTasks],
  ];
  return (
    <EmailLayout preview={`Daily digest — ${d.date}`}>
      <Text style={p}><strong>Daily digest — {d.date}</strong></Text>
      <Section>
        {lines.map(([label, n]) => (
          <Text key={label} style={row}>{label}: <strong>{n}</strong></Text>
        ))}
      </Section>
      <Button href={`${SITE_URL}/admin`} style={button}>Open the dashboard</Button>
    </EmailLayout>
  );
}
