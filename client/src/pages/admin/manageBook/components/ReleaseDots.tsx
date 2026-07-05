import { isChapterReleasedToChannel } from "../helpers";
import type { ChapterRelease, ChannelMetadata, ReaderChannel, ReaderGroup } from "../types";

export function ReleaseDots({
    groups,
    metadata,
    releases,
    chapterNumber
}: {
    groups: ReaderGroup[];
    metadata: Record<ReaderChannel, ChannelMetadata>;
    releases: ChapterRelease[];
    chapterNumber: number;
}) {
    return (
        <div className="release-dots">
            {groups.map((group) => (
                <span
                    key={group.key}
                    className={isChapterReleasedToChannel(chapterNumber, group.key, metadata, releases) ? `channel-dot ${group.tone}` : "release-missing"}
                >
                    {isChapterReleasedToChannel(chapterNumber, group.key, metadata, releases) ? group.shortLabel : "-"}
                </span>
            ))}
        </div>
    );
}
