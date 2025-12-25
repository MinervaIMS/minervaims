export function OrgChart() {
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[800px] md:min-w-0">
        <svg 
          viewBox="0 0 1000 700" 
          className="w-full h-auto"
          role="img"
          aria-label="MIMS Organisational Structure"
        >
          {/* Definitions */}
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1"/>
            </filter>
          </defs>

          {/* Connection Lines */}
          <g stroke="hsl(0, 0%, 70%)" strokeWidth="1.5" fill="none">
            {/* President to VP and HoAM */}
            <line x1="500" y1="50" x2="500" y2="80" />
            <line x1="300" y1="80" x2="700" y2="80" />
            <line x1="300" y1="80" x2="300" y2="100" />
            <line x1="700" y1="80" x2="700" y2="100" />
            
            {/* VP to HoAM */}
            <line x1="300" y1="150" x2="300" y2="170" />
            <line x1="300" y1="170" x2="700" y2="170" />
            <line x1="700" y1="170" x2="700" y2="150" />
            
            {/* HoAM to Division Heads */}
            <line x1="700" y1="150" x2="700" y2="190" />
            <line x1="100" y1="190" x2="900" y2="190" />
            
            {/* Vertical lines to each division */}
            <line x1="100" y1="190" x2="100" y2="210" />
            <line x1="300" y1="190" x2="300" y2="210" />
            <line x1="500" y1="190" x2="500" y2="210" />
            <line x1="700" y1="190" x2="700" y2="210" />
            <line x1="900" y1="190" x2="900" y2="210" />
            
            {/* PM Division to Portfolio Managers */}
            <line x1="100" y1="260" x2="100" y2="290" />
            <line x1="50" y1="290" x2="150" y2="290" />
            <line x1="50" y1="290" x2="50" y2="310" />
            <line x1="150" y1="290" x2="150" y2="310" />
            
            {/* All divisions to Senior Analysts */}
            <line x1="50" y1="360" x2="50" y2="400" />
            <line x1="150" y1="360" x2="150" y2="400" />
            <line x1="300" y1="260" x2="300" y2="400" />
            <line x1="500" y1="260" x2="500" y2="400" />
            <line x1="700" y1="260" x2="700" y2="400" />
            <line x1="900" y1="260" x2="900" y2="400" />
            
            {/* Senior Analysts line */}
            <line x1="50" y1="400" x2="900" y2="400" />
            <line x1="500" y1="400" x2="500" y2="420" />
            
            {/* Senior Analysts to Analysts */}
            <line x1="500" y1="470" x2="500" y2="510" />
            
            {/* Operations Team - dotted lines */}
            <line x1="300" y1="150" x2="220" y2="580" strokeDasharray="4,4" />
            <line x1="500" y1="30" x2="300" y2="580" strokeDasharray="4,4" />
          </g>

          {/* Nodes */}
          <g>
            {/* President */}
            <g transform="translate(400, 10)">
              <rect width="200" height="40" rx="0" fill="hsl(0, 0%, 8%)" filter="url(#shadow)" />
              <text x="100" y="26" textAnchor="middle" fill="white" className="font-serif text-[14px]">President</text>
            </g>

            {/* Vice President */}
            <g transform="translate(200, 100)">
              <rect width="200" height="50" rx="0" fill="hsl(0, 0%, 100%)" filter="url(#shadow)" />
              <text x="100" y="31" textAnchor="middle" fill="hsl(0, 0%, 8%)" className="font-serif text-[13px]">Vice President</text>
            </g>

            {/* Head of Asset Management */}
            <g transform="translate(600, 100)">
              <rect width="200" height="50" rx="0" fill="hsl(0, 0%, 100%)" filter="url(#shadow)" />
              <text x="100" y="24" textAnchor="middle" fill="hsl(0, 0%, 8%)" className="font-serif text-[12px]">Head of</text>
              <text x="100" y="40" textAnchor="middle" fill="hsl(0, 0%, 8%)" className="font-serif text-[12px]">Asset Management</text>
            </g>

            {/* Division Heads */}
            <g transform="translate(20, 210)">
              <rect width="160" height="50" rx="0" fill="hsl(0, 0%, 100%)" filter="url(#shadow)" />
              <text x="80" y="24" textAnchor="middle" fill="hsl(0, 0%, 8%)" className="font-serif text-[11px]">Head of Division:</text>
              <text x="80" y="40" textAnchor="middle" fill="hsl(0, 0%, 8%)" className="font-serif text-[11px]">Portfolio Management</text>
            </g>

            <g transform="translate(220, 210)">
              <rect width="160" height="50" rx="0" fill="hsl(0, 0%, 100%)" filter="url(#shadow)" />
              <text x="80" y="24" textAnchor="middle" fill="hsl(0, 0%, 8%)" className="font-serif text-[11px]">Head of Division:</text>
              <text x="80" y="40" textAnchor="middle" fill="hsl(0, 0%, 8%)" className="font-serif text-[11px]">Macro Research</text>
            </g>

            <g transform="translate(420, 210)">
              <rect width="160" height="50" rx="0" fill="hsl(0, 0%, 100%)" filter="url(#shadow)" />
              <text x="80" y="24" textAnchor="middle" fill="hsl(0, 0%, 8%)" className="font-serif text-[11px]">Head of Division:</text>
              <text x="80" y="40" textAnchor="middle" fill="hsl(0, 0%, 8%)" className="font-serif text-[11px]">Investment Research</text>
            </g>

            <g transform="translate(620, 210)">
              <rect width="160" height="50" rx="0" fill="hsl(0, 0%, 100%)" filter="url(#shadow)" />
              <text x="80" y="24" textAnchor="middle" fill="hsl(0, 0%, 8%)" className="font-serif text-[11px]">Head of Division:</text>
              <text x="80" y="40" textAnchor="middle" fill="hsl(0, 0%, 8%)" className="font-serif text-[11px]">Equity Research</text>
            </g>

            <g transform="translate(820, 210)">
              <rect width="160" height="50" rx="0" fill="hsl(0, 0%, 100%)" filter="url(#shadow)" />
              <text x="80" y="24" textAnchor="middle" fill="hsl(0, 0%, 8%)" className="font-serif text-[11px]">Head of Division:</text>
              <text x="80" y="40" textAnchor="middle" fill="hsl(0, 0%, 8%)" className="font-serif text-[11px]">Quant Research</text>
            </g>

            {/* Portfolio Managers */}
            <g transform="translate(-15, 310)">
              <rect width="130" height="50" rx="0" fill="hsl(0, 0%, 100%)" filter="url(#shadow)" />
              <text x="65" y="24" textAnchor="middle" fill="hsl(0, 0%, 8%)" className="font-serif text-[10px]">Portfolio Manager:</text>
              <text x="65" y="40" textAnchor="middle" fill="hsl(0, 0%, 8%)" className="font-serif text-[10px]">Multi Asset</text>
            </g>

            <g transform="translate(85, 310)">
              <rect width="130" height="50" rx="0" fill="hsl(0, 0%, 100%)" filter="url(#shadow)" />
              <text x="65" y="24" textAnchor="middle" fill="hsl(0, 0%, 8%)" className="font-serif text-[10px]">Portfolio Manager:</text>
              <text x="65" y="40" textAnchor="middle" fill="hsl(0, 0%, 8%)" className="font-serif text-[10px]">Long/Short</text>
            </g>

            {/* Senior Analysts */}
            <g transform="translate(400, 420)">
              <rect width="200" height="50" rx="0" fill="hsl(0, 0%, 100%)" filter="url(#shadow)" />
              <text x="100" y="31" textAnchor="middle" fill="hsl(0, 0%, 8%)" className="font-serif text-[13px]">Senior Analysts</text>
            </g>

            {/* Analysts */}
            <g transform="translate(400, 510)">
              <rect width="200" height="50" rx="0" fill="hsl(0, 0%, 100%)" filter="url(#shadow)" />
              <text x="100" y="31" textAnchor="middle" fill="hsl(0, 0%, 8%)" className="font-serif text-[13px]">Analysts</text>
            </g>

            {/* Operations & Media Team */}
            <g transform="translate(150, 580)">
              <rect width="200" height="50" rx="0" fill="hsl(0, 0%, 94%)" filter="url(#shadow)" />
              <text x="100" y="31" textAnchor="middle" fill="hsl(0, 0%, 8%)" className="font-serif text-[12px]">Operations & Media Team</text>
            </g>
          </g>

          {/* Legend */}
          <g transform="translate(750, 600)">
            <line x1="0" y1="10" x2="30" y2="10" stroke="hsl(0, 0%, 70%)" strokeWidth="1.5" />
            <text x="40" y="14" fill="hsl(0, 0%, 45%)" className="font-body text-[11px]">Direct reporting</text>
            
            <line x1="0" y1="35" x2="30" y2="35" stroke="hsl(0, 0%, 70%)" strokeWidth="1.5" strokeDasharray="4,4" />
            <text x="40" y="39" fill="hsl(0, 0%, 45%)" className="font-body text-[11px]">Oversight / coordination</text>
          </g>
        </svg>
      </div>
    </div>
  );
}
