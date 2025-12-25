import React from 'react';

interface NodeProps {
  label: string;
  sublabel?: string;
  className?: string;
}

const ChartNode: React.FC<NodeProps> = ({ label, sublabel, className = '' }) => (
  <div className={`bg-background px-4 py-3 shadow-elevated text-center min-w-[140px] ${className}`}>
    <p className="font-serif text-small leading-tight">{label}</p>
    {sublabel && (
      <p className="font-body text-xs text-muted-foreground mt-1">{sublabel}</p>
    )}
  </div>
);

const Connector: React.FC<{ className?: string; dotted?: boolean }> = ({ className = '', dotted = false }) => (
  <div className={`${dotted ? 'border-dashed' : ''} ${className}`} />
);

export const OrganizationalChart: React.FC = () => {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="min-w-[1000px]">
        {/* Top Leadership */}
        <div className="flex flex-col items-center">
          {/* President */}
          <ChartNode label="President" />
          
          {/* Vertical connector */}
          <div className="w-px h-6 bg-border" />
          
          {/* VP and HoAM row */}
          <div className="flex items-start gap-8">
            {/* Operations branch (dotted) */}
            <div className="flex flex-col items-center">
              <div className="flex items-center">
                <div className="w-16 border-t border-dashed border-muted-foreground" />
                <ChartNode label="Operations & Media Team" className="bg-muted" />
              </div>
              <p className="font-body text-xs text-muted-foreground mt-2 italic">(reports to President & VP)</p>
            </div>
            
            {/* Main hierarchy */}
            <div className="flex flex-col items-center">
              <ChartNode label="Vice President" />
              <div className="w-px h-6 bg-border" />
              <ChartNode label="Head of Asset Management" />
              <div className="w-px h-8 bg-border" />
              
              {/* Division Heads row */}
              <div className="flex items-start">
                {/* Horizontal connector line */}
                <div className="absolute" />
                
                <div className="flex gap-2">
                  {/* Portfolio Management Division */}
                  <div className="flex flex-col items-center">
                    <ChartNode label="Head of Division:" sublabel="Portfolio Management" />
                    <div className="w-px h-4 bg-border" />
                    
                    {/* Portfolio Managers */}
                    <div className="flex gap-2">
                      <div className="flex flex-col items-center">
                        <ChartNode label="Portfolio Manager:" sublabel="Multi Asset" />
                        <div className="w-px h-4 bg-border" />
                        <ChartNode label="Senior Analysts" sublabel="(Portfolio Management)" className="text-xs" />
                        <div className="w-px h-4 bg-border" />
                        <ChartNode label="Analysts" sublabel="(Portfolio Management)" className="text-xs bg-muted" />
                      </div>
                      <div className="flex flex-col items-center">
                        <ChartNode label="Portfolio Manager:" sublabel="Long/Short" />
                        <div className="w-px h-4 bg-border" />
                        <ChartNode label="Senior Analysts" sublabel="(Portfolio Management)" className="text-xs" />
                        <div className="w-px h-4 bg-border" />
                        <ChartNode label="Analysts" sublabel="(Portfolio Management)" className="text-xs bg-muted" />
                      </div>
                    </div>
                  </div>

                  {/* Macro Research Division */}
                  <div className="flex flex-col items-center">
                    <ChartNode label="Head of Division:" sublabel="Macro Research" />
                    <div className="w-px h-4 bg-border" />
                    <ChartNode label="Senior Analysts" sublabel="(Macro)" className="text-xs" />
                    <div className="w-px h-4 bg-border" />
                    <ChartNode label="Analysts" sublabel="(Macro)" className="text-xs bg-muted" />
                  </div>

                  {/* Investment Research Division */}
                  <div className="flex flex-col items-center">
                    <ChartNode label="Head of Division:" sublabel="Investment Research" />
                    <div className="w-px h-4 bg-border" />
                    <ChartNode label="Senior Analysts" sublabel="(Investment)" className="text-xs" />
                    <div className="w-px h-4 bg-border" />
                    <ChartNode label="Analysts" sublabel="(Investment)" className="text-xs bg-muted" />
                  </div>

                  {/* Equity Research Division */}
                  <div className="flex flex-col items-center">
                    <ChartNode label="Head of Division:" sublabel="Equity Research" />
                    <div className="w-px h-4 bg-border" />
                    <ChartNode label="Senior Analysts" sublabel="(Equity)" className="text-xs" />
                    <div className="w-px h-4 bg-border" />
                    <ChartNode label="Analysts" sublabel="(Equity)" className="text-xs bg-muted" />
                  </div>

                  {/* Quant Research Division */}
                  <div className="flex flex-col items-center">
                    <ChartNode label="Head of Division:" sublabel="Quant Research" />
                    <div className="w-px h-4 bg-border" />
                    <ChartNode label="Senior Analysts" sublabel="(Quant)" className="text-xs" />
                    <div className="w-px h-4 bg-border" />
                    <ChartNode label="Analysts" sublabel="(Quant)" className="text-xs bg-muted" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
