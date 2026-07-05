import type { BookEditorState, BookStatus, ChannelMetadata, ReaderChannel, ReaderGroup } from "./types";

export const EMPTY_BOOK: BookEditorState = {
    id: null,
    slug: "",
    title: "",
    description: "",
    genres: [],
    status: "in_progress",
    isFeatured: false,
    chapters: [
        { title: "Chapter 1", content: "", chapterNumber: 1 }
    ],
    releases: [],
    readerGroups: [],
    feedback: [],
    chapterRevisions: []
};

export const tabs = ["overview", "details", "chapters", "history", "releases", "reader-groups", "feedback"];

export const bookGenres = [
    "Action",
    "Adventure",
    "Comedy",
    "Crime",
    "Detective",
    "Drama",
    "Dystopian",
    "Fantasy",
    "Historical Fiction",
    "Horror",
    "Literary",
    "Mystery",
    "Poetry",
    "Religious",
    "Romance",
    "Science Fiction",
    "Thriller",
];

export const genreOptions = bookGenres.map((genre) => ({
    value: genre,
    label: genre,
}));

export const readerGroups: ReaderGroup[] = [
    { key: "alpha", label: "Alpha Readers", shortLabel: "A", members: 0, tone: "purple" },
    { key: "beta", label: "Beta Readers", shortLabel: "B", members: 0, tone: "blue" },
    { key: "public", label: "Public Readers", shortLabel: "P", members: 0, tone: "green" }
];

export const bookStatusLabels: Record<BookStatus, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    on_hold: "On Hold",
    finished: "Finished",
    cancelled: "Cancelled",
};

export const initialChannelMetadata: Record<ReaderChannel, ChannelMetadata> = {
    alpha: {
        description: "An early look at the story. Feedback is welcome.",
        authorNote: "This is an early working copy. Expect changes.",
        releaseLimit: 4,
        nextRelease: "Chapter 5"
    },
    beta: {
        description: "A cleaner revision for continuity and pacing feedback.",
        authorNote: "Please flag confusing chapter transitions.",
        releaseLimit: 3,
        nextRelease: "Chapter 4"
    },
    public: {
        description: "The public-facing book description shown to readers.",
        authorNote: "Final release copy for public readers.",
        releaseLimit: 2,
        nextRelease: "Chapter 3"
    }
};
