import { useEffect, useState } from "react";
import { toast } from "../../../helpers";
import type { ReaderAccount, ReaderGroup, ReaderGroupMember } from "./types";
import { Panel } from "./components/Panel";
import { ReaderGroupCards } from "./components/ReaderGroupCards";
import { StatusPill } from "./components/StatusPill";
import { SelectPicker } from "../../../components/SelectPicker";

export function ReaderGroupsTab({
    groups,
    readerAccounts,
    onAddMember,
    onMemberStatus
}: {
    groups: ReaderGroup[];
    readerAccounts: ReaderAccount[];
    onAddMember: (groupId: number, userId: number) => void;
    onMemberStatus: (groupId: number, memberId: number, status: ReaderGroupMember["status"]) => void;
}) {
    const [activeGroupId, setActiveGroupId] = useState(groups[0]?.id ?? 0);
    const [selectedUserId, setSelectedUserId] = useState<number | "">("");
    const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0];
    const activeMemberUserIds = new Set((activeGroup?.memberList ?? [])
        .filter((member) => member.status === "active")
        .map((member) => member.userId));
    const availableReaders = readerAccounts.filter((reader) =>
        reader.active && !activeMemberUserIds.has(reader.id)
    );

    useEffect(() => {
        if (!activeGroupId && groups[0]?.id) {
            setActiveGroupId(groups[0].id);
        }
    }, [activeGroupId, groups]);

    function submitMember() {
        if (!activeGroup?.id) {
            toast.error("Save this book before adding readers");
            return;
        }

        if (!selectedUserId) {
            toast.error("Choose a reader account");
            return;
        }

        onAddMember(activeGroup.id, selectedUserId);
        setSelectedUserId("");
    }

    return (
        <Panel step="7" title="Reader Groups" description="Manage who can access each reader group.">
            <ReaderGroupCards groups={groups} activeGroupId={activeGroup?.id} onSelect={setActiveGroupId} />

            <div className="reader-member-form">
                <SelectPicker
                    options={[{ value: "", label: "Choose reader account" }, ...availableReaders.map((reader) => ({ value: reader.id, label: reader.username }))]}
                    onSelect={(value: number | "") => setSelectedUserId(value)}
                    currentOption={selectedUserId}
                />
                <button className="primary-btn" onClick={submitMember}>Add Member</button>
            </div>

            <table className="admin-data-table">
                <thead>
                    <tr>
                        <th>Member</th>
                        <th>Joined</th>
                        <th>Status</th>
                        <th>Access</th>
                    </tr>
                </thead>
                <tbody>
                    {(activeGroup?.memberList ?? []).length === 0 ? (
                        <tr>
                            <td colSpan={4}>No members in this group yet.</td>
                        </tr>
                    ) : (activeGroup?.memberList ?? []).map((member) => (
                        <tr key={member.id ?? member.username}>
                            <td>{member.user?.username ?? member.username}</td>
                            <td>{member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('en-GB') : "-"}</td>
                            <td><StatusPill label={member.status} /></td>
                            <td>
                                {member.id && activeGroup?.id && (
                                    <button
                                        className="secondary-btn"
                                        onClick={() => onMemberStatus(activeGroup.id!, member.id!, member.status === "active" ? "removed" : "active")}
                                    >
                                        {member.status === "active" ? "Remove" : "Restore"}
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Panel>
    );
}
