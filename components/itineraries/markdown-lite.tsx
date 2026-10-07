/** Minimal inline formatting for short stop descriptions: paragraphs, **bold**, *italics*. Text is escaped by React. */
export function MarkdownLite({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="whitespace-pre-line">
          {para.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong>
            : part.startsWith("*") && part.endsWith("*") && part.length > 2 ? <em key={j}>{part.slice(1, -1)}</em>
            : part,
          )}
        </p>
      ))}
    </>
  );
}
