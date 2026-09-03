const LONDON_TIME_ZONE = "Europe/London";
const OFFSETLESS_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;

export function parseReleaseDate(value: unknown): Date | null {
    if (value == null || value === "") {
        return null;
    }

    if (value instanceof Date) {
        return value;
    }

    if (typeof value === "number") {
        return new Date(value);
    }

    if (typeof value !== "string") {
        return new Date(String(value));
    }

    const offsetlessMatch = value.match(OFFSETLESS_DATE_TIME_PATTERN);
    if (!offsetlessMatch) {
        return new Date(value);
    }

    const [, year, month, day, hour, minute, second = "0", millisecond = "0"] = offsetlessMatch;
    return fromZonedTime({
        year: Number(year),
        month: Number(month),
        day: Number(day),
        hour: Number(hour),
        minute: Number(minute),
        second: Number(second),
        millisecond: Number(millisecond.padEnd(3, "0")),
    }, LONDON_TIME_ZONE);
}

function fromZonedTime(
    parts: { year: number; month: number; day: number; hour: number; minute: number; second: number; millisecond: number },
    timeZone: string,
) {
    const utcFromWallClock = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second,
        parts.millisecond,
    );
    const firstOffset = getTimeZoneOffsetMinutes(new Date(utcFromWallClock), timeZone);
    const firstUtc = utcFromWallClock - firstOffset * 60_000;
    const finalOffset = getTimeZoneOffsetMinutes(new Date(firstUtc), timeZone);

    return new Date(utcFromWallClock - finalOffset * 60_000);
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        timeZoneName: "shortOffset",
    }).formatToParts(date);
    const timeZoneName = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
    const match = timeZoneName.match(/^GMT(?:(?<sign>[+-])(?<hours>\d{1,2})(?::(?<minutes>\d{2}))?)?$/);

    if (!match?.groups) {
        return 0;
    }

    const sign = match.groups.sign === "-" ? -1 : 1;
    const hours = Number(match.groups.hours ?? 0);
    const minutes = Number(match.groups.minutes ?? 0);

    return sign * (hours * 60 + minutes);
}
