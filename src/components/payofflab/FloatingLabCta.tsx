// PayoffLab — floating round CTA (§15). BUILT BUT NOT MOUNTED anywhere yet:
// the tool is reachable only via its /lab route for now. To activate later,
// render <FloatingLabCta /> inside src/components/layout/Layout.tsx just
// before the closing </div> (it positions itself fixed bottom-right and
// stays out of the document flow).

import { Link } from "react-router-dom";
import ctaRoundLyonAsset from "@/assets/CTA_round_lyon.png.asset.json";

export function FloatingLabCta() {
  return (
    <Link
      to="/lab"
      aria-label="Open Minerva PayoffLab, the derivatives payoff and pricing laboratory"
      title="Minerva PayoffLab"
      className="fixed bottom-6 right-6 z-50 block h-16 w-16 overflow-hidden rounded-full shadow-elevated transition-transform duration-200 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
    >
      <img src={ctaRoundLyonAsset.url} alt="" className="h-full w-full object-cover" />
    </Link>
  );
}
