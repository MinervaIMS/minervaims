// PayoffLab — Export (§13): PNG of the active chart (watermark + copyright
// baked into the bitmap), CSV of the plotted series, and the encoded share
// URL (inputs only — never any pricing code).

import { useState } from "react";
import type { GridResult } from "@/lib/payofflab/types";
import { shareUrlFor } from "@/lib/payofflab/share";
import { useLab } from "./context";
import type { PlotSurfaceHandle } from "./PlotSurface";

export function ExportPanel({
  activeGrid, exportRef,
}: {
  activeGrid: GridResult | null;
  exportRef: React.RefObject<PlotSurfaceHandle | null>;
}) {
  const { state } = useLab();
  const chart = state.charts[state.activeChart];
  const [copied, setCopied] = useState(false);
  const disabled = chart.legs.length === 0 || !activeGrid;

  const download = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const exportPng = async () => {
    const handle = exportRef.current;
    if (!handle) return;
    const blob = await handle.exportPng(`${chart.title} — Minerva PayoffLab`);
    if (blob) download(blob, `payofflab-${chart.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`);
  };

  const exportCsv = () => {
    if (!activeGrid) return;
    const cols: Array<[string, number[] | null]> = [
      [chart.xVar, activeGrid.x],
      ["value", activeGrid.value],
      ["payoff", activeGrid.payoff],
      ...Object.entries(activeGrid.greeks).map(([g, ys]) => [g, ys] as [string, number[]]),
    ];
    const present = cols.filter((c): c is [string, number[]] => Array.isArray(c[1]));
    const header = present.map((c) => c[0]).join(",");
    const lines = activeGrid.x.map((_, i) => present.map((c) => c[1][i]).join(","));
    const csv = ["# Minerva PayoffLab — educational use only", header, ...lines].join("\n");
    download(new Blob([csv], { type: "text/csv" }), `payofflab-${chart.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`);
  };

  const copyShare = async () => {
    const url = await shareUrlFor(state);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div>
      <div className="pl-eye mb-2">Export</div>
      <div className="flex gap-1.5 text-[11px]">
        <button type="button" className="flex-1 border border-border py-1.5 text-foreground hover:border-accent disabled:opacity-40" disabled={disabled} onClick={exportPng}>
          PNG
        </button>
        <button type="button" className="flex-1 border border-border py-1.5 text-foreground hover:border-accent disabled:opacity-40" disabled={disabled} onClick={exportCsv}>
          CSV
        </button>
        <button type="button" className="flex-1 border border-border py-1.5 text-foreground hover:border-accent" onClick={copyShare}>
          {copied ? "Copied ✓" : "Share link"}
        </button>
      </div>
      <div className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
        PNG carries the watermark and copyright; the share link encodes inputs only.
      </div>
    </div>
  );
}
