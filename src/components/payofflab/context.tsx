// PayoffLab — shared state: lab reducer, Learn-drawer control, crosshair
// sync and the theme-aware watermark image.

import {
  createContext, useContext, useEffect, useMemo, useReducer, useRef, useState,
} from "react";
import type { ChartState, LabState, Leg, Level } from "@/lib/payofflab/types";
import { emptyChart, initialLabState } from "@/lib/payofflab/types";
import fullLogoColorAsset from "@/assets/full_logo_color.svg.asset.json";
import fullLogoWhiteAsset from "@/assets/full_logo_white.svg.asset.json";

export type LabAction =
  | { type: "load"; state: LabState }
  | { type: "level"; level: Level }
  | { type: "add-chart" }
  | { type: "remove-chart"; index: number }
  | { type: "set-active"; index: number }
  | { type: "focus"; focused: boolean }
  | { type: "sync-crosshair"; value: boolean }
  | { type: "update-chart"; index: number; patch: Partial<ChartState> }
  | { type: "set-legs"; index: number; legs: Leg[] }
  | { type: "replace-charts"; charts: ChartState[] };

function reducer(state: LabState, action: LabAction): LabState {
  switch (action.type) {
    case "load":
      return action.state;
    case "level":
      return { ...state, level: action.level };
    case "add-chart": {
      if (state.charts.length >= 4) return state;
      const charts = [...state.charts, emptyChart(`Chart ${state.charts.length + 1}`)];
      return { ...state, charts, activeChart: charts.length - 1 };
    }
    case "remove-chart": {
      if (state.charts.length <= 1) return state;
      const charts = state.charts.filter((_, i) => i !== action.index);
      return { ...state, charts, activeChart: Math.min(state.activeChart, charts.length - 1), focused: false };
    }
    case "set-active":
      return { ...state, activeChart: Math.max(0, Math.min(action.index, state.charts.length - 1)) };
    case "focus":
      return { ...state, focused: action.focused };
    case "sync-crosshair":
      return { ...state, syncCrosshair: action.value };
    case "update-chart": {
      const charts = state.charts.map((c, i) => (i === action.index ? { ...c, ...action.patch } : c));
      return { ...state, charts };
    }
    case "set-legs": {
      const charts = state.charts.map((c, i) => (i === action.index ? { ...c, legs: action.legs } : c));
      return { ...state, charts };
    }
    case "replace-charts":
      return { ...state, charts: action.charts.slice(0, 4), activeChart: 0, focused: false };
    default:
      return state;
  }
}

interface LearnState {
  open: boolean;
  entryId: string | null;
  tab: "entry" | "glossary";
}

/** Reachability of the pricing engine, shown as a live status pill. */
export type EngineStatus = "idle" | "live" | "computing" | "offline";

interface LabContextValue {
  state: LabState;
  dispatch: React.Dispatch<LabAction>;
  learn: LearnState;
  openLearn: (entryId: string) => void;
  openGlossary: () => void;
  closeLearn: () => void;
  /** Shared crosshair x when sync is enabled. */
  sharedX: number | null;
  setSharedX: (x: number | null) => void;
  watermark: HTMLImageElement | null;
  isDark: boolean;
  /** "home" shows the welcome screen; "bench" the working dashboard. */
  view: "home" | "bench";
  setView: (v: "home" | "bench") => void;
  engineStatus: EngineStatus;
  setEngineStatus: (s: EngineStatus) => void;
}

const LabContext = createContext<LabContextValue | null>(null);

export function useLab(): LabContextValue {
  const ctx = useContext(LabContext);
  if (!ctx) throw new Error("useLab outside LabProvider");
  return ctx;
}

export function LabProvider({ children, initial }: { children: React.ReactNode; initial?: LabState }) {
  const [state, dispatch] = useReducer(reducer, initial ?? initialLabState());
  const [learn, setLearn] = useState<LearnState>({ open: false, entryId: null, tab: "entry" });
  const [sharedX, setSharedX] = useState<number | null>(null);
  const [view, setView] = useState<"home" | "bench">(() =>
    (initial?.charts ?? []).some((c) => c.legs.length > 0) ? "bench" : "home",
  );
  const [engineStatus, setEngineStatus] = useState<EngineStatus>("idle");
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [watermark, setWatermark] = useState<HTMLImageElement | null>(null);
  const imagesRef = useRef<{ light: HTMLImageElement; dark: HTMLImageElement } | null>(null);

  // Theme tracking (the watermark lockup swaps colour/white with the theme).
  useEffect(() => {
    const obs = new MutationObserver(() => setIsDark(document.documentElement.classList.contains("dark")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    // Full Minerva lockup (§1a): colour on light, white on dark.
    const light = new Image();
    light.src = fullLogoColorAsset.url;
    const dark = new Image();
    dark.src = fullLogoWhiteAsset.url;
    imagesRef.current = { light, dark };
    const pick = () => setWatermark(document.documentElement.classList.contains("dark") ? dark : light);
    light.onload = pick;
    dark.onload = pick;
    pick();
  }, []);

  useEffect(() => {
    if (imagesRef.current) setWatermark(isDark ? imagesRef.current.dark : imagesRef.current.light);
  }, [isDark]);

  const value = useMemo<LabContextValue>(() => ({
    state,
    dispatch,
    learn,
    openLearn: (entryId) => setLearn({ open: true, entryId, tab: "entry" }),
    openGlossary: () => setLearn((l) => ({ ...l, open: true, tab: "glossary" })),
    closeLearn: () => setLearn((l) => ({ ...l, open: false })),
    sharedX,
    setSharedX,
    watermark,
    isDark,
    view,
    setView,
    engineStatus,
    setEngineStatus,
  }), [state, learn, sharedX, watermark, isDark, view, engineStatus]);

  return <LabContext.Provider value={value}>{children}</LabContext.Provider>;
}
