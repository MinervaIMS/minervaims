import React from 'react';

interface OrgNodeProps {
  title: string;
  children?: React.ReactNode;
  isRoot?: boolean;
  isDotted?: boolean;
}

const OrgNode = ({ title, children, isRoot = false, isDotted = false }: OrgNodeProps) => (
  <div className="flex flex-col items-center">
    <div 
      className={`px-3 py-2 text-xs md:text-sm font-body text-center border ${
        isRoot 
          ? 'bg-foreground text-background border-foreground font-medium' 
          : 'bg-background text-foreground border-border'
      } ${isDotted ? 'border-dashed' : ''} min-w-[120px] md:min-w-[160px]`}
    >
      {title}
    </div>
    {children && (
      <div className="flex flex-col items-center">
        <div className={`w-px h-4 ${isDotted ? 'border-l border-dashed border-muted-foreground' : 'bg-border'}`} />
        {children}
      </div>
    )}
  </div>
);

const VerticalConnector = ({ isDotted = false }: { isDotted?: boolean }) => (
  <div className={`w-px h-4 ${isDotted ? 'border-l border-dashed border-muted-foreground' : 'bg-border'}`} />
);

const HorizontalBranch = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col items-center">
    <div className="flex items-start">
      {React.Children.map(children, (child, index) => (
        <div key={index} className="flex flex-col items-center px-1 md:px-2">
          <VerticalConnector />
          {child}
        </div>
      ))}
    </div>
  </div>
);

const DivisionBranch = ({ headTitle, children }: { headTitle: string; children: React.ReactNode }) => (
  <div className="flex flex-col items-center">
    <OrgNode title={headTitle} />
    <VerticalConnector />
    {children}
  </div>
);

const AnalystChain = ({ divisionName }: { divisionName: string }) => (
  <div className="flex flex-col items-center">
    <OrgNode title={`Senior Analysts (${divisionName})`} />
    <VerticalConnector />
    <OrgNode title={`Analysts (${divisionName})`} />
  </div>
);

export const OrgChart = () => {
  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="min-w-[900px] md:min-w-[1100px] flex flex-col items-center">
        {/* President */}
        <OrgNode title="President" isRoot />
        
        {/* Lines to VP and HoAM */}
        <VerticalConnector />
        
        {/* VP and HoAM level */}
        <div className="flex items-start gap-8 md:gap-16">
          {/* Operations (dotted line from President/VP) */}
          <div className="flex flex-col items-center mt-8">
            <div className="border-l border-dashed border-muted-foreground h-8" />
            <OrgNode title="Operations & Media Team" isDotted />
          </div>
          
          {/* Main hierarchy */}
          <div className="flex flex-col items-center">
            <OrgNode title="Vice President" />
            <VerticalConnector />
            <OrgNode title="Head of Asset Management" />
            <VerticalConnector />
            
            {/* Division Heads */}
            <div className="relative">
              {/* Horizontal connector line */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-border w-[95%]" />
              
              <div className="flex items-start gap-2 md:gap-4 pt-4">
                {/* Portfolio Management */}
                <div className="flex flex-col items-center">
                  <DivisionBranch headTitle="Head of Division: Portfolio Management">
                    <div className="flex items-start gap-2">
                      {/* Multi Asset PM */}
                      <div className="flex flex-col items-center">
                        <OrgNode title="PM: Multi Asset" />
                        <VerticalConnector />
                        <AnalystChain divisionName="Portfolio Management" />
                      </div>
                      {/* Long/Short PM */}
                      <div className="flex flex-col items-center">
                        <OrgNode title="PM: Long/Short" />
                        <VerticalConnector />
                        <AnalystChain divisionName="Portfolio Management" />
                      </div>
                    </div>
                  </DivisionBranch>
                </div>
                
                {/* Macro Research */}
                <DivisionBranch headTitle="Head of Division: Macro Research">
                  <AnalystChain divisionName="Macro" />
                </DivisionBranch>
                
                {/* Investment Research */}
                <DivisionBranch headTitle="Head of Division: Investment Research">
                  <AnalystChain divisionName="Investment" />
                </DivisionBranch>
                
                {/* Equity Research */}
                <DivisionBranch headTitle="Head of Division: Equity Research">
                  <AnalystChain divisionName="Equity" />
                </DivisionBranch>
                
                {/* Quant Research */}
                <DivisionBranch headTitle="Head of Division: Quant Research">
                  <AnalystChain divisionName="Quant" />
                </DivisionBranch>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
