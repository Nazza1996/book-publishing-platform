import { useEffect, useMemo, useState } from "react";
import type { Chapter, ReaderChannel, ReaderFeedbackItem, ReaderGroup } from "./types";
import { FeedbackList } from "./components/FeedbackList";
import { Panel } from "./components/Panel";

export function FeedbackTab({
    groups,
    chapters,
    feedback,
    selectedChapter,
    onFeedbackStatus
}: {
    groups: ReaderGroup[];
    chapters: Chapter[];
    feedback: ReaderFeedbackItem[];
    selectedChapter?: Chapter;
    onFeedbackStatus: (feedbackId: number, status: ReaderFeedbackItem["status"]) => void;
}) {
    const [channel, setChannel] = useState<"all" | ReaderChannel>("all");
    const [chapterNumber, setChapterNumber] = useState<"all" | "book" | number>(
        selectedChapter?.chapterNumber ?? "all"
    );
    const [readerFilter, setReaderFilter] = useState("all");
    const visibleGroups = useMemo(
        () => channel === "all" ? groups : groups.filter((group) => group.key === channel),
        [channel, groups]
    );
    const readerOptions = useMemo(() => {
        const options = new Map<string, string>();

        visibleGroups
            .flatMap((group) => group.memberList ?? [])
            .filter((member) => member.status === "active")
            .forEach((member) => {
                const key = feedbackReaderKey(member.userId, member.user?.username ?? member.username);
                options.set(key, member.user?.username ?? member.username);
            });

        feedback
            .filter((item) => channel === "all" || item.channel === channel)
            .forEach((item) => {
                options.set(feedbackReaderKey(item.readerUserId ?? null, item.reader?.username ?? item.readerUsername), item.reader?.username ?? item.readerUsername);
            });

        return Array.from(options, ([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [channel, feedback, visibleGroups]);

    const filteredFeedback = useMemo(() => {
        return feedback.filter((item) => {
            if (channel !== "all" && item.channel !== channel) {
                return false;
            }

            if (chapterNumber === "book" && item.chapterNumber !== null) {
                return false;
            }

            if (typeof chapterNumber === "number" && item.chapterNumber !== chapterNumber) {
                return false;
            }

            if (readerFilter !== "all" && feedbackReaderKey(item.readerUserId ?? null, item.reader?.username ?? item.readerUsername) !== readerFilter) {
                return false;
            }

            return true;
        });
    }, [channel, chapterNumber, feedback, readerFilter]);

    useEffect(() => {
        setReaderFilter("all");
    }, [channel]);

    return (
        <Panel step="8" title="Feedback" description="See reader feedback by chapter and reader group.">
            <div className="feedback-form">
                <select value={channel} onChange={(e) => setChannel(e.target.value as "all" | ReaderChannel)}>
                    <option value="all">All reader groups</option>
                    {groups.map((group) => (
                        <option key={group.key} value={group.key}>{group.label}</option>
                    ))}
                </select>
                <select
                    value={chapterNumber}
                    onChange={(e) => {
                        const value = e.target.value;
                        setChapterNumber(value === "all" || value === "book" ? value : Number(value));
                    }}
                >
                    <option value="all">All chapters</option>
                    {chapters.map((chapter) => (
                        <option key={chapter.chapterNumber} value={chapter.chapterNumber}>Chapter {chapter.chapterNumber}: {chapter.title}</option>
                    ))}
                </select>
                <select value={readerFilter} onChange={(e) => setReaderFilter(e.target.value)}>
                    <option value="all">All readers</option>
                    {readerOptions.map((reader) => (
                        <option key={reader.value} value={reader.value}>{reader.label}</option>
                    ))}
                </select>
            </div>

            <FeedbackList
                groups={groups}
                feedback={filteredFeedback}
                selectedChapter={selectedChapter}
                onFeedbackStatus={onFeedbackStatus}
            />
        </Panel>
    );
}

export function feedbackReaderKey(readerUserId: number | null | undefined, readerUsername: string) {
    return readerUserId ? `id:${readerUserId}` : `name:${readerUsername.toLowerCase()}`;
}
