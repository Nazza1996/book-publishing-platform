import type { ReaderGroup } from "../types";

export function ReaderGroupCards({
    groups,
    activeGroupId,
    onSelect
}: {
    groups: ReaderGroup[];
    activeGroupId?: number;
    onSelect?: (groupId: number) => void;
}) {
    return (
        <div className="reader-group-cards">
            {groups.map((group) => (
                <button
                    type="button"
                    className={activeGroupId === group.id ? "reader-group-card active" : "reader-group-card"}
                    key={group.key}
                    onClick={() => group.id && onSelect?.(group.id)}
                >
                    <span className={`channel-dot ${group.tone}`}>{group.shortLabel}</span>
                    <div>
                        <strong>{group.label}</strong>
                        <span>{group.members ? `${group.members} members` : group.key === "public" ? "All readers" : "No members"}</span>
                    </div>
                </button>
            ))}
        </div>
    );
}
