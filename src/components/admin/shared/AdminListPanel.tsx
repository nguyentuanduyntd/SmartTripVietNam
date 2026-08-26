import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Plus, Search } from "lucide-react";

type AdminCreateButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function AdminCreateButton({
  children,
  className = "",
  ...props
}: AdminCreateButtonProps) {
  return (
    <button
      type="button"
      className={`flex items-center gap-1.5 rounded-md border border-admin-gold bg-admin-gold px-3 py-2 text-sm font-medium text-admin-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      <Plus size={16} strokeWidth={2} />
      {children}
    </button>
  );
}

type AdminListPanelProps = {
  loading: boolean;
  errorMessage: string | null;
  children: ReactNode;
  loadingLabel?: string;
};

export function AdminListPanel({
  loading,
  errorMessage,
  children,
  loadingLabel = "Đang tải…",
}: AdminListPanelProps) {
  return (
    <>
      {errorMessage ? (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2 rounded-md border border-admin-seal bg-admin-seal-light px-3 py-2 text-sm text-admin-seal"
        >
          <Search size={14} />
          {errorMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-admin-line bg-admin-paper-card">
        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-admin-muted">
            {loadingLabel}
          </div>
        ) : (
          children
        )}
      </div>
    </>
  );
}