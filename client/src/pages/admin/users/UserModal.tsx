import { useEffect, useState } from 'react';
import '../../../styles/modal.scss'
import { apiFetch, toast } from '../../../helpers';

type UserRole = 'admin' | 'reader';

interface UserRow {
    id: number;
    username: string;
    role: UserRole;
}

type props = {
    closeFunction: () => void;
    user: UserRow;
}

export default function UserCreateModal({ closeFunction, user }: props) {
    const [username, setUsername] = useState(user?.username);
    const [role, setRole] = useState(user?.role ?? 'reader');
    const [password, setPassword] = useState('');

    const isUpdate = user != null;
    const showPasswordField = !isUpdate || (isUpdate && role != 'admin');

    useEffect(() => {
        if (role === 'admin') {
            setPassword('');
        }
    }, [role]);

    const handleSubmit = async () => {
        const res = await apiFetch(isUpdate ? `/api/users/${user.id}` : '/api/users/register', {
            method: isUpdate ? 'PUT' : 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                username: username,
                role: role,
                password: password.length > 0 ? password : null
            })
        });

        if (res.ok) {
            toast.success(`User ${isUpdate ? 'updated' : 'created'} successfully`);
            closeFunction();
        }
    }

    return (
        <>
            <div
                className="modal fade"
                id="userCreateModal"
                aria-labelledby="userCreateModalLabel"
                aria-hidden="true"
            >
                <div className="modal-content">
                    <div className="modal-header">
                        <h2
                            className="modal-title"
                            id="userCreateModalLabel"
                        >
                            {isUpdate ? 'Update User' : 'Create User'}
                        </h2>

                        <button
                            type="button"
                            className="btn-close"
                            aria-label="Close"
                            onClick={closeFunction}
                        ></button>
                    </div>

                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        await handleSubmit();
                    }}>
                        <div className="modal-body">
                                <div className="mb-3">
                                    <label
                                        htmlFor="username"
                                        className="form-label"
                                    >
                                        Username
                                    </label>

                                    <input
                                        type="text"
                                        className="form-control"
                                        id="username"
                                        placeholder="Enter username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="role" className="form-label">Role</label>
                                    <select
                                        className="form-control"
                                        id="role"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value as 'admin' | 'reader')}
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="reader">Reader</option>
                                    </select>
                                </div>

                                {
                                    showPasswordField && (
                                        <div className="mb-3">
                                            <label
                                                htmlFor="password"
                                                className="form-label"
                                            >
                                                Password
                                            </label>

                                            <input
                                                type="password"
                                                className="form-control"
                                                id="password"
                                                placeholder="Enter password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required={isUpdate ? false : true}
                                            />
                                        </div>
                                    )
                                }

                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                data-bs-dismiss="modal"
                                onClick={closeFunction}
                                >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                >
                                {isUpdate ? 'Update User' : 'Create User'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}