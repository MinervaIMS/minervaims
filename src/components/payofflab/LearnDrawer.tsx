// PayoffLab — the right-hand Learn drawer (§10): intuition → formulas →
// assumptions → expandable mathematical appendix, plus a searchable glossary.

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { GLOSSARY, LEARN_BY_ID } from "@/lib/payofflab/learn";
import { useLab } from "./context";
import { KatexBlock } from "./KatexBlock";

export function LearnDrawer() {
  const { learn, closeLearn, openLearn } = useLab();
  const [appendixOpen, setAppendixOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"entry" | "glossary">("entry");

  const effTab = learn.tab === "glossary" && tab === "entry" && !learn.entryId ? "glossary" : tab;
  const entry = learn.entryId ? LEARN_BY_ID[learn.entryId] : null;

  const glossary = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GLOSSARY;
    return GLOSSARY.filter((g) => g.term.toLowerCase().includes(q) || g.definition.toLowerCase().includes(q));
  }, [query]);

  if (!learn.open) return null;

  return (
    <aside
      className="flex w-[440px] flex-none flex-col border-l border-accent bg-background 2xl:w-[500px]"
      aria-label="Learn"
    >
      <div className="flex items-center justify-between bg-accent px-5 py-4 text-accent-foreground">
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] opacity-75">Learn</div>
          <div className="font-serif text-xl tracking-tight">
            {effTab === "glossary" ? "Glossary" : entry ? entry.title : "PayoffLab"}
          </div>
        </div>
        <button
          type="button"
          onClick={closeLearn}
          aria-label="Close Learn drawer"
          className="p-1 opacity-75 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-foreground"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex border-b border-separator text-xs">
        <button
          type="button"
          data-active={effTab === "entry"}
          onClick={() => setTab("entry")}
          className="flex-1 py-2.5 text-muted-foreground data-[active=true]:border-b-2 data-[active=true]:border-accent data-[active=true]:font-semibold data-[active=true]:text-accent"
        >
          Explanation
        </button>
        <button
          type="button"
          data-active={effTab === "glossary"}
          onClick={() => setTab("glossary")}
          className="flex-1 py-2.5 text-muted-foreground data-[active=true]:border-b-2 data-[active=true]:border-accent data-[active=true]:font-semibold data-[active=true]:text-accent"
        >
          Glossary
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {effTab === "glossary" ? (
          <div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search terms…"
              aria-label="Search glossary"
              className="mb-4 w-full border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <dl>
              {glossary.map((g) => (
                <div key={g.term} className="border-b border-separator py-2.5">
                  <dt className="font-serif text-[15px] text-foreground">{g.term}</dt>
                  <dd className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                    {g.definition}
                    {g.learnId && LEARN_BY_ID[g.learnId] && (
                      <button
                        type="button"
                        className="ml-1.5 text-accent underline underline-offset-2"
                        onClick={() => {
                          openLearn(g.learnId as string);
                          setTab("entry");
                        }}
                      >
                        Learn more
                      </button>
                    )}
                  </dd>
                </div>
              ))}
              {glossary.length === 0 && <div className="text-sm text-muted-foreground">No matches.</div>}
            </dl>
          </div>
        ) : entry ? (
          <div>
            <div className="pl-eye mb-2 text-accent">{entry.eyebrow} · Intuition</div>
            <p className="mb-5 text-sm leading-relaxed text-foreground">{entry.intuition}</p>
            {entry.formulas && entry.formulas.length > 0 && (
              <>
                <div className="pl-eye mb-3 border-t border-separator pt-4 text-accent">Formulae</div>
                {entry.formulas.map((f, i) => (
                  <KatexBlock key={i} tex={f.tex} caption={f.caption} />
                ))}
              </>
            )}
            {entry.assumptions && entry.assumptions.length > 0 && (
              <>
                <div className="pl-eye mb-2 mt-4 border-t border-separator pt-4 text-accent">Assumptions & conventions</div>
                <ul className="mb-4 list-disc pl-5 text-[13px] leading-relaxed text-muted-foreground">
                  {entry.assumptions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </>
            )}
            {entry.appendix && (
              <div className="mt-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-between border border-border px-3.5 py-2.5 text-left"
                  aria-expanded={appendixOpen}
                  onClick={() => setAppendixOpen((v) => !v)}
                >
                  <span className="font-serif text-[15px] text-accent">Mathematical appendix — {entry.appendix.title}</span>
                  <span className="text-accent">{appendixOpen ? "▴" : "▾"}</span>
                </button>
                {appendixOpen && (
                  <div className="border border-t-0 border-border px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
                    <p>{entry.appendix.body}</p>
                    {entry.appendix.tex?.map((t, i) => (
                      <KatexBlock key={i} tex={t} />
                    ))}
                  </div>
                )}
              </div>
            )}
            {entry.related && entry.related.length > 0 && (
              <div className="mt-5 border-t border-separator pt-4">
                <div className="pl-eye mb-2">Related</div>
                <div className="flex flex-wrap gap-2">
                  {entry.related.filter((r) => LEARN_BY_ID[r]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className="border border-border px-2.5 py-1 text-xs text-accent hover:border-accent"
                      onClick={() => {
                        setAppendixOpen(false);
                        openLearn(r);
                      }}
                    >
                      {LEARN_BY_ID[r].title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click any ⓘ in the tool to read the explanation here — intuition first, then the formulas, the assumptions,
            and, where it earns its keep, the full derivation.
          </p>
        )}
      </div>
    </aside>
  );
}
