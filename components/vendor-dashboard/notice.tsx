import { Gift } from "lucide-react";

/** Free-listing notice from platform_settings.monetisation_notice_md (bold markers only). */
export function ListingNotice({ markdown }: { markdown: string | null }) {
  if (!markdown) return null;
  const parts = markdown.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="flex items-start gap-2 rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm">
      <Gift className="mt-0.5 h-4 w-4 shrink-0 text-positive" aria-hidden />
      <span>
        {parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>))}
      </span>
    </p>
  );
}
