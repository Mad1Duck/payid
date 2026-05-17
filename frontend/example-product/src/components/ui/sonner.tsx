import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useV4Theme } from "@/components/v4/theme"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useV4Theme()
  const isDark = theme === "dark"

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-[#10B981]" />,
        info: <InfoIcon className="size-4 text-[#3B82F6]" />,
        warning: <TriangleAlertIcon className="size-4 text-[#F59E0B]" />,
        error: <OctagonXIcon className="size-4 text-[#EF4444]" />,
        loading: <Loader2Icon className="size-4 animate-spin text-[#94A3B8]" />,
      }}
      toastOptions={{
        classNames: {
          toast: "group-[.toaster]:bg-[var(--normal-bg)] group-[.toaster]:text-[var(--normal-text)] group-[.toaster]:border-[var(--normal-border)] group-[.toaster]:shadow-lg rounded-xl border p-4 flex gap-3 w-full",
          title: "text-sm font-semibold text-[var(--title-color)]",
          description: "text-xs text-[var(--description-color)] leading-normal mt-0.5",
        }
      }}
      style={
        {
          "--normal-bg": isDark ? "#121824" : "#ffffff",
          "--normal-text": isDark ? "#f8fafc" : "#0f172a",
          "--normal-border": isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
          "--title-color": isDark ? "#ffffff" : "#0f172a",
          "--description-color": isDark ? "#94a3b8" : "#475569",
          
          /* Success overrides */
          "--success-bg": isDark ? "#121824" : "#ffffff",
          "--success-text": isDark ? "#10b981" : "#059669",
          
          /* Error overrides */
          "--error-bg": isDark ? "#121824" : "#ffffff",
          "--error-text": isDark ? "#ef4444" : "#dc2626",
          
          /* Warning overrides */
          "--warning-bg": isDark ? "#121824" : "#ffffff",
          "--warning-text": isDark ? "#f59e0b" : "#d97706",
          
          /* Info overrides */
          "--info-bg": isDark ? "#121824" : "#ffffff",
          "--info-text": isDark ? "#3b82f6" : "#2563eb",

          "--border-radius": "12px",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
