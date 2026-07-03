// PayoffLab — the pervasive circled-ⓘ affordance (§10). Clicking opens the
// Learn drawer at the given entry.

import { useLab } from "./context";
import { LEARN_BY_ID } from "@/lib/payofflab/learn";

export function InfoDot({ id, className }: { id: string; className?: string }) {
  const { openLearn } = useLab();
  const entry = LEARN_BY_ID[id];
  return (
    <button
      type="button"
      className={`pl-info ${className ?? ""}`}
      aria-label={entry ? `Explain: ${entry.title}` : "Explain"}
      title={entry ? entry.title : "Explain"}
      onClick={(e) => {
        e.stopPropagation();
        openLearn(id);
      }}
    >
      i
    </button>
  );
}
