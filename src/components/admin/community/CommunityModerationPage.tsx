"use client";

import Link from "next/link";
import {
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    ExternalLink,
    FileText,
    Flag,
    Loader2,
    MessageSquare,
    RefreshCcw,
    ShieldAlert,
    UserRound,
    X,
    XCircle,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { AdminTopbar } from "@/src/components/layout/AdminTopbar";
import {
    ApiRequestError,
} from "@/src/lib/api-client/http";
import {
    communityModerationApi,
    type CommunityModerationAction,
    type CommunityModerationListData,
    type CommunityModerationListStatus,
    type CommunityModerationReport,
} from "@/src/lib/api-client/community-moderation";

const PAGE_SIZE = 12;

const REASON_LABELS: Record<
    CommunityModerationReport["reason"],
    string
> = {
    spam: "Spam hoặc quảng cáo",
    harassment: "Quấy rối hoặc xúc phạm",
    hate_speech: "Ngôn từ thù ghét",
    inappropriate_content:
        "Nội dung không phù hợp",
    misinformation:
        "Thông tin sai lệch",
    other: "Lý do khác",
};

const STATUS_LABELS: Record<
    CommunityModerationReport["status"],
    string
> = {
    pending: "Chờ xử lý",
    resolved: "Đã xác nhận",
    dismissed: "Đã bác",
};

function formatDateTime(
    value: string | null,
) {
    if (!value) {
        return "—";
    }

    return new Intl.DateTimeFormat(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone:
                "Asia/Ho_Chi_Minh",
        },
    ).format(new Date(value));
}

function getInitials(
    value: string | null,
) {
    if (!value) {
        return "ST";
    }

    return value
        .trim()
        .split(/\s+/)
        .slice(-2)
        .map(
            (part) =>
                part[0]?.toUpperCase() ??
                "",
        )
        .join("");
}

function truncate(
    value: string,
    max = 260,
) {
    if (
        value.length <= max
    ) {
        return value;
    }

    return `${value.slice(
        0,
        max,
    )}…`;
}

type ActionDialogState = {
    report: CommunityModerationReport;
    action: CommunityModerationAction;
} | null;

