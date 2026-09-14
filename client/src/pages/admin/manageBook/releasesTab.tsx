import { useState } from "react";
import type { Chapter, ChapterRelease, ChannelMetadata, ReaderChannel, ReaderGroup } from "./types";
import { Panel } from "./components/Panel";
import { ReleasePreview } from "./components/ReleasePreview";
import { StatusPill } from "./components/StatusPill";
import { SelectPicker } from "../../../components/SelectPicker";
import { formatReleaseDay, formatReleaseMonth, formatReleaseTime, toReleaseIsoString } from "../../../utils/releaseDates";
import { sortReleasesByDate } from "./helpers";
import { faBan, faBookOpen, faCalendarCheck, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export function ReleasesTab({
    groups,
    metadata,
    releases,
    selectedChapter,
    chapters,
    onScheduleRelease,
    onDeleteRelease
}: {
    groups: ReaderGroup[];
    metadata: Record<ReaderChannel, ChannelMetadata>;
    releases: ChapterRelease[];
    selectedChapter?: Chapter;
    chapters: Chapter[];
    onScheduleRelease: (input: {
        channel: ReaderChannel;
        chapterNumber: number;
        releaseAt: string | null;
        status?: ChapterRelease["status"];
    }) => void;
    onDeleteRelease: (releaseId: number) => void;
}) {
    const [scheduleChannel, setScheduleChannel] = useState<ReaderChannel>("beta");
    const [scheduleChapterNumber, setScheduleChapterNumber] = useState(selectedChapter?.chapterNumber ?? chapters[0]?.chapterNumber ?? 1);
    const [releaseDate, setReleaseDate] = useState("");
    const [releaseTime, setReleaseTime] = useState("10:00");

    function submitSchedule() {
        const releaseAt = releaseDate ? toReleaseIsoString(releaseDate, releaseTime) : null;

        onScheduleRelease({
            channel: scheduleChannel,
            chapterNumber: scheduleChapterNumber,
            releaseAt
        });
    }

    function releaseNow() {
        onScheduleRelease({
            channel: scheduleChannel,
            chapterNumber: scheduleChapterNumber,
            releaseAt: new Date().toISOString(),
            status: "released"
        });
    }

    const scheduledReleases = sortReleasesByDate(releases.filter((release) => release.status === "scheduled"));
    const releasedReleases = sortReleasesByDate(releases.filter((release) => release.status === "released"));

    function renderRelease(release: ChapterRelease) {
        const group = groups.find((item) => item.key === release.channel);
        const chapter = chapters.find((item) => item.chapterNumber === release.chapterNumber);
        const hasReleaseDate = Boolean(release.releaseAt);

        return (
            <div className="schedule-item" key={release.id ?? `${release.channel}-${release.chapterNumber}`}>
                <div className="schedule-date">
                    <span>{hasReleaseDate ? formatReleaseMonth(release.releaseAt).toUpperCase() : "TBD"}</span>
                    <strong>{hasReleaseDate ? formatReleaseDay(release.releaseAt) : "-"}</strong>
                </div>
                <div className="schedule-item-details">
                    <strong>{chapter?.title ?? `Chapter ${release.chapterNumber}`}</strong>
                    <span>{group?.label ?? release.channel} {hasReleaseDate ? `at ${formatReleaseTime(release.releaseAt)}` : ""}</span>
                </div>
                <StatusPill label={release.status.charAt(0).toUpperCase() + release.status.slice(1)} />
                {release.id && (
                    <button
                        className="danger-btn schedule-action"
                        type="button"
                        title={release.status === "scheduled" ? "Cancel scheduled release" : "Revert released chapter"}
                        aria-label={release.status === "scheduled" ? "Cancel scheduled release" : "Revert released chapter"}
                        onClick={() => onDeleteRelease(release.id!)}
                    >
                        <FontAwesomeIcon icon={release.status === "scheduled" ? faBan : faRotateLeft} />
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="release-grid">
            <Panel step="5" title="Release Preview" description="See how this chapter is released to each reader group.">
                <ReleasePreview groups={groups} metadata={metadata} releases={releases} />
            </Panel>

            <Panel step="6" title="Schedule Release" description="Plan when chapters go live for each reader group.">
                <div className="schedule-form">
                    <label>
                        Reader Group
                        <SelectPicker
                            options={groups.map((group) => ({ value: group.key, label: group.label }))}
                            onSelect={setScheduleChannel}
                            currentOption={scheduleChannel}
                        />
                    </label>
                    <label>
                        Release Chapter
                        <SelectPicker
                            options={chapters.map((chapter) => ({ value: chapter.chapterNumber, label: `Chapter ${chapter.chapterNumber}: ${chapter.title}` }))}
                            onSelect={setScheduleChapterNumber}
                            currentOption={scheduleChapterNumber}
                        />
                    </label>
                    <label>
                        Release Date
                        <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
                    </label>
                    <label>
                        Release Time
                        <input type="time" value={releaseTime} onChange={(e) => setReleaseTime(e.target.value)} />
                    </label>
                    <button className="primary-btn" onClick={submitSchedule}>Schedule Release</button>
                    <button className="secondary-btn" onClick={releaseNow}>Release Now</button>
                </div>
            </Panel>

            <Panel title="Schedule" style={{ maxHeight: 600, overflowY: "auto" }}>
                <div className="schedule-list">
                    <section className="schedule-section" aria-labelledby="scheduled-releases-heading">
                        <h3 id="scheduled-releases-heading">Scheduled</h3>
                        {scheduledReleases.length > 0 ? scheduledReleases.map(renderRelease) : (
                            <div className="schedule-empty-state">
                                <FontAwesomeIcon icon={faCalendarCheck} />
                                <strong>No scheduled releases</strong>
                            </div>
                        )}
                    </section>
                    <section className="schedule-section" aria-labelledby="released-releases-heading">
                        <h3 id="released-releases-heading">Released</h3>
                        {releasedReleases.length > 0 ? releasedReleases.map(renderRelease) : (
                            <div className="schedule-empty-state">
                                <FontAwesomeIcon icon={faBookOpen} />
                                <strong>No released chapters</strong>
                            </div>
                        )}
                    </section>
                </div>
            </Panel>
        </div>
    );
}
