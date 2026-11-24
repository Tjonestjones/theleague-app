// Minimal, safe Markdown for recap text: "## " headings, "- " lists,
// paragraphs, **bold** and *italic*. No HTML passthrough.

import { Fragment } from "react";

function inline(text: string, keyBase: string) {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    out.push(
      tok.startsWith("**") ? (
        <strong key={`${keyBase}-${i++}`} className="font-semibold text-white">{tok.slice(2, -2)}</strong>
      ) : (
        <em key={`${keyBase}-${i++}`}>{tok.slice(1, -1)}</em>
      ),
    );
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className={`space-y-3 text-[15px] leading-relaxed text-slate-300 ${className}`}>
      {blocks.map((b, bi) => {
        if (/^#{1,3} /.test(b)) {
          const [head, ...rest] = b.split("\n");
          return (
            <Fragment key={bi}>
              <h3 className="pt-2 text-base font-semibold text-white">{inline(head.replace(/^#{1,3} /, ""), `h${bi}`)}</h3>
              {rest.length > 0 && <p>{inline(rest.join(" "), `hp${bi}`)}</p>}
            </Fragment>
          );
        }
        const lines = b.split("\n");
        if (lines.every((l) => /^[-*] /.test(l))) {
          return (
            <ul key={bi} className="list-disc pl-5 space-y-1">
              {lines.map((l, li) => <li key={li}>{inline(l.slice(2), `l${bi}-${li}`)}</li>)}
            </ul>
          );
        }
        return <p key={bi}>{inline(lines.join(" "), `p${bi}`)}</p>;
      })}
    </div>
  );
}
