

import { getAdminStatsData } from "@/src/repositories/admin-stats.repository";

const VIETNAM_TIME_ZONE_OFFSET = "+07:00";

function toMonthString(date: Date) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
    }).format(date);
}

function getMonthParts(month: string) {
    const [yearValue, monthValue] = month.split("-");
    return {
        year: Number(yearValue),
        month: Number(monthValue),
    };
}

function shiftMonth(month: string, amount: number) {
    const { year, month: monthNumber } = getMonthParts(month);
    const shifted = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));

    return `${shifted.getUTCFullYear()}-${String(
        shifted.getUTCMonth() + 1,
    ).padStart(2, "0")}`;
}

function getMonthRange(month: string) {
    const nextMonth = shiftMonth(month, 1);

    return {
        start: new Date(`${month}-01T00:00:00${VIETNAM_TIME_ZONE_OFFSET}`),
        end: new Date(`${nextMonth}-01T00:00:00${VIETNAM_TIME_ZONE_OFFSET}`),
    };
}

function percentChange(current: number, previous: number) {
    if (previous === 0) {
        return current === 0 ? 0 : 100;
    }

    return Math.round(((current - previous) / previous) * 1000) / 10;
}

function fillTimeline(
    month: string,
    rows: Array<{ day: string; value: number }>,
) {
    const { year, month: monthNumber } = getMonthParts(month);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const valueByDay = new Map(rows.map((row) => [row.day, row.value]));

    return Array.from({ length: daysInMonth }, (_, index) => {
        const dayNumber = index + 1;
        const date = `${month}-${String(dayNumber).padStart(2, "0")}`;

        return {
            date,
            day: dayNumber,
            value: valueByDay.get(date) ?? 0,
        };
    });
}

export async function getAdminStats(monthInput?: string) {
    const month = monthInput ?? toMonthString(new Date());
    const previousMonth = shiftMonth(month, -1);
    const currentRange = getMonthRange(month);
    const previousRange = getMonthRange(previousMonth);
    const data = await getAdminStatsData(currentRange, previousRange);

    return {
        month,
        previousMonth,
        totals: data.totals,
        monthly: {
            destinations: {
                ...data.monthly.destinations,
                changePercent: percentChange(
                    data.monthly.destinations.current,
                    data.monthly.destinations.previous,
                ),
            },
            cuisines: {
                ...data.monthly.cuisines,
                changePercent: percentChange(
                    data.monthly.cuisines.current,
                    data.monthly.cuisines.previous,
                ),
            },
            stories: {
                ...data.monthly.stories,
                changePercent: percentChange(
                    data.monthly.stories.current,
                    data.monthly.stories.previous,
                ),
            },
            users: {
                ...data.monthly.users,
                changePercent: percentChange(
                    data.monthly.users.current,
                    data.monthly.users.previous,
                ),
            },
            activeAuthors: {
                ...data.monthly.activeAuthors,
                changePercent: percentChange(
                    data.monthly.activeAuthors.current,
                    data.monthly.activeAuthors.previous,
                ),
            },
        },
        timelines: {
            users: fillTimeline(month, data.timelines.users),
            stories: fillTimeline(month, data.timelines.stories),
        },
        topDestinations: data.topDestinations,
        mostReportedStories: data.mostReportedStories,
        statusDistribution: data.statusDistribution,
    };
}
