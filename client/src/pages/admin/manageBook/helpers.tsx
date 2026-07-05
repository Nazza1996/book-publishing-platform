import { bookStatusLabels, readerGroups } from "./constants";
import type { BookEditorState, BookStatus, ChapterRelease, ChannelMetadata, ReaderChannel, ReaderFeedbackItem, ReaderGroup, ReaderGroupMember } from "./types";

export function isFeedbackRead(status: ReaderFeedbackItem["status"]) {
    return status === "reviewed" || status === "resolved";
}

export function feedbackReadLabel(status: ReaderFeedbackItem["status"]) {
    return isFeedbackRead(status) ? "Read" : "Unread";
}

export function formatTabLabel(tab: string) {
    if (tab === "history") {
        return "Chapter History";
    }

    return tab.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function formatBookStatus(status: BookStatus) {
    return bookStatusLabels[status] ?? "In Progress";
}

export function isChapterReleasedToChannel(
    chapterNumber: number,
    channel: ReaderChannel,
    _metadata: Record<ReaderChannel, ChannelMetadata>,
    releases: ChapterRelease[]
) {
    return releases.some((release) =>
        release.channel === channel
        && release.chapterNumber === chapterNumber
        && release.status === "released"
    );
}

export function getBookReleaseAvailability(releases: ChapterRelease[]) {
    if (releases.some((release) => release.channel === "public" && release.status === "released")) {
        return "Public";
    }

    if (releases.some((release) => release.channel === "beta" && release.status === "released")) {
        return "Beta Released";
    }

    if (releases.some((release) => release.channel === "alpha" && release.status === "released")) {
        return "Alpha Released";
    }

    if (releases.some((release) => release.status === "scheduled")) {
        return "Scheduled";
    }

    return "Unreleased";
}

export function countReleasedChapters(releases: ChapterRelease[], channel: ReaderChannel) {
    return releases.filter((release) => release.channel === channel && release.status === "released").length;
}

export function countScheduledChapters(releases: ChapterRelease[], channel: ReaderChannel) {
    return releases.filter((release) => release.channel === channel && release.status === "scheduled").length;
}

export function getChannelReleaseStatus(
    channel: ReaderChannel,
    _metadata: Record<ReaderChannel, ChannelMetadata>,
    releases: ChapterRelease[]
) {
    const channelReleases = releases.filter((release) => release.channel === channel);

    if (channelReleases.some((release) => release.status === "released")) {
        return "Released";
    }

    if (channelReleases.some((release) => release.status === "scheduled")) {
        return "Scheduled";
    }

    return "Unreleased";
}

export function normalizeReaderGroups(groups: any[] = []): ReaderGroup[] {
    if (!groups.length) {
        return readerGroups;
    }

    return groups.map((group) => {
        const channel = group.channel as ReaderChannel;
        const fallback = readerGroups.find((item) => item.key === channel) ?? readerGroups[0];
        const memberList = (group.members ?? []).map(normalizeReaderGroupMember);

        return {
            id: group.id,
            key: channel,
            channel,
            label: group.name ?? fallback.label,
            name: group.name,
            shortLabel: fallback.shortLabel,
            members: group.memberCount ?? memberList.length,
            memberCount: group.memberCount ?? memberList.length,
            tone: fallback.tone,
            description: group.description ?? "",
            memberList,
        };
    });
}

export function normalizeReaderGroupMember(member: any): ReaderGroupMember {
    return {
        ...member,
        status: member.status === "removed" ? "removed" : "active",
    };
}

export function normalizeGenres(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter((genre): genre is string => typeof genre === "string")
        .map((genre) => genre.trim())
        .filter(Boolean);
}

export function countBookWords(book: BookEditorState) {
    return book.chapters.reduce((total, chapter) => total + countWords(chapter.content), 0);
}

export function countWords(value: string) {
    return value.trim().split(/\s+/).filter(Boolean).length;
}

export function getExcerpt(value?: string) {
    if (!value) {
        return "";
    }

    return value.length > 180 ? `${value.slice(0, 180)}...` : value;
}
