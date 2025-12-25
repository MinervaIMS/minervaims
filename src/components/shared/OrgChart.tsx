import React, { useRef, useLayoutEffect, useState, useCallback } from 'react';

// Node IDs for ref mapping
const NODE_IDS = {
  president: 'president',
  vp: 'vp',
  hoa: 'hoa',
  ops: 'ops',
  dh_pm: 'dh_pm',
  dh_macro: 'dh_macro',
  dh_inv: 'dh_inv',
  dh_eq: 'dh_eq',
  dh_quant: 'dh_quant',
  pm_ma: 'pm_ma',
  pm_ls: 'pm_ls',
  sa_pm_ma: 'sa_pm_ma',
  a_pm_ma: 'a_pm_ma',
  sa_pm_ls: 'sa_pm_ls',
  a_pm_ls: 'a_pm_ls',
  sa_macro: 'sa_macro',
  a_macro: 'a_macro',
  sa_inv: 'sa_inv',
  a_inv: 'a_inv',
  sa_eq: 'sa_eq',
  a_eq: 'a_eq',
  sa_quant: 'sa_quant',
  a_quant: 'a_quant',
} as const;

type NodeId = typeof NODE_IDS[keyof typeof NODE_IDS];

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
    ref={(el) => { nodeRefs.current[id] = el; }}
    className="flex flex-col items-center"
  >
    <div 
      className={`px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm font-body text-center border ${
        isRoot 
          ? 'bg-foreground text-background border-foreground font-medium' 
          : 'bg-muted text-foreground border-border'
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

// Helper functions for connector calculations
function anchorTopCenter(rect: DOMRect) {
  return { x: rect.left + rect.width / 2, y: rect.top };
}

function anchorBottomCenter(rect: DOMRect) {
  return { x: rect.left + rect.width / 2, y: rect.bottom };
}

function toLocal(pt: { x: number; y: number }, containerRect: DOMRect) {
  return { x: pt.x - containerRect.left, y: pt.y - containerRect.top };
}

export const OrgChart = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [paths, setPaths] = useState<PathData[]>([]);
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });

  const computeConnectors = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    setSvgSize({ width: containerRect.width, height: containerRect.height });

    const getRect = (id: NodeId): DOMRect | null => {
      const el = nodeRefs.current[id];
      if (!el) return null;
      // Get the actual card box (first child div)
      const cardBox = el.querySelector('div');
      return cardBox ? cardBox.getBoundingClientRect() : el.getBoundingClientRect();
    };

    const newPaths: PathData[] = [];

    // Helper to create simple vertical connector
    const createVerticalConnector = (parentId: NodeId, childId: NodeId): void => {
      const parentRect = getRect(parentId);
      const childRect = getRect(childId);
      if (!parentRect || !childRect) return;

      const from = toLocal(anchorBottomCenter(parentRect), containerRect);
      const to = toLocal(anchorTopCenter(childRect), containerRect);
      newPaths.push({ d: `M ${from.x} ${from.y} L ${from.x} ${to.y} L ${to.x} ${to.y}` });
    };

    // Helper to create bus connector (one parent to multiple children)
    const createBusConnector = (parentId: NodeId, childIds: NodeId[]): void => {
      const parentRect = getRect(parentId);
      const childRects = childIds.map(id => ({ id, rect: getRect(id) })).filter(c => c.rect !== null);
      
      if (!parentRect || childRects.length === 0) return;

      const from = toLocal(anchorBottomCenter(parentRect), containerRect);
      const childTops = childRects.map(c => toLocal(anchorTopCenter(c.rect!), containerRect));
      
      const minChildY = Math.min(...childTops.map(p => p.y));
      const busY = from.y + (minChildY - from.y) * 0.5;

      // Vertical line from parent to bus
      newPaths.push({ d: `M ${from.x} ${from.y} L ${from.x} ${busY}` });

      // Horizontal bus line
      const leftX = Math.min(...childTops.map(p => p.x));
      const rightX = Math.max(...childTops.map(p => p.x));
      newPaths.push({ d: `M ${leftX} ${busY} L ${rightX} ${busY}` });

      // Vertical drops to each child
      childTops.forEach(p => {
        newPaths.push({ d: `M ${p.x} ${busY} L ${p.x} ${p.y}` });
      });
    };

    // 1. President -> VP
    createVerticalConnector(NODE_IDS.president, NODE_IDS.vp);

    // 2. VP -> HOA
    createVerticalConnector(NODE_IDS.vp, NODE_IDS.hoa);

    // 3. HOA -> Division Heads (bus connector)
    createBusConnector(NODE_IDS.hoa, [
      NODE_IDS.dh_pm,
      NODE_IDS.dh_macro,
      NODE_IDS.dh_inv,
      NODE_IDS.dh_eq,
      NODE_IDS.dh_quant,
    ]);

    // 4. Head of PM -> Portfolio Managers (bus)
    createBusConnector(NODE_IDS.dh_pm, [NODE_IDS.pm_ma, NODE_IDS.pm_ls]);

    // 5. PM Multi Asset chain
    createVerticalConnector(NODE_IDS.pm_ma, NODE_IDS.sa_pm_ma);
    createVerticalConnector(NODE_IDS.sa_pm_ma, NODE_IDS.a_pm_ma);

    // 6. PM Long/Short chain
    createVerticalConnector(NODE_IDS.pm_ls, NODE_IDS.sa_pm_ls);
    createVerticalConnector(NODE_IDS.sa_pm_ls, NODE_IDS.a_pm_ls);

    // 7. Macro Research chain
    createVerticalConnector(NODE_IDS.dh_macro, NODE_IDS.sa_macro);
    createVerticalConnector(NODE_IDS.sa_macro, NODE_IDS.a_macro);

    // 8. Investment Research chain
    createVerticalConnector(NODE_IDS.dh_inv, NODE_IDS.sa_inv);
    createVerticalConnector(NODE_IDS.sa_inv, NODE_IDS.a_inv);

    // 9. Equity Research chain
    createVerticalConnector(NODE_IDS.dh_eq, NODE_IDS.sa_eq);
    createVerticalConnector(NODE_IDS.sa_eq, NODE_IDS.a_eq);

    // 10. Quant Research chain
    createVerticalConnector(NODE_IDS.dh_quant, NODE_IDS.sa_quant);
    createVerticalConnector(NODE_IDS.sa_quant, NODE_IDS.a_quant);

    // 11. Operations & Media dotted lines to President and VP
    const opsRect = getRect(NODE_IDS.ops);
    const presRect = getRect(NODE_IDS.president);
    const vpRect = getRect(NODE_IDS.vp);

    if (opsRect && presRect) {
      const opsTop = toLocal(anchorTopCenter(opsRect), containerRect);
      const presBottom = toLocal(anchorBottomCenter(presRect), containerRect);
      const midY = presBottom.y + (opsTop.y - presBottom.y) * 0.3;
      newPaths.push({ 
        d: `M ${presBottom.x} ${presBottom.y} L ${presBottom.x} ${midY} L ${opsTop.x} ${midY} L ${opsTop.x} ${opsTop.y}`,
        dashed: true 
      });
    }

    if (opsRect && vpRect) {
      const opsTop = toLocal(anchorTopCenter(opsRect), containerRect);
      const vpBottom = toLocal(anchorBottomCenter(vpRect), containerRect);
      const midY = vpBottom.y + (opsTop.y - vpBottom.y) * 0.5;
      newPaths.push({ 
        d: `M ${vpBottom.x} ${vpBottom.y} L ${vpBottom.x} ${midY} L ${opsTop.x} ${midY} L ${opsTop.x} ${opsTop.y}`,
        dashed: true 
      });
    }

    setPaths(newPaths);
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial computation with a small delay to ensure DOM is ready
    const timeoutId = setTimeout(computeConnectors, 50);

    // ResizeObserver for container and nodes
    const resizeObserver = new ResizeObserver(() => {
      computeConnectors();
    });

    resizeObserver.observe(container);
    Object.values(nodeRefs.current).forEach(node => {
      if (node) resizeObserver.observe(node);
    });

    // Window resize listener
    window.addEventListener('resize', computeConnectors);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', computeConnectors);
    };
  }, [computeConnectors]);

  return (
    <div ref={containerRef} className="relative w-full py-8">
      {/* SVG Connector Overlay */}
      <svg 
        className="absolute inset-0 pointer-events-none overflow-visible"
        width={svgSize.width}
        height={svgSize.height}
        style={{ width: '100%', height: '100%' }}
      >
        {paths.map((path, index) => (
          <path
            key={index}
            d={path.d}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={1}
            strokeDasharray={path.dashed ? '4 4' : undefined}
          />
        ))}
      </svg>

      {/* Nodes Layout */}
      <div className="flex flex-col items-center gap-10">
        {/* Level 1: President */}
        <RoleCard 
          id={NODE_IDS.president}
          title="President" 
          isRoot 
          nodeRefs={nodeRefs}
        />

        {/* Level 2: VP centered with OPS to the right */}
        <div className="flex items-start justify-center w-full">
          <div className="flex items-start gap-16 md:gap-24">
            {/* VP - centered in main hierarchy */}
            <div className="flex-shrink-0">
              <RoleCard 
                id={NODE_IDS.vp}
                title="Vice President" 
                nodeRefs={nodeRefs}
              />
            </div>

            {/* Operations - to the right, outside hierarchy */}
            <div className="flex-shrink-0">
              <RoleCard 
                id={NODE_IDS.ops}
                title="Operations & Media Team" 
                nodeRefs={nodeRefs}
              />
            </div>
          </div>
        </div>

        {/* Level 3: Head of Asset Management */}
        <RoleCard 
          id={NODE_IDS.hoa}
          title="Head of Asset Management" 
          nodeRefs={nodeRefs}
        />

        {/* Level 4: Division Heads */}
        <div className="w-full overflow-x-auto">
          <div className="flex justify-center gap-3 md:gap-6 min-w-max px-4">
            {/* Portfolio Management Division */}
            <div className="flex flex-col items-center gap-6">
              <RoleCard 
                id={NODE_IDS.dh_pm}
                title="Head of Portfolio Management" 
                nodeRefs={nodeRefs}
              />
              
              {/* Portfolio Managers */}
              <div className="flex gap-3 md:gap-4">
                {/* Multi Asset Stream */}
                <div className="flex flex-col items-center gap-6">
                  <RoleCard 
                    id={NODE_IDS.pm_ma}
                    title="Portfolio Manager: Multi Asset" 
                    nodeRefs={nodeRefs}
                  />
                  <RoleCard 
                    id={NODE_IDS.sa_pm_ma}
                    title="Senior Analysts" 
                    nodeRefs={nodeRefs}
                  />
                  <RoleCard 
                    id={NODE_IDS.a_pm_ma}
                    title="Analysts" 
                    nodeRefs={nodeRefs}
                  />
                </div>
                
                {/* Long/Short Stream */}
                <div className="flex flex-col items-center gap-6">
                  <RoleCard 
                    id={NODE_IDS.pm_ls}
                    title="Portfolio Manager: Long/Short" 
                    nodeRefs={nodeRefs}
                  />
                  <RoleCard 
                    id={NODE_IDS.sa_pm_ls}
                    title="Senior Analysts" 
                    nodeRefs={nodeRefs}
                  />
                  <RoleCard 
                    id={NODE_IDS.a_pm_ls}
                    title="Analysts" 
                    nodeRefs={nodeRefs}
                  />
                </div>
              </div>
            </div>

            {/* Macro Research Division */}
            <div className="flex flex-col items-center gap-6">
              <RoleCard 
                id={NODE_IDS.dh_macro}
                title="Head of Macro Research" 
                nodeRefs={nodeRefs}
              />
              <RoleCard 
                id={NODE_IDS.sa_macro}
                title="Senior Analysts" 
                nodeRefs={nodeRefs}
              />
              <RoleCard 
                id={NODE_IDS.a_macro}
                title="Analysts" 
                nodeRefs={nodeRefs}
              />
            </div>

            {/* Investment Research Division */}
            <div className="flex flex-col items-center gap-6">
              <RoleCard 
                id={NODE_IDS.dh_inv}
                title="Head of Investment Research" 
                nodeRefs={nodeRefs}
              />
              <RoleCard 
                id={NODE_IDS.sa_inv}
                title="Senior Analysts" 
                nodeRefs={nodeRefs}
              />
              <RoleCard 
                id={NODE_IDS.a_inv}
                title="Analysts" 
                nodeRefs={nodeRefs}
              />
            </div>

            {/* Equity Research Division */}
            <div className="flex flex-col items-center gap-6">
              <RoleCard 
                id={NODE_IDS.dh_eq}
                title="Head of Equity Research" 
                nodeRefs={nodeRefs}
              />
              <RoleCard 
                id={NODE_IDS.sa_eq}
                title="Senior Analysts" 
                nodeRefs={nodeRefs}
              />
              <RoleCard 
                id={NODE_IDS.a_eq}
                title="Analysts" 
                nodeRefs={nodeRefs}
              />
            </div>

            {/* Quant Research Division */}
            <div className="flex flex-col items-center gap-6">
              <RoleCard 
                id={NODE_IDS.dh_quant}
                title="Head of Quant Research" 
                nodeRefs={nodeRefs}
              />
              <RoleCard 
                id={NODE_IDS.sa_quant}
                title="Senior Analysts" 
                nodeRefs={nodeRefs}
              />
              <RoleCard 
                id={NODE_IDS.a_quant}
                title="Analysts" 
                nodeRefs={nodeRefs}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
