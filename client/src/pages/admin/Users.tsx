import '../../styles/admin-users.scss';
// import "ag-grid-community/styles/ag-theme-quartz.css";
import { AllCommunityModule, type ColDef, colorSchemeDarkBlue, themeQuartz } from 'ag-grid-community';
import { AgGridProvider, AgGridReact } from 'ag-grid-react';
import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan, faCheck, faPencil, faTrash } from '@fortawesome/free-solid-svg-icons';
import UserCreateModal from './modals/UserCreate';
import UserDeleteModal from './modals/UserDelete';
import UserEditModal from './modals/UserEdit';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { apiFetch, setPageTitle, toast } from '../../helpers';
import { useTheme } from '../../contexts/ThemeContext';
import AdminNav from '../newAdmin/AdminNav';

const modules = [
    AllCommunityModule
];

const COLUMN_STATE_KEY = 'users-grid-column-state';

type UserRole = 'admin' | 'reader';

interface UserRow {
    id: number;
    username: string;
    role: UserRole;
    active: boolean;
}

export default function Users() {
    const gridRef = useRef<AgGridReact>(null);
    const [rowData, setRowData] = useState<UserRow[]>([]);

    const [password, setPassword] = useState('');

    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [selectedUsername, setSelectedUsername] = useState<string>('');
    const [selectedRole, setSelectedRole] = useState<UserRole>('reader');
    const [selectedActive, setSelectedActive] = useState(true);

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const { theme } = useTheme();
    const gridTheme = theme === 'dark' ? themeQuartz.withPart(colorSchemeDarkBlue) : themeQuartz;

    setPageTitle("Users");

    const actionCellRenderer = (params: any) => {
        const { user } = useAuth();
        const userId = params.data.id;
        const username = params.data.username;
        const role = params.data.role;
        const active = params.data.active;
        const isCurrentUser = user?.id === userId;

        return (
            <div className="action-buttons">
                <button onClick={() => {
                    setSelectedUserId(userId);
                    setSelectedUsername(username);
                    setSelectedRole(role);
                    setSelectedActive(active);
                    setEditModalOpen(true);
                }}><FontAwesomeIcon icon={faPencil} /></button>

                <button
                    disabled={isCurrentUser}
                    onClick={() => handleAccessChange(userId, !active)}
                    title={active ? 'Revoke access' : 'Reactivate access'}
                >
                    <FontAwesomeIcon icon={active ? faBan : faCheck} />
                </button>

                {isCurrentUser ? (
                    <button disabled><FontAwesomeIcon icon={faTrash} className='red' /></button>
                ) : (
                    <button onClick={() => {
                        setSelectedUserId(userId);
                        setSelectedUsername(username);
                        setDeleteModalOpen(true);
                    }}><FontAwesomeIcon icon={faTrash} className='red' /></button>
                )}
            </div>
        )
    }

    const [columnDefs] = useState<ColDef[]>([
        { field: 'id', headerName: 'ID', sortable: true, filter: true, width: 40 },
        { field: 'username', headerName: 'Username', sortable: true, filter: true },
        { field: 'role', headerName: 'Role', sortable: true, filter: true, width: 110, cellRenderer: (params: any) => params.value.charAt(0).toUpperCase() + params.value.slice(1) },
        { field: 'active', headerName: 'Active', sortable: true, filter: true, width: 120, cellRenderer: (params: any) => params.value ? 'Yes' : 'No' },
        { cellRenderer: actionCellRenderer, width: 120, sortable: false, filter: false }
    ]);

    const loadUsers = () => {
        apiFetch('/api/users')
            .then(res => res.json())
            .then(data => setRowData(data.users))
            .catch(err => console.error('Error fetching users:', err));
    }

    useEffect(() => {
        loadUsers();
    }, []);

    const handleGridReady = (params: any) => {
        const savedState = localStorage.getItem(COLUMN_STATE_KEY);
        if (savedState) {
            try {
                const columnState = JSON.parse(savedState);
                params.api?.applyColumnState({ state: columnState, applyOrder: true });
            } catch (error) {
                console.error('Error restoring column state:', error);
            }
        }
    };

    const handleColumnStateChanged = () => {
        if (gridRef.current?.api) {
            const columnState = gridRef.current.api.getColumnState();
            localStorage.setItem(COLUMN_STATE_KEY, JSON.stringify(columnState));
        }
    };

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

                <div className="ag-theme-quartz" style={{ height: '400px' }}>
                    <AgGridProvider modules={modules}>
                        <AgGridReact
                            theme={gridTheme}
                            ref={gridRef}
                            rowData={rowData}
                            columnDefs={columnDefs}
                            suppressMovableColumns
                            onGridReady={handleGridReady}
                            onColumnMoved={handleColumnStateChanged}
                            onColumnResized={handleColumnStateChanged}
                        />
                    </AgGridProvider>
                </div>

                <p className="back-link"><Link className="back-dashboard-button" to="/admin">Back to Dashboard</Link></p>

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