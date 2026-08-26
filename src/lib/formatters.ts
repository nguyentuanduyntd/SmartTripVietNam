type NumericValue = string | number | null | undefined;
type DateValue = string | Date | null | undefined;

const VND_FORMATTER = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

const UTC_DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
});

export function toFiniteNumber(value: NumericValue): number | null {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && !value.trim())
  ) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function formatVnd(value: NumericValue, fallback = "—") {
  const numberValue = toFiniteNumber(value);
  return numberValue === null ? fallback : VND_FORMATTER.format(numberValue);
}

export function formatOptionalVnd(value: NumericValue) {
  const numberValue = toFiniteNumber(value);
  return numberValue === null ? null : VND_FORMATTER.format(numberValue);
}

export function formatQuantity(
  value: NumericValue,
  fallback = "0",
  maximumFractionDigits = 2,
) {
  const numberValue = toFiniteNumber(value);

  if (numberValue === null) {
    return fallback;
  }

  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits,
  }).format(numberValue);
}

export function formatVietnameseDate(value: DateValue, fallback = "—") {
  if (!value) {
    return fallback;
  }

  if (typeof value === "string") {
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      return UTC_DATE_FORMATTER.format(date);
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : DATE_FORMATTER.format(date);
}

export function formatVietnameseDateTime(
  value: DateValue,
  fallback = "—",
) {
  if (!value) {
    return fallback;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : DATE_TIME_FORMATTER.format(date);
}

export function formatRelativeTime(value: DateValue, now = Date.now()) {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const minutes = Math.max(0, Math.floor((now - date.getTime()) / 60_000));

  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;

  return formatVietnameseDate(date);
}

export function formatDuration(days: number, nights: number) {
  return nights > 0 ? `${days} ngày ${nights} đêm` : `${days} ngày`;
}

export function formatTime(value: string | null | undefined) {
  return value ? value.slice(0, 5) : null;
}