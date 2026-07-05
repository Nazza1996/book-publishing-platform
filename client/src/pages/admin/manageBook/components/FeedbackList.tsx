import { feedbackReadLabel, isFeedbackRead } from "../helpers";
import type { Chapter, ReaderFeedbackItem, ReaderGroup } from "../types";
import { StatusPill } from "./StatusPill";

export function FeedbackList({
    groups,
    feedback,
    selectedChapter,
    compact = false,
    onFeedbackStatus
}: {
    groups: ReaderGroup[];
    feedback: ReaderFeedbackItem[];
    selectedChapter?: Chapter;
    compact?: boolean;
    onFeedbackStatus?: (feedbackId: number, status: ReaderFeedbackItem["status"]) => void;
}) {
    const visibleFeedback = compact ? feedback.slice(0, 2) : feedback;

    return (
        <div className={compact ? "feedback-list compact" : "feedback-list"}>
            {visibleFeedback.length === 0 ? (
                <div className="admin-empty-state">No feedback yet.</div>
            ) : visibleFeedback.map((item) => {
                const group = groups.find((candidate) => candidate.key === item.channel) ?? groups[0];

                return (
                    <article className="feedback-card" key={item.id ?? `${item.channel}-${item.chapterNumber}-${item.readerUsername}`}>
                        <div className="feedback-card-header">
                            <strong>{item.readerUsername}</strong>
                            <StatusPill label={group.label} />
                            <span>{item.chapterNumber ? `Chapter ${item.chapterNumber}` : selectedChapter?.title}</span>
                            <StatusPill label={feedbackReadLabel(item.status)} />
                        </div>
                        <p>{item.comment}</p>
                        {!compact && item.id && (
                            <div className="feedback-actions">
                                <button
                                    className="secondary-btn"
                                    onClick={() => onFeedbackStatus?.(item.id!, isFeedbackRead(item.status) ? "open" : "reviewed")}
                                >
                                    {isFeedbackRead(item.status) ? "Mark unread" : "Mark as read"}
                                </button>
                            </div>
                        )}
                    </article>
                );
            })}
        </div>
    );
}
