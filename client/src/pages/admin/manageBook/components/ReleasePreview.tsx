import { countReleasedChapters, countScheduledChapters, getChannelReleaseStatus } from "../helpers";
import type { ChapterRelease, ChannelMetadata, ReaderChannel, ReaderGroup } from "../types";
import { StatusPill } from "./StatusPill";

export function ReleasePreview({
    groups,
    metadata,
    releases
}: {
    groups: ReaderGroup[];
    metadata: Record<ReaderChannel, ChannelMetadata>;
    releases: ChapterRelease[];
}) {
    return (
        <div className="release-preview-list">
            {groups.map((group) => (
                <div className="release-preview-item" key={group.key}>
                    <span className={`channel-dot ${group.tone}`}>{group.shortLabel}</span>
                    <div>
                        <strong>{group.label}</strong>
                        <span>{countReleasedChapters(releases, group.key)} released chapters</span>
                        <span>{countScheduledChapters(releases, group.key)} scheduled releases</span>
                    </div>
                    <StatusPill label={getChannelReleaseStatus(group.key, metadata, releases)} />
                </div>
            ))}
        </div>
    );
}
