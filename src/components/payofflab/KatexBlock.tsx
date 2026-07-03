// PayoffLab — KaTeX formula rendering for the Learn drawer.

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

export function KatexBlock({ tex, caption }: { tex: string; caption?: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, { displayMode: true, throwOnError: false, strict: false });
    } catch {
      return tex;
    }
  }, [tex]);
  return (
    <div className="pl-formula">
      {/* KaTeX output rendered from our own static content */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {caption && <div className="pl-formula-caption">{caption}</div>}
    </div>
  );
}

export function KatexInline({ tex }: { tex: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, { displayMode: false, throwOnError: false, strict: false });
    } catch {
      return tex;
    }
  }, [tex]);
  // KaTeX output rendered from our own static content.
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
