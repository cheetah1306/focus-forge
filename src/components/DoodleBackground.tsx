import { cn } from '../lib/utils'

interface DoodleBackgroundProps {
  className?: string
}

export function DoodleBackground({ className }: DoodleBackgroundProps) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      aria-hidden="true"
    >
      <svg
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern
            id="edu-doodle"
            x="0"
            y="0"
            width="320"
            height="320"
            patternUnits="userSpaceOnUse"
          >
            {/* Notebook */}
            <g transform="translate(20,15)" opacity="0.07" stroke="#5b8cff" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="0" y="0" width="38" height="50" rx="3" />
              <line x1="6" y1="0" x2="6" y2="50" />
              <line x1="12" y1="10" x2="32" y2="10" />
              <line x1="12" y1="18" x2="32" y2="18" />
              <line x1="12" y1="26" x2="28" y2="26" />
              <line x1="12" y1="34" x2="30" y2="34" />
            </g>

            {/* Open book */}
            <g transform="translate(180,25) rotate(8)" opacity="0.06" stroke="#a78bfa" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M0,20 Q-20,0 -35,5 L-35,45 Q-20,40 0,45 Z" />
              <path d="M0,20 Q20,0 35,5 L35,45 Q20,40 0,45 Z" />
              <line x1="0" y1="20" x2="0" y2="45" />
              <line x1="-28" y1="15" x2="-8" y2="18" />
              <line x1="-28" y1="25" x2="-8" y2="27" />
              <line x1="-28" y1="35" x2="-12" y2="36" />
              <line x1="8" y1="18" x2="28" y2="15" />
              <line x1="8" y1="27" x2="28" y2="25" />
              <line x1="12" y1="36" x2="28" y2="35" />
            </g>

            {/* Pencil */}
            <g transform="translate(100,60) rotate(-30)" opacity="0.08" stroke="#5b8cff" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="0" y="0" width="60" height="8" rx="1" />
              <polygon points="60,0 72,4 60,8" />
              <line x1="6" y1="0" x2="6" y2="8" />
              <rect x="0" y="0" width="6" height="8" fill="#5b8cff" opacity="0.15" stroke="none" />
            </g>

            {/* Pen */}
            <g transform="translate(260,70) rotate(15)" opacity="0.06" stroke="#97a1bb" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="0" y="0" width="50" height="6" rx="3" />
              <polygon points="50,0 58,3 50,6" />
              <circle cx="4" cy="3" r="1.5" />
            </g>

            {/* Eraser */}
            <g transform="translate(40,120) rotate(-10)" opacity="0.07" stroke="#a78bfa" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="0" y="0" width="24" height="12" rx="2" />
              <rect x="24" y="0" width="8" height="12" rx="1" />
              <line x1="24" y1="0" x2="24" y2="12" />
            </g>

            {/* Pencil sharpener */}
            <g transform="translate(150,110)" opacity="0.06" stroke="#5b8cff" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="0" y="0" width="20" height="16" rx="2" />
              <circle cx="10" cy="8" r="4" />
              <circle cx="10" cy="8" r="1.5" />
              <rect x="4" y="16" width="12" height="6" rx="1" />
            </g>

            {/* Ruler */}
            <g transform="translate(230,130) rotate(20)" opacity="0.07" stroke="#97a1bb" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="0" y="0" width="60" height="10" rx="1" />
              <line x1="5" y1="0" x2="5" y2="4" />
              <line x1="10" y1="0" x2="10" y2="6" />
              <line x1="15" y1="0" x2="15" y2="4" />
              <line x1="20" y1="0" x2="20" y2="6" />
              <line x1="25" y1="0" x2="25" y2="4" />
              <line x1="30" y1="0" x2="30" y2="8" />
              <line x1="35" y1="0" x2="35" y2="4" />
              <line x1="40" y1="0" x2="40" y2="6" />
              <line x1="45" y1="0" x2="45" y2="4" />
              <line x1="50" y1="0" x2="50" y2="6" />
              <line x1="55" y1="0" x2="55" y2="4" />
            </g>

            {/* Graduation cap */}
            <g transform="translate(60,180)" opacity="0.06" stroke="#a78bfa" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="0,12 30,0 60,12 30,24" />
              <path d="M12,18 L12,32 Q30,40 48,32 L48,18" />
              <line x1="30" y1="12" x2="30" y2="0" />
              <circle cx="30" cy="-3" r="3" />
              <path d="M30,-3 L30,-12 L42,-8" />
            </g>

            {/* Light bulb */}
            <g transform="translate(200,170)" opacity="0.07" stroke="#fbbf24" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10,0 Q0,0 0,10 Q0,18 6,22 L6,28 L14,28 L14,22 Q20,18 20,10 Q20,0 10,0 Z" />
              <line x1="7" y1="32" x2="13" y2="32" />
              <line x1="8" y1="36" x2="12" y2="36" />
              <line x1="10" y1="-6" x2="10" y2="-12" />
              <line x1="2" y1="-2" x2="-4" y2="-6" />
              <line x1="18" y1="-2" x2="24" y2="-6" />
            </g>

            {/* Calculator */}
            <g transform="translate(270,190)" opacity="0.06" stroke="#5b8cff" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="0" y="0" width="30" height="42" rx="3" />
              <rect x="4" y="4" width="22" height="10" rx="1" />
              <circle cx="8" cy="22" r="2" />
              <circle cx="15" cy="22" r="2" />
              <circle cx="22" cy="22" r="2" />
              <circle cx="8" cy="30" r="2" />
              <circle cx="15" cy="30" r="2" />
              <circle cx="22" cy="30" r="2" />
              <circle cx="8" cy="38" r="2" />
              <circle cx="22" cy="38" r="2" />
            </g>

            {/* Clock */}
            <g transform="translate(120,210)" opacity="0.07" stroke="#97a1bb" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="15" cy="15" r="15" />
              <circle cx="15" cy="15" r="1" fill="#97a1bb" />
              <line x1="15" y1="15" x2="15" y2="6" />
              <line x1="15" y1="15" x2="22" y2="15" />
              <line x1="15" y1="0" x2="15" y2="2" />
              <line x1="15" y1="28" x2="15" y2="30" />
              <line x1="0" y1="15" x2="2" y2="15" />
              <line x1="28" y1="15" x2="30" y2="15" />
            </g>

            {/* Formula (Sigma) */}
            <g transform="translate(30,250)" opacity="0.05" stroke="#a78bfa" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <text x="0" y="20" fontFamily="serif" fontSize="28" fill="#a78bfa" opacity="0.6">Σ</text>
              <text x="35" y="14" fontFamily="serif" fontSize="14" fill="#a78bfa" opacity="0.5">∞</text>
              <text x="35" y="30" fontFamily="serif" fontSize="14" fill="#a78bfa" opacity="0.5">n=1</text>
            </g>

            {/* Sticky note */}
            <g transform="translate(200,240) rotate(-5)" opacity="0.07" stroke="#fbbf24" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="0" y="0" width="32" height="32" rx="2" />
              <line x1="4" y1="10" x2="28" y2="10" />
              <line x1="4" y1="17" x2="24" y2="17" />
              <line x1="4" y1="24" x2="20" y2="24" />
              <path d="M24,0 L32,8 L24,8 Z" fill="#fbbf24" opacity="0.1" stroke="none" />
            </g>

            {/* Paper clip */}
            <g transform="translate(290,270) rotate(25)" opacity="0.06" stroke="#97a1bb" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4,0 L4,24 Q4,30 10,30 Q16,30 16,24 L16,6 Q16,0 10,0 Q4,0 4,6 L4,20" />
            </g>

            {/* Headphones */}
            <g transform="translate(80,270)" opacity="0.06" stroke="#5b8cff" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4,20 Q4,4 20,4 Q36,4 36,20" />
              <rect x="0" y="18" width="8" height="14" rx="3" />
              <rect x="32" y="18" width="8" height="14" rx="3" />
            </g>

            {/* Math symbols */}
            <g transform="translate(160,290)" opacity="0.05" stroke="#a78bfa" strokeWidth="1.4" fill="none" strokeLinecap="round">
              <text x="0" y="16" fontFamily="serif" fontSize="20" fill="#a78bfa" opacity="0.5">π</text>
              <text x="20" y="16" fontFamily="serif" fontSize="20" fill="#a78bfa" opacity="0.5">√</text>
              <text x="42" y="16" fontFamily="serif" fontSize="18" fill="#a78bfa" opacity="0.5">∫</text>
              <text x="62" y="16" fontFamily="serif" fontSize="16" fill="#a78bfa" opacity="0.5">≠</text>
            </g>

            {/* Study desk */}
            <g transform="translate(240,30) rotate(-5)" opacity="0.05" stroke="#97a1bb" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="0" y="0" width="40" height="2" />
              <line x1="4" y1="2" x2="4" y2="18" />
              <line x1="36" y1="2" x2="36" y2="18" />
              <rect x="10" y="-12" width="20" height="12" rx="1" />
              <line x1="14" y1="-9" x2="26" y2="-9" />
              <line x1="14" y1="-5" x2="22" y2="-5" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#edu-doodle)" />
      </svg>
    </div>
  )
}
