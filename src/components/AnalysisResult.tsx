import { ShieldCheck, ShieldAlert, ShieldQuestion, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AnalysisData {
  ai_probability: number;
  real_probability: number;
  verdict: "Likely AI-generated" | "Likely Real" | "Uncertain" | string;
  confidence_reason: string;
  signals: string[];
}

interface Props {
  data: AnalysisData;
}

const verdictMeta = (v: string) => {
  if (v === "Likely Real")
    return {
      Icon: ShieldCheck,
      tone: "text-[hsl(var(--success))]",
      bg: "bg-[hsl(var(--success))]/10",
      ring: "ring-[hsl(var(--success))]/30",
    };
  if (v === "Likely AI-generated")
    return {
      Icon: ShieldAlert,
      tone: "text-[hsl(var(--danger))]",
      bg: "bg-[hsl(var(--danger))]/10",
      ring: "ring-[hsl(var(--danger))]/30",
    };
  return {
    Icon: ShieldQuestion,
    tone: "text-[hsl(var(--warning))]",
    bg: "bg-[hsl(var(--warning))]/10",
    ring: "ring-[hsl(var(--warning))]/30",
  };
};

const Bar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="space-y-2">
    <div className="flex items-baseline justify-between">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="font-mono text-2xl font-semibold tabular-nums">{value}%</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-secondary">
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{ width: `${value}%`, background: color }}
      />
    </div>
  </div>
);

export const AnalysisResult = ({ data }: Props) => {
  const meta = verdictMeta(data.verdict);
  const Icon = meta.Icon;

  return (
    <div className="space-y-6 float-in">
      <div
        className={cn(
          "flex items-center gap-4 rounded-2xl p-5 ring-1",
          meta.bg,
          meta.ring,
        )}
      >
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl bg-background/40", meta.tone)}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Verdict</p>
          <p className={cn("text-xl font-semibold", meta.tone)}>{data.verdict}</p>
        </div>
      </div>

      <div className="space-y-5">
        <Bar
          label="AI Generated"
          value={data.ai_probability}
          color="linear-gradient(90deg, hsl(var(--accent)), hsl(var(--danger)))"
        />
        <Bar
          label="Real Photograph"
          value={data.real_probability}
          color="linear-gradient(90deg, hsl(var(--primary)), hsl(var(--success)))"
        />
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-secondary/40 p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          Reasoning
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{data.confidence_reason}</p>
      </div>

      {data.signals.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Key signals</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.signals.map((s, i) => (
              <li
                key={i}
                className="flex gap-2 rounded-xl border border-border bg-card/50 p-3 text-sm"
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
