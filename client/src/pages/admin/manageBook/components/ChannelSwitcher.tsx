import type { ReaderChannel, ReaderGroup } from "../types";

export function ChannelSwitcher({
    groups,
    activeChannel,
    onChange
}: {
    groups: ReaderGroup[];
    activeChannel: ReaderChannel;
    onChange: (channel: ReaderChannel) => void;
}) {
    return (
        <div className="channel-switcher">
            {groups.map((group) => (
                <button key={group.key} className={activeChannel === group.key ? "active" : ""} onClick={() => onChange(group.key)}>
                    <span className={`channel-dot ${group.tone}`}>{group.shortLabel}</span>
                    {group.label}
                </button>
            ))}
        </div>
    );
}
