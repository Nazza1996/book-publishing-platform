import '../../../styles/admin-users.scss';
import '../../../styles/admin/shared-admin.scss';
import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan, faCheck, faPencil, faTrash } from '@fortawesome/free-solid-svg-icons';
import UserModal from './UserModal';
import UserDeleteModal from './UserDelete';
import { useAuth } from '../../../contexts/AuthContext';
import { apiFetch, setPageTitle, toast } from '../../../helpers';
import AdminNav from '../AdminNav';
import Datatable, { type DatatableColumn } from '../Datatable';

type UserRole = 'admin' | 'reader';

interface UserRow {
    id: number;
    username: string;
    role: UserRole;
    active: boolean;
}

export default function Users() {
    const [rowData, setRowData] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedUser, setSelectedUser] = useState<UserRow>();

    const [modalOpen, setModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const { user } = useAuth();

    useEffect(() => {
        setPageTitle("Users");
    }, []);

    const loadUsers = async () => {
        setLoading(true);

        const res = await apiFetch('/api/users');

        if (!res.ok) {
            toast.error('Could not load users.');
        }

        setRowData((await res.json()).users);
        setLoading(false);
    }

    useEffect(() => {
        const timeoutId = window.setTimeout(() => loadUsers(), 0);

        return () => window.clearTimeout(timeoutId);
    }, []);

    const renderActions = (row: UserRow) => {
        const isCurrentUser = user?.id === row.id;

        return (
            <div className="action-buttons">
                <button onClick={() => {
                    setSelectedUser(row);
                    setModalOpen(true);
                }}><FontAwesomeIcon icon={faPencil} /></button>

                <button
                    disabled={isCurrentUser}
                    onClick={() => handleAccessChange(row.id, !row.active)}
                    title={row.active ? 'Revoke access' : 'Reactivate access'}
                >
                    <FontAwesomeIcon icon={row.active ? faBan : faCheck} />
                </button>

                {isCurrentUser ? (
                    <button disabled><FontAwesomeIcon icon={faTrash} className='red' /></button>
                ) : (
                    <button onClick={() => {
                        setSelectedUser(row);
                        setDeleteModalOpen(true);
                    }}><FontAwesomeIcon icon={faTrash} className='red' /></button>
                )}
            </div>
        )
    }

    const columns: DatatableColumn<UserRow>[] = [
        { key: 'id', header: 'ID', render: (row) => row.id, width: 70 },
        { key: 'username', header: 'Username', render: (row) => row.username },
        { key: 'role', header: 'Role', render: (row) => row.role.charAt(0).toUpperCase() + row.role.slice(1) },
        { key: 'active', header: 'Active', render: (row) => row.active ? 'Yes' : 'No' },
        { key: 'actions', header: '', render: renderActions, width: 130 },
    ];

    const handleAccessChange = async (userId: number, active: boolean) => {
        const res = await apiFetch(`/api/users/${userId}/access`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ active })
        });

        if (res.ok) {
            toast.success(active ? 'User access restored' : 'User access revoked');
            loadUsers();
        }
    }

    const resetToDefault = async () => {
        setModalOpen(false);
        setDeleteModalOpen(false);
        setSelectedUser(undefined);
        loadUsers();
    }

    return (
        <div id="adminView" >
            <AdminNav />
            <main className="admin-section">

                <div className="users-toolbar">
                    <h1>Users</h1>
                    <button type="button" className="toolbar-button primary" onClick={() => setModalOpen(true)}>
                        Create User
                    </button>
                </div>

                {loading ? (
                    <div className="admin-state">Loading users...</div>
                ) : (
                    <Datatable
                        title="All Users"
                        columns={columns}
                        rows={rowData}
                        getRowKey={(row) => row.id}
                        emptyMessage="No users found."
                    />
                )}

                {/* Modals */}
                {modalOpen && (
                    <UserModal
                        closeFunction={resetToDefault}
                        user={selectedUser!}
                    />
                )}
                {deleteModalOpen && (
                    <UserDeleteModal
                        closeFunction={resetToDefault}
                        user={selectedUser!}
                    />
                )}
            </main>
        </div>
    )
}
