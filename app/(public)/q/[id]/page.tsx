import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { QaList } from "@/components/qa/qa-list";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { FEATURES, SITE_URL } from "@/lib/config";
import { getQuestion } from "@/lib/services/qa";

export const revalidate = 60;
export async function generateStaticParams() {
  return [];
}

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const q = await getQuestion((await params).id);
  if (!q) return { title: "Question not found" };
  return { title: q.title, description: q.answers[0]?.body.slice(0, 160) ?? q.body ?? undefined, alternates: { canonical: `/q/${q.id}` }, robots: q.answers.length ? undefined : { index: false } };
}

/** A single question (shareable), with schema.org QAPage. */
export default async function QuestionPage({ params }: { params: Params }) {
  if (!FEATURES.qa) notFound();
  const q = await getQuestion((await params).id);
  if (!q) notFound();
  const accepted = q.answers.find((a) => a.id === q.accepted_answer_id);
  const answer = (a: (typeof q.answers)[number]) => ({ "@type": "Answer", text: a.body, dateCreated: a.created_at, upvoteCount: a.vote_count, url: `${SITE_URL}/q/${q.id}#${a.id}`, author: { "@type": "Person", name: a.author?.username ?? "community member" } });
  return (
    <div className="container max-w-2xl space-y-4 px-4 py-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "QAPage",
          mainEntity: {
            "@type": "Question", name: q.title, text: q.body ?? q.title, answerCount: q.answers.length, dateCreated: q.created_at,
            author: { "@type": "Person", name: q.author?.username ?? "community member" },
            ...(accepted ? { acceptedAnswer: answer(accepted) } : {}),
            suggestedAnswer: q.answers.filter((a) => a.id !== q.accepted_answer_id).map(answer),
          },
        }}
      />
      <Breadcrumbs
        items={
          q.vendor
            ? [{ href: `/v/${q.vendor.slug}#questions`, label: q.vendor.name }, { label: "Question" }]
            : q.city
              ? [{ href: `/c/${q.city.slug}`, label: q.city.name }, { href: `/c/${q.city.slug}/questions`, label: "Questions" }, { label: "Question" }]
              : [{ label: "Question" }]
        }
      />
      <QaList questions={[q]} scope={q.vendor_id ? { vendorId: q.vendor_id } : { cityId: q.city_id }} path={`/q/${q.id}`} askLabel="Ask another question" linkTitles={false} titleAs="h1" />
    </div>
  );
}
