import '../../styles/admin-users.css';
import "ag-grid-community/styles/ag-theme-quartz.css";
import { AllCommunityModule, type ColDef } from 'ag-grid-community';
import { AgGridProvider, AgGridReact } from 'ag-grid-react';
import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencil, faTrash } from '@fortawesome/free-solid-svg-icons';

const modules = [
    AllCommunityModule
];

const COLUMN_STATE_KEY = 'users-grid-column-state';

export default function Users() {
    
    const gridRef = useRef<AgGridReact>(null);
    const [rowData, setRowData] = useState([]);

    const actionCellRenderer = (params: any) => {
        return (
            <div className="action-buttons">
                <button onClick={() => {}}><FontAwesomeIcon icon={faPencil} /></button>
                <button onClick={() => {}}><FontAwesomeIcon icon={faTrash} /></button>
            </div>
        )
    }

    const [columnDefs] = useState<ColDef[]>([
        { field: 'id', headerName: 'ID', sortable: true, filter: true, width: 40 },
        { field: 'username', headerName: 'Username', sortable: true, filter: true },
        { cellRenderer: actionCellRenderer, width: 40, sortable: false, filter: false }
    ]);

    useEffect(() => {
        fetch('/api/users')
            .then(res => res.json())
            .then(data => setRowData(data.users))
            .catch(err => console.error('Error fetching users:', err));
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

    return (
        <main className="users-container">

            <div className="users-toolbar">
                <h1>Users</h1>
                <button type="button" className="toolbar-button primary" onClick={() => {}}>Create User</button>
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
        </main>
    )
}