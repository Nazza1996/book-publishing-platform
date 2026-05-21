import '../../styles/admin-users.css';
import "ag-grid-community/styles/ag-theme-quartz.css";
import { AllCommunityModule, type ColDef } from 'ag-grid-community';
import { AgGridProvider, AgGridReact } from 'ag-grid-react';
import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencil, faTrash } from '@fortawesome/free-solid-svg-icons';
import UserCreateModal from './modals/UserCreate';
import UserDeleteModal from './modals/UserDelete';
import UserEditModal from './modals/UserEdit';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch, setPageTitle, toast } from '../../helpers';

const modules = [
    AllCommunityModule
];

const COLUMN_STATE_KEY = 'users-grid-column-state';

export default function Users() {
    const gridRef = useRef<AgGridReact>(null);
    const [rowData, setRowData] = useState([]);

    const [password, setPassword] = useState('');

    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [selectedUsername, setSelectedUsername] = useState<string>('');

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    setPageTitle("Users");

    const actionCellRenderer = (params: any) => {
        const { user } = useAuth();
        const userId = params.data.id;
        const username = params.data.username;

        return (
            <div className="action-buttons">
                <button onClick={() => {
                    setSelectedUserId(userId);
                    setSelectedUsername(username);
                    setEditModalOpen(true);
                }}><FontAwesomeIcon icon={faPencil} /></button>

                {user?.id === userId ? (
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
        { cellRenderer: actionCellRenderer, width: 40, sortable: false, filter: false }
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
                username: selectedUsername
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
        setSelectedUserId('');
        setSelectedUsername('');
        setPassword('');
    }

    return (
        <main className="users-container">

            <div className="users-toolbar">
                <h1>Users</h1>
                <button type="button" className="toolbar-button primary" onClick={() => setCreateModalOpen(true)}>
                    Create User
                </button>
            </div>

            <div className="ag-theme-quartz" style={{ height: '400px' }}>
                <AgGridProvider modules={modules}>
                    <AgGridReact
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

            <p className="back-link"><a className="back-dashboard-button" href="/admin">Back to Dashboard</a></p>

            {/* Modals */}
            {createModalOpen && (
                <UserCreateModal
                    closeFunction={resetModals}
                    submitFunction={handleCreateUser}
                    username={selectedUsername}
                    password={password}
                    setUsername={setSelectedUsername}
                    setPassword={setPassword}
                />
            )}
            {editModalOpen && (
                <UserEditModal
                    closeFunction={resetModals}
                    submitFunction={handleEditUser}
                    username={selectedUsername}
                    setUsername={setSelectedUsername}
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
    )
}