export function CommunityModerationPage() {
    const [
        status,
        setStatus,
    ] =
        useState<CommunityModerationListStatus>(
            "pending",
        );

    const [page, setPage] =
        useState(1);

    const [data, setData] =
        useState<CommunityModerationListData | null>(
            null,
        );

    const [loading, setLoading] =
        useState(true);

    const [
        refreshing,
        setRefreshing,
    ] =
        useState(false);

    const [
        errorMessage,
        setErrorMessage,
    ] =
        useState<string | null>(
            null,
        );

    const [
        actionDialog,
        setActionDialog,
    ] =
        useState<ActionDialogState>(
            null,
        );

    const [
        reviewNote,
        setReviewNote,
    ] =
        useState("");

    const [
        processing,
        setProcessing,
    ] =
        useState(false);

    const loadReports =
        useCallback(
            async (
                options?: {
                    silent?: boolean;
                },
            ) => {
                if (
                    options?.silent
                ) {
                    setRefreshing(
                        true,
                    );
                } else {
                    setLoading(
                        true,
                    );
                }

                setErrorMessage(
                    null,
                );

                try {
                    const result =
                        await communityModerationApi.list(
                            {
                                status,
                                page,
                                pageSize:
                                    PAGE_SIZE,
                            },
                        );

                    setData(result);
                } catch (error) {
                    setErrorMessage(
                        error instanceof
                            ApiRequestError
                            ? error.message
                            : "Không tải được danh sách báo cáo",
                    );
                } finally {
                    setLoading(
                        false,
                    );
                    setRefreshing(
                        false,
                    );
                }
            },
            [page, status],
        );

    useEffect(() => {
        void loadReports();
    }, [loadReports]);

    const totalAll =
        useMemo(
            () =>
                data
                    ? data.counts
                          .pending +
                      data.counts
                          .resolved +
                      data.counts
                          .dismissed
                    : 0,
            [data],
        );

    function changeStatus(
        nextStatus:
            CommunityModerationListStatus,
    ) {
        setStatus(nextStatus);
        setPage(1);
    }

    function openAction(
        report: CommunityModerationReport,
        action: CommunityModerationAction,
    ) {
        setReviewNote("");
        setErrorMessage(null);
        setActionDialog({
            report,
            action,
        });
    }

    function closeAction() {
        if (processing) {
            return;
        }

        setActionDialog(null);
        setReviewNote("");
    }

    async function confirmAction() {
        if (!actionDialog) {
            return;
        }

        if (
            reviewNote.trim()
                .length > 1000
        ) {
            setErrorMessage(
                "Ghi chú xử lý không được vượt quá 1000 ký tự",
            );
            return;
        }

        setProcessing(true);
        setErrorMessage(null);

        try {
            await communityModerationApi.moderate(
                actionDialog.report.id,
                {
                    action:
                        actionDialog.action,
                    reviewNote:
                        reviewNote.trim() ||
                        undefined,
                },
            );

            setActionDialog(null);
            setReviewNote("");

            const currentRows =
                data?.rows.length ??
                0;

            if (
                currentRows === 1 &&
                page > 1
            ) {
                setPage(
                    (current) =>
                        Math.max(
                            1,
                            current - 1,
                        ),
                );
            } else {
                await loadReports({
                    silent: true,
                });
            }
        } catch (error) {
            setErrorMessage(
                error instanceof
                    ApiRequestError
                    ? error.message
                    : "Không thể xử lý báo cáo",
            );
        } finally {
            setProcessing(false);
        }
    }

    const rows =
        data?.rows ?? [];

    return (
        <div>
            <AdminTopbar
                title="Kiểm duyệt cộng đồng"
                subtitle="Xử lý báo cáo bài viết và bình luận từ người dùng"
                action={
                    <button
                        type="button"
                        onClick={() =>
                            void loadReports(
                                {
                                    silent: true,
                                },
                            )
                        }
                        disabled={
                            refreshing ||
                            loading
                        }
                        className="flex items-center gap-1.5 rounded-md border border-admin-line bg-admin-paper-card px-3 py-2 text-sm font-medium text-admin-ink transition hover:bg-admin-paper disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <RefreshCcw
                            size={15}
                            className={
                                refreshing
                                    ? "animate-spin"
                                    : ""
                            }
                        />
                        Làm mới
                    </button>
                }
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    label="Tất cả"
                    value={totalAll}
                    active={
                        status ===
                        "all"
                    }
                    icon={
                        ShieldAlert
                    }
                    onClick={() =>
                        changeStatus(
                            "all",
                        )
                    }
                />

                <SummaryCard
                    label="Chờ xử lý"
                    value={
                        data?.counts
                            .pending ??
                        0
                    }
                    active={
                        status ===
                        "pending"
                    }
                    icon={Clock3}
                    onClick={() =>
                        changeStatus(
                            "pending",
                        )
                    }
                />

                <SummaryCard
                    label="Đã xác nhận"
                    value={
                        data?.counts
                            .resolved ??
                        0
                    }
                    active={
                        status ===
                        "resolved"
                    }
                    icon={
                        CheckCircle2
                    }
                    onClick={() =>
                        changeStatus(
                            "resolved",
                        )
                    }
                />

                <SummaryCard
                    label="Đã bác"
                    value={
                        data?.counts
                            .dismissed ??
                        0
                    }
                    active={
                        status ===
                        "dismissed"
                    }
                    icon={XCircle}
                    onClick={() =>
                        changeStatus(
                            "dismissed",
                        )
                    }
                />
            </div>

            {errorMessage ? (
                <div className="mt-4 flex items-start gap-2 rounded-md border border-admin-seal bg-admin-seal-light px-3 py-2 text-sm text-admin-seal">
                    <ShieldAlert
                        size={16}
                        className="mt-0.5 shrink-0"
                    />
                    <span>
                        {errorMessage}
                    </span>
                </div>
            ) : null}

            <div className="mt-5 overflow-hidden rounded-lg border border-admin-line bg-admin-paper-card">
                <div className="flex items-center justify-between gap-4 border-b border-admin-line px-4 py-3">
                    <div>
                        <p className="text-sm font-medium text-admin-ink">
                            {
                                STATUS_LABELS_FOR_FILTER[
                                    status
                                ]
                            }
                        </p>
                        <p className="mt-0.5 text-xs text-admin-muted">
                            {data?.total ??
                                0}{" "}
                            báo cáo
                        </p>
                    </div>

                    {data &&
                    data.pageCount >
                        1 ? (
                        <p className="font-mono text-[11px] text-admin-muted">
                            Trang{" "}
                            {
                                data.page
                            }
                            /
                            {
                                data.pageCount
                            }
                        </p>
                    ) : null}
                </div>

                {loading ? (
                    <div className="grid min-h-[320px] place-items-center px-4 py-10">
                        <div className="text-center text-sm text-admin-muted">
                            <Loader2
                                size={24}
                                className="mx-auto mb-3 animate-spin"
                            />
                            Đang tải báo cáo…
                        </div>
                    </div>
                ) : rows.length ===
                  0 ? (
                    <div className="grid min-h-[280px] place-items-center px-6 py-10 text-center">
                        <div>
                            <ShieldAlert
                                size={34}
                                className="mx-auto text-admin-muted"
                            />
                            <p className="mt-3 text-sm font-medium text-admin-ink">
                                Không có báo
                                cáo
                            </p>
                            <p className="mt-1 text-xs text-admin-muted">
                                Không có
                                báo cáo
                                phù hợp với
                                trạng thái
                                đang chọn.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-admin-line">
                        {rows.map(
                            (report) => (
                                <ReportRow
                                    key={
                                        report.id
                                    }
                                    report={
                                        report
                                    }
                                    onResolve={() =>
                                        openAction(
                                            report,
                                            "resolve",
                                        )
                                    }
                                    onDismiss={() =>
                                        openAction(
                                            report,
                                            "dismiss",
                                        )
                                    }
                                />
                            ),
                        )}
                    </div>
                )}
            </div>

            {data &&
            data.pageCount > 1 ? (
                <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={() =>
                            setPage(
                                (current) =>
                                    Math.max(
                                        1,
                                        current -
                                            1,
                                    ),
                            )
                        }
                        disabled={
                            data.page <= 1 ||
                            loading
                        }
                        className="grid h-9 w-9 place-items-center rounded-md border border-admin-line bg-admin-paper-card text-admin-ink transition hover:bg-admin-paper disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Trang trước"
                    >
                        <ChevronLeft
                            size={16}
                        />
                    </button>

                    <span className="min-w-20 text-center font-mono text-xs text-admin-muted">
                        {data.page} /{" "}
                        {
                            data.pageCount
                        }
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            setPage(
                                (current) =>
                                    Math.min(
                                        data.pageCount,
                                        current +
                                            1,
                                    ),
                            )
                        }
                        disabled={
                            data.page >=
                                data.pageCount ||
                            loading
                        }
                        className="grid h-9 w-9 place-items-center rounded-md border border-admin-line bg-admin-paper-card text-admin-ink transition hover:bg-admin-paper disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Trang sau"
                    >
                        <ChevronRight
                            size={16}
                        />
                    </button>
                </div>
            ) : null}

            <ModerationActionDialog
                state={actionDialog}
                reviewNote={reviewNote}
                processing={processing}
                onReviewNoteChange={
                    setReviewNote
                }
                onClose={closeAction}
                onConfirm={() =>
                    void confirmAction()
                }
            />
        </div>
    );
}

