import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { QaList } from "@/components/qa/qa-list";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { BRAND_NAME, FEATURES } from "@/lib/config";
import { getCityBySlug } from "@/lib/db/directory";
import { listQuestions } from "@/lib/services/qa";

export const revalidate = 60;
export async function generateStaticParams() {
  return [];
}

type Params = Promise<{ city: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const city = await getCityBySlug((await params).city);
  if (!city) return {};
  const title = `${city.name} questions & answers`;
  return { title, description: `Ask locals and venues about ${city.name}: getting around, dress codes, prices and more — on ${BRAND_NAME}.`, alternates: { canonical: `/c/${city.slug}/questions` } };
}

/** P3 city Q&A: pinned seeds first, then the newest questions (city-wide and about venues). */
export default async function CityQuestionsPage({ params }: { params: Params }) {
  if (!FEATURES.qa) notFound();
  const city = await getCityBySlug((await params).city);
  if (!city) notFound();
  const questions = await listQuestions({ cityId: city.id }, 30);
  return (
    <div className="container max-w-2xl space-y-5 px-4 py-6">
      <div className="space-y-1.5">
        <Breadcrumbs items={[{ href: `/c/${city.slug}`, label: city.name }, { label: "Questions" }]} />
        <h1 className="text-display font-semibold">{city.name}: questions &amp; answers</h1>
        <p className="text-sm text-muted-foreground">Ask the community and venues. Answers are from community members unless marked Official or Venue.</p>
      </div>
      <QaList questions={questions} scope={{ cityId: city.id }} path={`/c/${city.slug}/questions`} askLabel={`Ask about ${city.name}`} />
    </div>
  );
}
