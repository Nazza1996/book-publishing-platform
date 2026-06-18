import '../../../styles/modal.scss'

const props = {
    closeFunction: () => {},
    submitFunction: () => {},
    username: '',
    role: 'reader' as 'admin' | 'reader',
    password: '',
    setUsername: (_username: string) => {},
    setRole: (_role: 'admin' | 'reader') => {},
    setPassword: (_password: string) => {}
}

export default function UserCreateModal({ closeFunction, submitFunction, username, role, password, setUsername, setRole, setPassword }: typeof props) {
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
                            Create User
                        </h2>

                        <button
                            type="button"
                            className="btn-close"
                            aria-label="Close"
                            onClick={closeFunction}
                        ></button>
                    </div>

                    <form onSubmit={(e) => {
                        e.preventDefault();
                        submitFunction();
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
                                        <option value="reader">Reader</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

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
                                        required
                                    />
                                </div>
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
                                Create User
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}