import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminHome() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Vendors</CardTitle>
          <CardDescription>Approve new listings, verification and claim requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/admin/vendors" className="text-sm underline underline-offset-4">Open vendor queue</Link>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Moderation</CardTitle>
          <CardDescription>Holds, flagged posts, reports and vendor disputes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/admin/moderation" className="text-sm underline underline-offset-4">Open moderation queue</Link>
        </CardContent>
      </Card>
    </div>
  );
}
