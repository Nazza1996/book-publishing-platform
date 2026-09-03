const RELEASE_TIME_ZONE = "Europe/London";

export function toReleaseIsoString(date: string, time: string) {
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = (time || "10:00").split(":").map(Number);

    return fromZonedTime({
        year,
        month,
        day,
        hour,
        minute,
        second: 0,
        millisecond: 0,
    }, RELEASE_TIME_ZONE).toISOString();
}

export function formatReleaseDate(dateString: string) {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        timeZone: RELEASE_TIME_ZONE,
    }).format(new Date(dateString));
}

export function formatReleaseDateTitle(dateString: string) {
    return new Intl.DateTimeFormat("en-GB", {
        month: "long",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
        timeZone: RELEASE_TIME_ZONE,
    }).format(new Date(dateString));
}

export function formatReleaseTime(dateString: string | null) {
    if (!dateString) {
        return "No time";
    }

    return new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: RELEASE_TIME_ZONE,
    }).format(new Date(dateString));
}

export function formatReleaseDay(dateString: string | null) {
    if (!dateString) {
        return "--";
    }

    return new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        timeZone: RELEASE_TIME_ZONE,
    }).format(new Date(dateString));
}

export function formatReleaseMonth(dateString: string | null) {
    if (!dateString) {
        return "";
    }

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        timeZone: RELEASE_TIME_ZONE,
    }).format(new Date(dateString));
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
