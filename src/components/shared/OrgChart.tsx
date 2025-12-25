import React, { useRef, useLayoutEffect, useState, useCallback } from "react";

// Node IDs for ref mapping
const NODE_IDS = {
  president: "president",
  vp: "vp",
  hoa: "hoa",
  ops: "ops",
  dh_pm: "dh_pm",
  dh_macro: "dh_macro",
  dh_inv: "dh_inv",
  dh_eq: "dh_eq",
  dh_quant: "dh_quant",
  pm_ma: "pm_ma",
  pm_ls: "pm_ls",
  sa_pm_ma: "sa_pm_ma",
  a_pm_ma: "a_pm_ma",
  sa_pm_ls: "sa_pm_ls",
  a_pm_ls: "a_pm_ls",
  sa_macro: "sa_macro",
  a_macro: "a_macro",
  sa_inv: "sa_inv",
  a_inv: "a_inv",
  sa_eq: "sa_eq",
  a_eq: "a_eq",
  sa_quant: "sa_quant",
  a_quant: "a_quant",
} as const;

type NodeId = (typeof NODE_IDS)[keyof typeof NODE_IDS];

interface PathData {
  d: string;
  dashed?: boolean;
}

interface RoleCardProps {
  id: NodeId;
  title: string;
  description?: string;
  isRoot?: boolean;
  nodeRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}

const RoleCard = ({ id, title, description, isRoot = false, nodeRefs }: RoleCardProps) => (
  <div
    ref={(el) => {
      nodeRefs.current[id] = el;
    }}
    className="flex flex-col items-center"
  >
    <div
      className={`px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm font-body text-center border ${
        isRoot
          ? "bg-foreground text-background border-foreground font-medium"
          : "bg-muted text-foreground border-border"
      } min-w-[120px] md:min-w-[160px] max-w-[160px] md:max-w-[180px]`}
    >
      {title}
    </div>
    {description && (
      <p className="text-sm text-muted-foreground mt-3 max-w-[200px] md:max-w-[220px] text-center font-body leading-relaxed">
        {description}
      </p>
    )}
  </div>
);

// Anchors
function anchorTopCenter(rect: DOMRect) {
  return { x: rect.left + rect.width / 2, y: rect.top };
}
function anchorBottomCenter(rect: DOMRect) {
  return { x: rect.left + rect.width / 2, y: rect.bottom };
}
function anchorLeftCenter(rect: DOMRect) {
  return { x: rect.left, y: rect.top + rect.height / 2 };
}
function anchorRightCenter(rect: DOMRect) {
  return { x: rect.right, y: rect.top + rect.height / 2 };
}
function toLocal(pt: { x: number; y: number }, containerRect: DOMRect) {
  return { x: pt.x - containerRect.left, y: pt.y - containerRect.top };
}

