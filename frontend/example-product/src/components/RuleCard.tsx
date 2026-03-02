import { cn } from "@/lib/utils";
import { 
  DollarSign, 
  Coins, 
  User, 
  Clock, 
  ChevronRight,
  Check,
  X,
  GripVertical
} from "lucide-react";

type RuleType = "minAmount" | "maxAmount" | "allowedToken" | "allowedSender" | "expiration";

interface RuleCardProps {
  type: RuleType;
  field: string;
  operator: string;
  value: string;
  isActive?: boolean;
  evaluationResult?: "passed" | "failed" | null;
  actualValue?: string;
  onClick?: () => void;
  isDraggable?: boolean;
}

const ruleIcons: Record<RuleType, typeof DollarSign> = {
  minAmount: DollarSign,
  maxAmount: DollarSign,
  allowedToken: Coins,
  allowedSender: User,
  expiration: Clock,
};

const ruleColors: Record<RuleType, string> = {
  minAmount: "bg-accent/10 text-accent border-accent/20",
  maxAmount: "bg-warning/10 text-warning border-warning/20",
  allowedToken: "bg-primary/10 text-primary border-primary/20",
  allowedSender: "bg-success/10 text-success border-success/20",
  expiration: "bg-destructive/10 text-destructive border-destructive/20",
};

export function RuleCard({
  type,
  field,
  operator,
  value,
  isActive = true,
  evaluationResult,
  actualValue,
  onClick,
  isDraggable = false,
}: RuleCardProps) {
  const Icon = ruleIcons[type];

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-4 rounded-2xl border transition-all duration-200",
        "text-left group",
        isActive
          ? "bg-card border-border/50 hover:shadow-soft-md hover:border-border"
          : "bg-muted/50 border-border/30 opacity-60"
      )}
    >
      {/* Drag handle */}
      {isDraggable && (
        <GripVertical className="w-4 h-4 text-muted-foreground/50" />
      )}

      {/* Icon */}
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", ruleColors[type])}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Rule details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{field}</span>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md font-mono">
            {operator}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5 font-mono truncate">
          {value}
        </p>
        {evaluationResult && actualValue && (
          <p className={cn(
            "text-xs mt-1",
            evaluationResult === "passed" ? "text-success" : "text-destructive"
          )}>
            Actual: {actualValue}
          </p>
        )}
      </div>

      {/* Evaluation result or chevron */}
      {evaluationResult ? (
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            evaluationResult === "passed" ? "bg-success-muted" : "bg-destructive-muted"
          )}
        >
          {evaluationResult === "passed" ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <X className="w-4 h-4 text-destructive" />
          )}
        </div>
      ) : onClick ? (
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      ) : null}
    </button>
  );
}
