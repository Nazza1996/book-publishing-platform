export type ReaderChannel = "alpha" | "beta" | "public";
export type BookStatus = "not_started" | "in_progress" | "on_hold" | "finished" | "cancelled";

export interface Chapter {
    id?: number;
    title: string;
    content: string;
    chapterNumber: number;
    updatedAt?: string;
}

export interface BookEditorState {
    id: number | null;
    slug: string;
    title: string;
    description: string;
    genres: string[];
    status: BookStatus;
    isFeatured: boolean;
    chapters: Chapter[];
    releases: ChapterRelease[];
    readerGroups: ReaderGroup[];
    feedback: ReaderFeedbackItem[];
    chapterRevisions: ChapterRevision[];
}

export interface ChannelMetadata {
    description: string;
    authorNote: string;
    releaseLimit: number;
    nextRelease: string;
}

export interface ReaderGroup {
    id?: number;
    key: ReaderChannel;
    channel?: ReaderChannel;
    label: string;
    name?: string;
    shortLabel: string;
    members: number;
    memberCount?: number;
    tone: string;
    description?: string;
    memberList?: ReaderGroupMember[];
}

export interface ChapterRelease {
    id?: number;
    channel: ReaderChannel;
    chapterNumber: number;
    title?: string;
    content?: string;
    status: "scheduled" | "released";
    releaseAt: string | null;
}

export interface ReaderGroupMember {
    id?: number;
    readerGroupId: number;
    userId: number | null;
    username: string;
    status: "active" | "removed";
    joinedAt: string | null;
    user?: ReaderAccount | null;
}

export interface ReaderFeedbackItem {
    id?: number;
    channel: ReaderChannel;
    chapterNumber: number | null;
    readerUserId?: number | null;
    readerUsername: string;
    comment: string;
    status: "open" | "reviewed" | "resolved";
    createdAt?: string;
    reader?: ReaderAccount | null;
}

export interface ReaderAccount {
    id: number;
    username: string;
    role: "admin" | "reader";
    active: boolean;
}

export interface ChapterRevision {
    id?: number;
    chapterNumber: number;
    revisionNumber: number;
    title: string;
    content: string | null;
    sourceBookVersionId: number | null;
    createdByLabel: string;
    createdAt?: string;
}
