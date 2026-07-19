type StampVariant = "approved" | "pending" | "hidden";

const STAMP_LABEL: Record<StampVariant, string> = {
    approved: "Đã duyệt",
    pending: "Chờ duyệt",
    hidden: "Đã ẩn",
};

const STAMP_CLASS: Record<StampVariant, string> = {
  approved:"border-2 border-admin-seal text-admin-seal bg-admin-seal-light",
  pending:"border-2 border-dashed border-admin-muted text-admin-muted bg-transparent",
  hidden:"border-2 border-admin-muted text-admin-muted bg-admin-line/40 stamp-hidden",
};

export function StatusStamp({ variant }: { variant: StampVariant }) {
  return (
    <span
      className={`relative inline-flex h-10 w-24 -rotate-3 items-center justify-center rounded-md font-display text-[11px] font-semibold uppercase tracking-wide ${STAMP_CLASS[variant]}`}
    >
      {STAMP_LABEL[variant]}
    </span>
  );
}
