import '../../styles/admin-users.scss';
import '../../styles/admin/shared-admin.scss';
import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan, faCheck, faPencil, faTrash } from '@fortawesome/free-solid-svg-icons';
import UserCreateModal from './modals/UserCreate';
import UserDeleteModal from './modals/UserDelete';
import UserEditModal from './modals/UserEdit';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch, setPageTitle, toast } from '../../helpers';
import AdminNav from '../newAdmin/AdminNav';
import Datatable, { type DatatableColumn } from './Datatable';

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
    const [error, setError] = useState('');

    const [password, setPassword] = useState('');

    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [selectedUsername, setSelectedUsername] = useState<string>('');
    const [selectedRole, setSelectedRole] = useState<UserRole>('reader');
    const [selectedActive, setSelectedActive] = useState(true);

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const { user } = useAuth();

    useEffect(() => {
        setPageTitle("Users");
    }, []);

    const loadUsers = () => {
        setLoading(true);
        setError('');

        apiFetch('/api/users')
            .then(res => {
                if (!res.ok) {
                    setError('Could not load users.');
                    return null;
                }

                return res.json();
            })
            .then(data => {
                if (data) {
                    setRowData(data.users);
                }
            })
            .catch(err => {
                console.error('Error fetching users:', err);
                setError('Could not load users.');
            })
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        const timeoutId = window.setTimeout(() => loadUsers(), 0);

        return () => window.clearTimeout(timeoutId);
    }, []);

    const handleCreateUser = async () => {
        await apiFetch('/api/users/register', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                username: selectedUsername,
                role: selectedRole,
                password: password
            })
        });

        toast.success('User created successfully');

        resetModals();
        loadUsers();
    }

    const handleEditUser = async () => {
        if (!selectedUserId) return;

        const res = await apiFetch(`/api/users/${selectedUserId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                username: selectedUsername,
                role: selectedRole,
                active: selectedActive,
            })
        });

        if (res.ok) {
            toast.success('User updated successfully');
            resetModals();
            loadUsers();
        }
    }

    const renderActions = (row: UserRow) => {
        const isCurrentUser = user?.id === row.id;

        return (
            <div className="action-buttons">
                <button onClick={() => {
                    setSelectedUserId(row.id);
                    setSelectedUsername(row.username);
                    setSelectedRole(row.role);
                    setSelectedActive(row.active);
                    setEditModalOpen(true);
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
                        setSelectedUserId(row.id);
                        setSelectedUsername(row.username);
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

    const handleDeleteUser = async () => {
        if (!selectedUserId) return;

        const res = await apiFetch(`/api/users/${selectedUserId}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            toast.success('User deleted successfully');
            resetModals();
            loadUsers();
        }
    }

    const resetModals = () => {
        setCreateModalOpen(false);
        setEditModalOpen(false);
        setDeleteModalOpen(false);
        setSelectedUserId(null);
        setSelectedUsername('');
        setSelectedRole('reader');
        setSelectedActive(true);
        setPassword('');
    }

    const handleAccessChange = async (userId: number, active: boolean) => {
        const res = await apiFetch(`/api/users/${userId}/access`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ active })
        });

        if (res.ok) {
            toast.success(active ? 'User access restored' : 'User access deactivated');
            loadUsers();
        }
    }

    return (
        <div id="adminView" >
            <AdminNav />
            <main className="admin-section">

                <div className="users-toolbar">
                    <h1>Users</h1>
                    <button type="button" className="toolbar-button primary" onClick={() => setCreateModalOpen(true)}>
                        Create User
                    </button>
                </div>

                {loading ? (
                    <div className="admin-state">Loading users...</div>
                ) : error ? (
                    <div className="admin-state error">{error}</div>
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
                {createModalOpen && (
                    <UserCreateModal
                        closeFunction={resetModals}
                        submitFunction={handleCreateUser}
                        username={selectedUsername}
                        role={selectedRole}
                        password={password}
                        setUsername={setSelectedUsername}
                        setRole={setSelectedRole}
                        setPassword={setPassword}
                    />
                )}
                {editModalOpen && (
                    <UserEditModal
                        closeFunction={resetModals}
                        submitFunction={handleEditUser}
                        username={selectedUsername}
                        role={selectedRole}
                        setUsername={setSelectedUsername}
                        setRole={setSelectedRole}
                    />
                )}
                {deleteModalOpen && (
                    <UserDeleteModal
                        closeFunction={resetModals}
                        submitFunction={() => handleDeleteUser()}
                        username={selectedUsername}
                    />
                )}
            </main>
        </div>
    )
}
