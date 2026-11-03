const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
export const CALENDAR_WEEKS = 53;

interface CalendarPost {
  data: {
    pubDate: Date | string | number;
  };
}

export interface CalendarDay {
  date: string;
  count: number;
  level: number;
  future: boolean;
}

export interface CalendarMonth {
  week: number;
  en: string;
  zh: string;
}

export interface PostCalendarData {
  weeks: CalendarDay[][];
  months: CalendarMonth[];
  totalPosts: number;
  startDate: string;
  endDate: string;
  today: string;
}

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

export function buildPostCalendar(
  posts: readonly CalendarPost[],
  referenceDate: Date = new Date()
): PostCalendarData {
  if (Number.isNaN(referenceDate.valueOf()))
    throw new RangeError('Invalid calendar reference date');

  const today = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate()
    )
  );
  const start =
    today.valueOf() - (today.getUTCDay() + (CALENDAR_WEEKS - 1) * 7) * DAY_IN_MILLISECONDS;
  const counts = new Map<string, number>();

  for (const { data } of posts) {
    const published = new Date(
      data.pubDate instanceof Date ? data.pubDate.valueOf() : data.pubDate
    );
    if (Number.isNaN(published.valueOf())) continue;
    const day = Date.UTC(
      published.getUTCFullYear(),
      published.getUTCMonth(),
      published.getUTCDate()
    );
    if (day < start || day > today.valueOf()) continue;
    const key = isoDay(published);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const weeks = Array.from({ length: CALENDAR_WEEKS }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday): CalendarDay => {
      const date = new Date(start + (week * 7 + weekday) * DAY_IN_MILLISECONDS);
      const key = isoDay(date);
      const count = counts.get(key) ?? 0;
      return {
        date: key,
        count,
        level: Math.min(4, count),
        future: date.valueOf() > today.valueOf(),
      };
    })
  );
  const months = weeks.flatMap((days, week): CalendarMonth[] => {
    const first = days.find(({ date }) => date.endsWith('-01'));
    if (!first && week !== 0) return [];
    const date = new Date(`${(first ?? days[0]).date}T00:00:00Z`);
    return [
      {
        week,
        en: new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(date),
        zh: `${date.getUTCMonth() + 1}月`,
      },
    ];
  });

  return {
    weeks,
    months,
    totalPosts: Array.from(counts.values()).reduce((total, count) => total + count, 0),
    startDate: weeks[0][0].date,
    endDate: weeks[CALENDAR_WEEKS - 1][6].date,
    today: isoDay(today),
  };
}
