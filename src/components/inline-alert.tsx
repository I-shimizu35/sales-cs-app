import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type Variant = "success" | "error" | "info";

const VARIANT_CLASS: Record<Variant, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error: "border-red-200 bg-red-50 text-red-700",
  info: "border-brand-200 bg-brand-50 text-brand-800",
};

const VARIANT_ICON: Record<Variant, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

/**
 * 保存成功/エラー/案内メッセージ用の共通インラインバナー。
 * これまで各コンポーネントが同じborder/bg/textのマークアップを個別に手書きしていたため、
 * 見た目の統一と重複解消のために共通化する。
 */
export function InlineAlert({
  variant,
  children,
  onDismiss,
}: {
  variant: Variant;
  children: React.ReactNode;
  onDismiss?: () => void;
}) {
  const Icon = VARIANT_ICON[variant];
  return (
    <div
      className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm ${VARIANT_CLASS[variant]}`}
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div>{children}</div>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
