import { scoreBand } from "@/lib/score-band";
import { cn } from "@/lib/utils";

/** A ring filled to `value` percent, coloured by score band, with the number in the middle. */
export function ScoreRing({
  value,
  size = 140,
  stroke = 12,
  label,
  sublabel,
  color,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  /** Text in the middle (defaults to the rounded percentage). */
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
  /** Override the band colour (CSS colour). */
  color?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color ?? scoreBand(pct).stroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: "stroke-dashoffset 600ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-bold leading-none tabular-nums">{label ?? `${Math.round(pct)}%`}</span>
        {sublabel && <span className="mt-1 text-xs text-muted-foreground">{sublabel}</span>}
      </div>
    </div>
  );
}
