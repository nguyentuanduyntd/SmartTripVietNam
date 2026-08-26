"use client";

import {
    ArrowDownRight,
    ArrowUpRight,
    BookImage,
    Flag,
    Loader2,
    MapPin,
    Minus,
    RefreshCcw,
    Utensils,
    UserPlus,
    UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminTopbar } from "@/src/components/layout/AdminTopbar";
import {
    adminStatsApi,
    type AdminStatsData,
    type MonthlyComparison,
} from "@/src/lib/api-client/admin-stats";
import { ApiRequestError } from "@/src/lib/api-client/http";

function currentMonthValue() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
    }).format(new Date());
}

function monthLabel(month: string) {
    const [year, monthNumber] = month.split("-");
    return `tháng ${Number(monthNumber)}/${year}`;
}

function Trend({ comparison }: { comparison: MonthlyComparison }) {
    const value = comparison.changePercent;
    const positive = value > 0;
    const negative = value < 0;
    const Icon = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus;

    return (
        <span
            className={`inline-flex items-center gap-1 text-xs font-medium ${
                positive
                    ? "text-admin-moss"
                    : negative
                      ? "text-admin-seal"
                      : "text-admin-muted"
            }`}
        >
            <Icon size={14} />
            {Math.abs(value).toLocaleString("vi-VN")}% so với tháng trước
        </span>
    );
}

function MetricCard({
    label,
    value,
    helper,
    comparison,
    icon: Icon,
}: {
    label: string;
    value: number;
    helper: string;
    comparison: MonthlyComparison;
    icon: typeof MapPin;
}) {
    return (
        <article className="rounded-xl border border-admin-line bg-admin-paper-card p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-admin-muted">
                        {label}
                    </p>
                    <p className="mt-2 font-display text-4xl font-semibold text-admin-ink">
                        {value.toLocaleString("vi-VN")}
                    </p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-admin-gold-light text-[#8a6428]">
                    <Icon size={20} />
                </span>
            </div>
            <p className="mt-3 text-xs text-admin-muted">
                {helper}: <strong className="text-admin-ink">{comparison.current}</strong>
            </p>
            <div className="mt-1.5">
                <Trend comparison={comparison} />
            </div>
        </article>
    );
}

function LineChart({
    data,
    color,
    emptyLabel,
}: {
    data: Array<{ day: number; value: number }>;
    color: string;
    emptyLabel: string;
}) {
    const width = 720;
    const height = 230;
    const padding = { top: 20, right: 18, bottom: 34, left: 42 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const maxValue = Math.max(1, ...data.map((item) => item.value));
    const hasData = data.some((item) => item.value > 0);
    const points = data.map((item, index) => ({
        ...item,
        x:
            padding.left +
            (data.length <= 1 ? 0 : (index / (data.length - 1)) * chartWidth),
        y: padding.top + chartHeight - (item.value / maxValue) * chartHeight,
    }));
    const path = points
        .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
        .join(" ");

    return (
        <div className="relative overflow-x-auto">
            {!hasData ? (
                <div className="absolute inset-0 grid place-items-center text-sm text-admin-muted">
                    {emptyLabel}
                </div>
            ) : null}
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className={`min-w-[620px] ${hasData ? "" : "opacity-35"}`}
                role="img"
                aria-label={emptyLabel}
            >
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = padding.top + chartHeight - ratio * chartHeight;
                    return (
                        <g key={ratio}>
                            <line
                                x1={padding.left}
                                y1={y}
                                x2={width - padding.right}
                                y2={y}
                                stroke="#d9d3c4"
                                strokeDasharray="4 5"
                            />
                            <text
                                x={padding.left - 8}
                                y={y + 4}
                                textAnchor="end"
                                fontSize="10"
                                fill="#8a8575"
                            >
                                {Math.round(maxValue * ratio)}
                            </text>
                        </g>
                    );
                })}
                <path
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                {points.map((point, index) => (
                    <g key={point.day}>
                        {point.value > 0 ? (
                            <circle cx={point.x} cy={point.y} r="4" fill={color}>
                                <title>{`Ngày ${point.day}: ${point.value}`}</title>
                            </circle>
                        ) : null}
                        {(index === 0 || point.day % 5 === 0 || index === points.length - 1) ? (
                            <text
                                x={point.x}
                                y={height - 10}
                                textAnchor="middle"
                                fontSize="10"
                                fill="#8a8575"
                            >
                                {point.day}
                            </text>
                        ) : null}
                    </g>
                ))}
            </svg>
        </div>
    );
}