const STATUS_LABELS_FOR_FILTER: Record<
    CommunityModerationListStatus,
    string
> = {
    all: "Tất cả báo cáo",
    pending:
        "Báo cáo đang chờ xử lý",
    resolved:
        "Báo cáo đã xác nhận vi phạm",
    dismissed:
        "Báo cáo đã bị bác",
};

function SummaryCard({
    label,
    value,
    active,
    icon: Icon,
    onClick,
}: {
    label: string;
    value: number;
    active: boolean;
    icon: typeof ShieldAlert;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-lg border px-4 py-4 text-left transition ${
                active
                    ? "border-admin-gold bg-admin-gold/10"
                    : "border-admin-line bg-admin-paper-card hover:border-admin-gold/60"
            }`}
        >
            <div className="flex items-center justify-between gap-3">
                <span
                    className={`grid h-9 w-9 place-items-center rounded-md ${
                        active
                            ? "bg-admin-gold/20 text-admin-ink"
                            : "bg-admin-paper text-admin-muted"
                    }`}
                >
                    <Icon
                        size={17}
                        strokeWidth={
                            1.75
                        }
                    />
                </span>

                <span className="font-display text-2xl font-medium text-admin-ink">
                    {value}
                </span>
            </div>

            <p className="mt-3 text-xs font-medium text-admin-muted">
                {label}
            </p>
        </button>
    );
}

function ReportRow({
    report,
    onResolve,
    onDismiss,
}: {
    report: CommunityModerationReport;
    onResolve: () => void;
    onDismiss: () => void;
}) {
    const target =
        report.target;

    const targetHref =
        target
            ? target.type ===
              "post"
                ? `/community/${target.postId}`
                : `/community/${target.postId}#comments`
            : null;

    const targetLabel =
        target?.type ===
        "comment"
            ? "Bình luận"
            : "Bài viết";

    const TargetIcon =
        target?.type ===
        "comment"
            ? MessageSquare
            : FileText;

    return (
        <div className="px-4 py-5 sm:px-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                            status={
                                report.status
                            }
                        />

                        <span className="inline-flex items-center gap-1 rounded-full bg-admin-seal-light px-2.5 py-1 text-[11px] font-medium text-admin-seal">
                            <Flag
                                size={12}
                            />
                            {
                                REASON_LABELS[
                                    report
                                        .reason
                                ]
                            }
                        </span>

                        <span className="font-mono text-[11px] text-admin-muted">
                            {formatDateTime(
                                report.createdAt,
                            )}
                        </span>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
                        <div className="rounded-md bg-admin-paper px-3 py-3">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-admin-muted">
                                Người báo cáo
                            </p>

                            <ProfileLine
                                profile={
                                    report.reporter
                                }
                            />
                        </div>

                        <div className="min-w-0 rounded-md border border-admin-line bg-white px-4 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <TargetIcon
                                        size={
                                            15
                                        }
                                        className="text-admin-muted"
                                    />
                                    <span className="text-xs font-medium text-admin-muted">
                                        {
                                            targetLabel
                                        }
                                    </span>
                                </div>

                                {targetHref ? (
                                    <Link
                                        href={
                                            targetHref
                                        }
                                        target="_blank"
                                        className="inline-flex items-center gap-1 text-xs font-medium text-admin-moss hover:underline"
                                    >
                                        Xem nội
                                        dung
                                        <ExternalLink
                                            size={
                                                12
                                            }
                                        />
                                    </Link>
                                ) : null}
                            </div>

                            {target ? (
                                <>
                                    {target.title ? (
                                        <p className="mt-3 font-display text-lg font-medium text-admin-ink">
                                            {
                                                target.title
                                            }
                                        </p>
                                    ) : null}

                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-admin-ink/80">
                                        {truncate(
                                            target.content,
                                        )}
                                    </p>

                                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-admin-muted">
                                        <span className="inline-flex items-center gap-1">
                                            <UserRound
                                                size={
                                                    13
                                                }
                                            />
                                            Tác
                                            giả:{" "}
                                            {target
                                                .author
                                                ?.fullName ??
                                                "Không xác định"}
                                        </span>

                                        <span>
                                            Trạng
                                            thái:{" "}
                                            <strong className="font-medium text-admin-ink">
                                                {
                                                    target.status
                                                }
                                            </strong>
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <p className="mt-3 text-sm text-admin-seal">
                                    Nội dung
                                    gốc không
                                    còn tồn
                                    tại.
                                </p>
                            )}
                        </div>
                    </div>

                    {report.details ? (
                        <div className="mt-4 rounded-md border-l-2 border-admin-gold bg-admin-gold/5 px-4 py-3">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-admin-muted">
                                Chi tiết
                                từ người
                                báo cáo
                            </p>

                            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-admin-ink/80">
                                {
                                    report.details
                                }
                            </p>
                        </div>
                    ) : null}

                    {report.status !==
                    "pending" ? (
                        <div className="mt-4 rounded-md bg-admin-paper px-4 py-3 text-xs text-admin-muted">
                            <p>
                                Xử lý bởi{" "}
                                <strong className="font-medium text-admin-ink">
                                    {report
                                        .reviewer
                                        ?.fullName ??
                                        "Quản trị viên"}
                                </strong>
                                {" · "}
                                {formatDateTime(
                                    report.reviewedAt,
                                )}
                            </p>

                            {report.reviewNote ? (
                                <p className="mt-1.5 whitespace-pre-wrap leading-5">
                                    Ghi chú:{" "}
                                    {
                                        report.reviewNote
                                    }
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                {report.status ===
                "pending" ? (
                    <div className="flex shrink-0 flex-row gap-2 xl:w-36 xl:flex-col">
                        <button
                            type="button"
                            onClick={
                                onResolve
                            }
                            disabled={
                                !target
                            }
                            className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-md border border-admin-seal bg-admin-seal px-3 py-2 text-xs font-medium text-admin-seal-light transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ShieldAlert
                                size={
                                    14
                                }
                            />
                            Ẩn nội
                            dung
                        </button>

                        <button
                            type="button"
                            onClick={
                                onDismiss
                            }
                            className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-md border border-admin-line bg-white px-3 py-2 text-xs font-medium text-admin-ink transition hover:bg-admin-paper"
                        >
                            <XCircle
                                size={
                                    14
                                }
                            />
                            Bác báo
                            cáo
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function ProfileLine({
    profile,
}: {
    profile: {
        id: string;
        fullName: string | null;
        avatarUrl: string | null;
    };
}) {
    return (
        <div className="mt-2 flex items-center gap-2">
            {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={
                        profile.avatarUrl
                    }
                    alt={
                        profile.fullName ??
                        "Thành viên"
                    }
                    className="h-8 w-8 rounded-full object-cover"
                />
            ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-admin-moss-light text-[10px] font-medium text-admin-moss">
                    {getInitials(
                        profile.fullName,
                    )}
                </span>
            )}

            <span className="min-w-0 truncate text-xs font-medium text-admin-ink">
                {profile.fullName ??
                    "Thành viên SmartTrip"}
            </span>
        </div>
    );
}

function StatusBadge({
    status,
}: {
    status: CommunityModerationReport["status"];
}) {
    const classes =
        status === "pending"
            ? "bg-admin-gold/15 text-admin-ink"
            : status ===
                "resolved"
              ? "bg-admin-moss-light text-admin-moss"
              : "bg-admin-paper text-admin-muted";

    return (
        <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${classes}`}
        >
            {
                STATUS_LABELS[
                    status
                ]
            }
        </span>
    );
}

function ModerationActionDialog({
    state,
    reviewNote,
    processing,
    onReviewNoteChange,
    onClose,
    onConfirm,
}: {
    state: ActionDialogState;
    reviewNote: string;
    processing: boolean;
    onReviewNoteChange: (
        value: string,
    ) => void;
    onClose: () => void;
    onConfirm: () => void;
}) {
    if (!state) {
        return null;
    }

    const resolving =
        state.action ===
        "resolve";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-admin-ink/40 px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="moderation-dialog-title"
        >
            <div className="w-full max-w-md rounded-lg border border-admin-line bg-admin-paper-card p-5 shadow-xl">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <span
                            className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                                resolving
                                    ? "bg-admin-seal-light text-admin-seal"
                                    : "bg-admin-paper text-admin-muted"
                            }`}
                        >
                            {resolving ? (
                                <ShieldAlert
                                    size={
                                        18
                                    }
                                />
                            ) : (
                                <XCircle
                                    size={
                                        18
                                    }
                                />
                            )}
                        </span>

                        <div>
                            <h2
                                id="moderation-dialog-title"
                                className="font-display text-base font-medium text-admin-ink"
                            >
                                {resolving
                                    ? "Xác nhận vi phạm?"
                                    : "Bác báo cáo này?"}
                            </h2>

                            <p className="mt-1 text-sm leading-5 text-admin-muted">
                                {resolving
                                    ? "Nội dung sẽ bị ẩn và tất cả báo cáo đang chờ của cùng nội dung sẽ được đóng."
                                    : "Nội dung vẫn được giữ nguyên. Chỉ báo cáo này được đánh dấu là đã bác."}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={
                            processing
                        }
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-admin-muted transition hover:bg-admin-paper disabled:opacity-50"
                        aria-label="Đóng"
                    >
                        <X
                            size={16}
                        />
                    </button>
                </div>

                <label className="mt-5 block">
                    <span className="flex items-center justify-between gap-3 text-xs font-medium text-admin-ink">
                        <span>
                            Ghi chú
                            quản trị
                            (không bắt
                            buộc)
                        </span>

                        <span
                            className={
                                reviewNote.length >
                                1000
                                    ? "font-mono text-admin-seal"
                                    : "font-mono text-admin-muted"
                            }
                        >
                            {
                                reviewNote.length
                            }
                            /1000
                        </span>
                    </span>

                    <textarea
                        rows={4}
                        value={
                            reviewNote
                        }
                        onChange={(
                            event,
                        ) =>
                            onReviewNoteChange(
                                event
                                    .target
                                    .value,
                            )
                        }
                        disabled={
                            processing
                        }
                        maxLength={
                            1100
                        }
                        placeholder="Ghi lại lý do xử lý để tiện theo dõi sau này…"
                        className="mt-2 w-full resize-y rounded-md border border-admin-line bg-white px-3 py-2.5 text-sm leading-6 text-admin-ink outline-none transition focus:border-admin-gold disabled:cursor-not-allowed disabled:bg-admin-paper"
                    />
                </label>

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={
                            processing
                        }
                        className="rounded-md border border-admin-line px-3 py-2 text-sm font-medium text-admin-ink transition hover:bg-admin-paper disabled:opacity-50"
                    >
                        Hủy
                    </button>

                    <button
                        type="button"
                        onClick={
                            onConfirm
                        }
                        disabled={
                            processing ||
                            reviewNote.length >
                                1000
                        }
                        className={`inline-flex min-w-28 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            resolving
                                ? "border-admin-seal bg-admin-seal text-admin-seal-light hover:opacity-90"
                                : "border-admin-line bg-admin-paper-card text-admin-ink hover:bg-admin-paper"
                        }`}
                    >
                        {processing ? (
                            <Loader2
                                size={
                                    15
                                }
                                className="animate-spin"
                            />
                        ) : resolving ? (
                            <ShieldAlert
                                size={
                                    15
                                }
                            />
                        ) : (
                            <XCircle
                                size={
                                    15
                                }
                            />
                        )}

                        {processing
                            ? "Đang xử lý…"
                            : resolving
                              ? "Ẩn nội dung"
                              : "Bác báo cáo"}
                    </button>
                </div>
            </div>
        </div>
    );
}