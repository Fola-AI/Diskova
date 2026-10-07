import { jsonLdScript } from "@/lib/content/jsonld";

/** Server-rendered JSON-LD block (escaped against `</script>` injection). */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }} />;
}
