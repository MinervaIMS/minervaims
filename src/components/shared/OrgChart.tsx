import React from 'react';

interface RoleCardProps {
  title: string;
  description?: string;
  isRoot?: boolean;
}

const RoleCard = ({ title, description, isRoot = false }: RoleCardProps) => (
  <div className="flex flex-col items-center">
    <div 
      className={`px-4 py-3 text-xs md:text-sm font-body text-center border ${
        isRoot 
          ? 'bg-foreground text-background border-foreground font-medium' 
          : 'bg-background text-foreground border-border'
      } min-w-[140px] md:min-w-[180px]`}
    >
      {title}
    </div>
    {description && (
      <p className="text-xs text-muted-foreground mt-2 max-w-[180px] text-center font-body">
        {description}
      </p>
    )}
  </div>
);

const VerticalLine = ({ height = 'h-6', dashed = false }: { height?: string; dashed?: boolean }) => (
  <div className={`w-px ${height} ${dashed ? 'border-l border-dashed border-muted-foreground' : 'bg-border'}`} />
);

const HorizontalLine = ({ width }: { width: string }) => (
  <div className={`h-px bg-border ${width}`} />
);

export const OrgChart = () => {
  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="min-w-[1000px] flex flex-col items-center gap-1">
        
        {/* Level 1: President */}
        <RoleCard 
          title="President" 
          description="Overall leadership and strategic direction of the Society."
          isRoot 
        />
        <VerticalLine />
        
        {/* Level 2: VP and Operations side by side */}
        <div className="flex items-start gap-16">
          {/* Operations - dotted line connection */}
          <div className="flex flex-col items-center mt-6">
            <VerticalLine height="h-8" dashed />
            <RoleCard title="Operations & Media Team" />
          </div>
          
          {/* Main hierarchy continues */}
          <div className="flex flex-col items-center">
            <RoleCard 
              title="Vice President" 
              description="Supports the President and coordinates the Operations Team."
            />
            <VerticalLine />
            
            {/* Level 3: Head of Asset Management */}
            <RoleCard 
              title="Head of Asset Management" 
              description="Oversight and coordination of funds management and research activities."
            />
            <VerticalLine />
            
            {/* Horizontal connector to division heads */}
            <div className="relative w-full flex justify-center">
              <HorizontalLine width="w-[850px]" />
            </div>
            
            {/* Level 4: Division Heads */}
            <div className="flex gap-4 mt-1">
              {/* Portfolio Management Division */}
              <div className="flex flex-col items-center">
                <VerticalLine height="h-4" />
                <RoleCard title="Head of Portfolio Management" />
                <VerticalLine />
                
                {/* Portfolio Managers */}
                <div className="relative flex justify-center">
                  <HorizontalLine width="w-[200px]" />
                </div>
                <div className="flex gap-4 mt-1">
                  {/* Multi Asset */}
                  <div className="flex flex-col items-center">
                    <VerticalLine height="h-4" />
                    <RoleCard title="Portfolio Manager: Multi Asset" />
                    <VerticalLine />
                    <RoleCard title="Senior Analysts" />
                    <VerticalLine />
                    <RoleCard title="Analysts" />
                  </div>
                  {/* Long/Short */}
                  <div className="flex flex-col items-center">
                    <VerticalLine height="h-4" />
                    <RoleCard title="Portfolio Manager: Long/Short" />
                    <VerticalLine />
                    <RoleCard title="Senior Analysts" />
                    <VerticalLine />
                    <RoleCard title="Analysts" />
                  </div>
                </div>
              </div>
              
              {/* Macro Research Division */}
              <div className="flex flex-col items-center">
                <VerticalLine height="h-4" />
                <RoleCard title="Head of Macro Research" />
                <VerticalLine />
                <RoleCard title="Senior Analysts" />
                <VerticalLine />
                <RoleCard title="Analysts" />
              </div>
              
              {/* Investment Research Division */}
              <div className="flex flex-col items-center">
                <VerticalLine height="h-4" />
                <RoleCard title="Head of Investment Research" />
                <VerticalLine />
                <RoleCard title="Senior Analysts" />
                <VerticalLine />
                <RoleCard title="Analysts" />
              </div>
              
              {/* Equity Research Division */}
              <div className="flex flex-col items-center">
                <VerticalLine height="h-4" />
                <RoleCard title="Head of Equity Research" />
                <VerticalLine />
                <RoleCard title="Senior Analysts" />
                <VerticalLine />
                <RoleCard title="Analysts" />
              </div>
              
              {/* Quant Research Division */}
              <div className="flex flex-col items-center">
                <VerticalLine height="h-4" />
                <RoleCard title="Head of Quant Research" />
                <VerticalLine />
                <RoleCard title="Senior Analysts" />
                <VerticalLine />
                <RoleCard title="Analysts" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
