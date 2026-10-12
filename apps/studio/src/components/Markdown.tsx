import DOMPurify from "dompurify";
import { marked } from "marked";
import { useMemo } from "react";

/** Renders case-file markdown. Output is sanitised: case files contain user-submitted text. */
export function Markdown({ source }: { source: string }) {
  const html = useMemo(() => {
    const body = source.replace(/^---\n[\s\S]*?\n---\n?/, "");
    const raw = marked.parse(body, { async: false, gfm: true });
    return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
  }, [source]);
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}