function RankedBars({
    rows,
}: {
    rows: Array<{ id: string; name: string; mentions: number }>;
}) {
    const max = Math.max(1, ...rows.map((row) => row.mentions));

    if (!rows.length) {
        return (
            <div className="grid min-h-56 place-items-center text-sm text-admin-muted">
                Chưa có địa danh nào được nhắc trong tháng này.
            </div>
        );
    }

    return (
        <div className="space-y-4 py-2">
            {rows.map((row, index) => (
                <div key={row.id}>
                    <div className="mb-1.5 flex justify-between gap-3 text-sm">
                        <span className="truncate font-medium text-admin-ink">
                            {index + 1}. {row.name}
                        </span>
                        <span className="shrink-0 text-xs text-admin-muted">
                            {row.mentions} lượt nhắc
                        </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-admin-paper">
                        <div
                            className="h-full rounded-full bg-admin-gold"
                            style={{ width: `${(row.mentions / max) * 100}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function AdminStatsPage() {
    const [month, setMonth] = useState(currentMonthValue);
    const [data, setData] = useState<AdminStatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const loadStats = useCallback(
        async (silent = false) => {
            if (silent) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setErrorMessage(null);

            try {
                setData(await adminStatsApi.get(month));
            } catch (error) {
                setErrorMessage(
                    error instanceof ApiRequestError
                        ? error.message
                        : "Không thể tải dữ liệu thống kê",
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [month],
    );

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadStats();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [loadStats]);

    const statusValues = useMemo(() => {
        const labels = {
            pending: "Chờ duyệt",
            approved: "Đã duyệt",
            hidden: "Đã ẩn",
        } as const;
        const colors = {
            pending: "bg-admin-gold",
            approved: "bg-admin-moss",
            hidden: "bg-admin-seal",
        } as const;

        return (data?.statusDistribution ?? []).map((item) => ({
            ...item,
            label: labels[item.status],
            color: colors[item.status],
        }));
    }, [data]);

    const statusTotal = statusValues.reduce((sum, item) => sum + item.value, 0);

    return (
        <div>
            <AdminTopbar
                title="Thống kê hệ thống"
                subtitle={data ? `Tổng quan ${monthLabel(data.month)} và so sánh với ${monthLabel(data.previousMonth)}` : "Theo dõi nội dung và mức độ tham gia của cộng đồng"}
                action={
                    <div className="flex items-center gap-2">
                        <input
                            type="month"
                            value={month}
                            max={currentMonthValue()}
                            onChange={(event) => setMonth(event.target.value)}
                            className="rounded-md border border-admin-line bg-admin-paper-card px-3 py-2 text-sm text-admin-ink outline-none focus:border-admin-gold"
                        />
                        <button
                            type="button"
                            onClick={() => void loadStats(true)}
                            disabled={loading || refreshing}
                            className="rounded-md border border-admin-line bg-admin-paper-card p-2.5 text-admin-ink disabled:opacity-50"
                            aria-label="Làm mới thống kê"
                        >
                            <RefreshCcw size={16} className={refreshing ? "animate-spin" : ""} />
                        </button>
                    </div>
                }
            />

            {errorMessage ? (
                <div className="mb-5 rounded-md border border-admin-seal bg-admin-seal-light px-4 py-3 text-sm text-admin-seal">
                    {errorMessage}
                </div>
            ) : null}

            {loading || !data ? (
                <div className="grid min-h-[520px] place-items-center rounded-xl border border-admin-line bg-admin-paper-card text-sm text-admin-muted">
                    <div className="text-center">
                        <Loader2 size={28} className="mx-auto mb-3 animate-spin" />
                        Đang tổng hợp dữ liệu…
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        <MetricCard
                            label="Tổng địa danh"
                            value={data.totals.destinations}
                            helper="Thêm trong tháng"
                            comparison={data.monthly.destinations}
                            icon={MapPin}
                        />
                        <MetricCard
                            label="Tổng món ăn"
                            value={data.totals.cuisines}
                            helper="Thêm trong tháng"
                            comparison={data.monthly.cuisines}
                            icon={Utensils}
                        />
                        <MetricCard
                            label="Tổng Story"
                            value={data.totals.stories}
                            helper="Đăng trong tháng"
                            comparison={data.monthly.stories}
                            icon={BookImage}
                        />
                        <MetricCard
                            label="User đăng ký mới"
                            value={data.monthly.users.current}
                            helper={`Tổng hệ thống ${data.totals.users}`}
                            comparison={data.monthly.users}
                            icon={UserPlus}
                        />
                        <MetricCard
                            label="Tác giả hoạt động"
                            value={data.monthly.activeAuthors.current}
                            helper="User có đăng Story"
                            comparison={data.monthly.activeAuthors}
                            icon={UsersRound}
                        />
                    </div>

                    <div className="mt-5 grid gap-5 xl:grid-cols-2">
                        <section className="rounded-xl border border-admin-line bg-admin-paper-card p-5">
                            <div className="mb-4">
                                <h2 className="font-display text-xl font-semibold text-admin-ink">Tài khoản đăng ký theo ngày</h2>
                                <p className="mt-1 text-xs text-admin-muted">{data.monthly.users.current} tài khoản mới trong {monthLabel(data.month)}</p>
                            </div>
                            <LineChart data={data.timelines.users} color="#4f6d5a" emptyLabel="Chưa có tài khoản mới trong tháng này" />
                        </section>

                        <section className="rounded-xl border border-admin-line bg-admin-paper-card p-5">
                            <div className="mb-4">
                                <h2 className="font-display text-xl font-semibold text-admin-ink">Story đăng theo ngày</h2>
                                <p className="mt-1 text-xs text-admin-muted">{data.monthly.stories.current} story được đăng trong {monthLabel(data.month)}</p>
                            </div>
                            <LineChart data={data.timelines.stories} color="#b98b3e" emptyLabel="Chưa có story mới trong tháng này" />
                        </section>
                    </div>

                    <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr_0.85fr]">
                        <section className="rounded-xl border border-admin-line bg-admin-paper-card p-5">
                            <h2 className="font-display text-xl font-semibold text-admin-ink">Top 5 địa danh</h2>
                            <p className="mt-1 text-xs text-admin-muted">Được gắn hoặc nhắc nhiều nhất trong Story tháng này</p>
                            <div className="mt-5">
                                <RankedBars rows={data.topDestinations} />
                            </div>
                        </section>

                        <section className="rounded-xl border border-admin-line bg-admin-paper-card p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="font-display text-xl font-semibold text-admin-ink">Story bị báo cáo nhiều</h2>
                                    <p className="mt-1 text-xs text-admin-muted">Xếp theo báo cáo phát sinh trong tháng</p>
                                </div>
                                <Flag size={19} className="text-admin-seal" />
                            </div>
                            {!data.mostReportedStories.length ? (
                                <div className="grid min-h-56 place-items-center text-sm text-admin-muted">Không có báo cáo Story trong tháng này.</div>
                            ) : (
                                <ol className="mt-5 divide-y divide-admin-line">
                                    {data.mostReportedStories.map((story, index) => (
                                        <li key={story.id} className="flex items-center gap-3 py-3">
                                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-admin-seal-light text-xs font-semibold text-admin-seal">{index + 1}</span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-admin-ink">{story.title || "Story không có tiêu đề"}</p>
                                                <p className="mt-0.5 truncate text-xs text-admin-muted">{story.authorName || "Người dùng"}</p>
                                            </div>
                                            <span className="shrink-0 text-xs font-semibold text-admin-seal">{story.reports} báo cáo</span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </section>

                        <section className="rounded-xl border border-admin-line bg-admin-paper-card p-5">
                            <h2 className="font-display text-xl font-semibold text-admin-ink">Trạng thái Story</h2>
                            <p className="mt-1 text-xs text-admin-muted">Phân bổ trên toàn hệ thống</p>
                            <div className="mt-7 flex h-4 overflow-hidden rounded-full bg-admin-paper">
                                {statusValues.map((item) => (
                                    <div
                                        key={item.status}
                                        className={item.color}
                                        style={{ width: `${statusTotal ? (item.value / statusTotal) * 100 : 0}%` }}
                                        title={`${item.label}: ${item.value}`}
                                    />
                                ))}
                            </div>
                            <div className="mt-6 space-y-3">
                                {statusValues.map((item) => (
                                    <div key={item.status} className="flex items-center justify-between text-sm">
                                        <span className="inline-flex items-center gap-2 text-admin-muted">
                                            <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                                            {item.label}
                                        </span>
                                        <strong className="text-admin-ink">{item.value}</strong>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </>
            )}
        </div>
    );
}