export const OrgChart = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const divisionsScrollRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [paths, setPaths] = useState<PathData[]>([]);
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });

  const computeConnectors = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();

    // Make SVG large enough even if inner content overflows horizontally/vertically
    const width = Math.max(container.clientWidth, container.scrollWidth);
    const height = Math.max(container.clientHeight, container.scrollHeight);
    setSvgSize({ width, height });

    const getRect = (id: NodeId): DOMRect | null => {
      const el = nodeRefs.current[id];
      if (!el) return null;

      // Ensure we measure the actual card box (first direct child)
      const cardBox = el.querySelector(":scope > div") as HTMLElement | null;
      return (cardBox ?? el).getBoundingClientRect();
    };

    const newPaths: PathData[] = [];

    // Orthogonal connector: parent bottom-centre -> child top-centre
    const createVerticalConnector = (parentId: NodeId, childId: NodeId): void => {
      const parentRect = getRect(parentId);
      const childRect = getRect(childId);
      if (!parentRect || !childRect) return;

      const from = toLocal(anchorBottomCenter(parentRect), containerRect);
      const to = toLocal(anchorTopCenter(childRect), containerRect);

      // Clean orthogonal elbow (keeps shape stable even if X differs)
      const midY = from.y + (to.y - from.y) * 0.55;
      newPaths.push({
        d: `M ${from.x} ${from.y} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${to.y}`,
      });
    };

    // Bus connector (one parent -> multiple children)
    const createBusConnector = (parentId: NodeId, childIds: NodeId[]): void => {
      const parentRect = getRect(parentId);
      const childRects = childIds
        .map((id) => ({ id, rect: getRect(id) }))
        .filter((c): c is { id: NodeId; rect: DOMRect } => c.rect !== null);

      if (!parentRect || childRects.length === 0) return;

      const from = toLocal(anchorBottomCenter(parentRect), containerRect);
      const childTops = childRects.map((c) => toLocal(anchorTopCenter(c.rect), containerRect));

      const minChildY = Math.min(...childTops.map((p) => p.y));

      // Put the bus just above the children row (prevents "floating" buses)
      const desiredBusY = minChildY - 18;
      const busY = Math.max(from.y + 18, Math.min(desiredBusY, from.y + (minChildY - from.y) * 0.6));

      // Vertical from parent to bus
      newPaths.push({ d: `M ${from.x} ${from.y} L ${from.x} ${busY}` });

      // Horizontal bus
      const leftX = Math.min(...childTops.map((p) => p.x));
      const rightX = Math.max(...childTops.map((p) => p.x));
      newPaths.push({ d: `M ${leftX} ${busY} L ${rightX} ${busY}` });

      // Drops
      childTops.forEach((p) => newPaths.push({ d: `M ${p.x} ${busY} L ${p.x} ${p.y}` }));
    };

    // Dotted reporting: parent right-centre -> ops left-centre (keeps OPS clearly "aside")
    const createDashedReportingToOps = (parentId: NodeId): void => {
      const opsRect = getRect(NODE_IDS.ops);
      const parentRect = getRect(parentId);
      if (!opsRect || !parentRect) return;

      const from = toLocal(anchorRightCenter(parentRect), containerRect);
      const to = toLocal(anchorLeftCenter(opsRect), containerRect);

      // Route outward first, then down/up, then into OPS (no fake vertical spine)
      const pad = 18;
      const midX = Math.max(from.x + pad, from.x + (to.x - from.x) * 0.6);

      newPaths.push({
        d: `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`,
        dashed: true,
      });
    };

    // --- Main chain: vertically stacked in the centre ---
    createVerticalConnector(NODE_IDS.president, NODE_IDS.vp);
    createVerticalConnector(NODE_IDS.vp, NODE_IDS.hoa);

    // --- HOA to Division Heads ---
    createBusConnector(NODE_IDS.hoa, [
      NODE_IDS.dh_pm,
      NODE_IDS.dh_macro,
      NODE_IDS.dh_inv,
      NODE_IDS.dh_eq,
      NODE_IDS.dh_quant,
    ]);

    // --- Portfolio Management ---
    createBusConnector(NODE_IDS.dh_pm, [NODE_IDS.pm_ma, NODE_IDS.pm_ls]);
    createVerticalConnector(NODE_IDS.pm_ma, NODE_IDS.sa_pm_ma);
    createVerticalConnector(NODE_IDS.sa_pm_ma, NODE_IDS.a_pm_ma);
    createVerticalConnector(NODE_IDS.pm_ls, NODE_IDS.sa_pm_ls);
    createVerticalConnector(NODE_IDS.sa_pm_ls, NODE_IDS.a_pm_ls);

    // --- Other Divisions ---
    createVerticalConnector(NODE_IDS.dh_macro, NODE_IDS.sa_macro);
    createVerticalConnector(NODE_IDS.sa_macro, NODE_IDS.a_macro);

    createVerticalConnector(NODE_IDS.dh_inv, NODE_IDS.sa_inv);
    createVerticalConnector(NODE_IDS.sa_inv, NODE_IDS.a_inv);

    createVerticalConnector(NODE_IDS.dh_eq, NODE_IDS.sa_eq);
    createVerticalConnector(NODE_IDS.sa_eq, NODE_IDS.a_eq);

    createVerticalConnector(NODE_IDS.dh_quant, NODE_IDS.sa_quant);
    createVerticalConnector(NODE_IDS.sa_quant, NODE_IDS.a_quant);

    // --- OPS dotted reporting (clearly lateral) ---
    createDashedReportingToOps(NODE_IDS.president);
    createDashedReportingToOps(NODE_IDS.vp);

    setPaths(newPaths);
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const t = window.setTimeout(computeConnectors, 60);

    const ro = new ResizeObserver(() => computeConnectors());
    ro.observe(container);
    Object.values(nodeRefs.current).forEach((node) => node && ro.observe(node));

    window.addEventListener("resize", computeConnectors);

    const scroller = divisionsScrollRef.current;
    const onScroll = () => computeConnectors();
    if (scroller) scroller.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.clearTimeout(t);
      ro.disconnect();
      window.removeEventListener("resize", computeConnectors);
      if (scroller) scroller.removeEventListener("scroll", onScroll);
    };
  }, [computeConnectors]);

  return (
    <div ref={containerRef} className="relative w-full py-8">
      {/* SVG Connector Overlay */}
      <svg
        className="absolute inset-0 pointer-events-none overflow-visible"
        width={svgSize.width}
        height={svgSize.height}
        viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
        style={{ width: "100%", height: "100%" }}
      >
        {paths.map((path, index) => (
          <path
            key={index}
            d={path.d}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={1}
            strokeDasharray={path.dashed ? "4 4" : undefined}
          />
        ))}
      </svg>

      {/* Nodes */}
      <div className="flex flex-col items-center gap-10">
        {/* TOP: strict 3-row centre stack, OPS in VP row on the side */}
        <div className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_1fr] md:grid-rows-3 gap-y-10 md:gap-x-24 items-start">
            {/* President (centre column, row 1) */}
            <div className="md:col-start-2 md:row-start-1 justify-self-center">
              <RoleCard id={NODE_IDS.president} title="President" isRoot nodeRefs={nodeRefs} />
            </div>

            {/* Vice President (centre column, row 2) */}
            <div className="md:col-start-2 md:row-start-2 justify-self-center">
              <RoleCard id={NODE_IDS.vp} title="Vice President" nodeRefs={nodeRefs} />
            </div>

            {/* Head of Asset Management (centre column, row 3) */}
            <div className="md:col-start-2 md:row-start-3 justify-self-center">
              <RoleCard id={NODE_IDS.hoa} title="Head of Asset Management" nodeRefs={nodeRefs} />
            </div>

            {/* OPS: side column, aligned to VP row (row 2) */}
            <div className="md:col-start-3 md:row-start-2 justify-self-start">
              <RoleCard id={NODE_IDS.ops} title="Operations & Media Team" nodeRefs={nodeRefs} />
            </div>
          </div>
        </div>

        {/* DIVISIONS */}
        <div ref={divisionsScrollRef} className="w-full overflow-x-auto">
          <div className="flex justify-center gap-3 md:gap-6 min-w-max px-4">
            {/* Portfolio Management */}
            <div className="flex flex-col items-center gap-6">
              <RoleCard id={NODE_IDS.dh_pm} title="Head of Portfolio Management" nodeRefs={nodeRefs} />

              <div className="flex gap-3 md:gap-4">
                <div className="flex flex-col items-center gap-6">
                  <RoleCard id={NODE_IDS.pm_ma} title="Portfolio Manager: Multi Asset Fund" nodeRefs={nodeRefs} />
                  <RoleCard id={NODE_IDS.sa_pm_ma} title="Senior Analysts" nodeRefs={nodeRefs} />
                  <RoleCard id={NODE_IDS.a_pm_ma} title="Analysts" nodeRefs={nodeRefs} />
                </div>

                <div className="flex flex-col items-center gap-6">
                  <RoleCard id={NODE_IDS.pm_ls} title="Portfolio Manager: Long/Short Fund" nodeRefs={nodeRefs} />
                  <RoleCard id={NODE_IDS.sa_pm_ls} title="Senior Analysts" nodeRefs={nodeRefs} />
                  <RoleCard id={NODE_IDS.a_pm_ls} title="Analysts" nodeRefs={nodeRefs} />
                </div>
              </div>
            </div>

            {/* Macro */}
            <div className="flex flex-col items-center gap-6">
              <RoleCard id={NODE_IDS.dh_macro} title="Head of Macro Research" nodeRefs={nodeRefs} />
              <RoleCard id={NODE_IDS.sa_macro} title="Senior Analysts" nodeRefs={nodeRefs} />
              <RoleCard id={NODE_IDS.a_macro} title="Analysts" nodeRefs={nodeRefs} />
            </div>

            {/* Investment */}
            <div className="flex flex-col items-center gap-6">
              <RoleCard id={NODE_IDS.dh_inv} title="Head of Investment Research" nodeRefs={nodeRefs} />
              <RoleCard id={NODE_IDS.sa_inv} title="Senior Analysts" nodeRefs={nodeRefs} />
              <RoleCard id={NODE_IDS.a_inv} title="Analysts" nodeRefs={nodeRefs} />
            </div>

            {/* Equity */}
            <div className="flex flex-col items-center gap-6">
              <RoleCard id={NODE_IDS.dh_eq} title="Head of Equity Research" nodeRefs={nodeRefs} />
              <RoleCard id={NODE_IDS.sa_eq} title="Senior Analysts" nodeRefs={nodeRefs} />
              <RoleCard id={NODE_IDS.a_eq} title="Analysts" nodeRefs={nodeRefs} />
            </div>

            {/* Quant */}
            <div className="flex flex-col items-center gap-6">
              <RoleCard id={NODE_IDS.dh_quant} title="Head of Quant Research" nodeRefs={nodeRefs} />
              <RoleCard id={NODE_IDS.sa_quant} title="Senior Analysts" nodeRefs={nodeRefs} />
              <RoleCard id={NODE_IDS.a_quant} title="Analysts" nodeRefs={nodeRefs} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
