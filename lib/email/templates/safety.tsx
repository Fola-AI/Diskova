import { Button, Text } from "@react-email/components";

import { SITE_URL } from "@/lib/config";
import { EmailLayout, button, p } from "@/lib/email/templates/layout";

/** Admin alert for a new safety report. Details stay in the admin UI (no report content in email). */
export function SafetyIssueEmail({ category }: { category: string }) {
  return (
    <EmailLayout preview="New safety report">
      <Text style={p}>A new <strong>{category}</strong> report was submitted.</Text>
      <Button href={`${SITE_URL}/admin/issues`} style={button}>Open issue reports</Button>
    </EmailLayout>
  );
}
