import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminHome() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Back office</CardTitle>
        <CardDescription>
          Moderation, vendors, content and settings arrive in later stages (L5, L8, L10, L12).
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">You are signed in with MFA.</CardContent>
    </Card>
  );
}
