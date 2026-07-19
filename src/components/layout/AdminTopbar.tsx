type AdminTopbarProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export function AdminTopbar({ title, subtitle, action }: AdminTopbarProps) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <div>
        <h1 className="font-display text-2xl font-medium text-admin-ink">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[13px] text-admin-muted">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}