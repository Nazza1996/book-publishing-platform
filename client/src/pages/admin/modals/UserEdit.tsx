import '../../../styles/modal.scss'

const props = {
    closeFunction: () => {},
    submitFunction: () => {},
    username: '',
    role: 'reader' as 'admin' | 'reader',
    setUsername: (_username: string) => {},
    setRole: (_role: 'admin' | 'reader') => {},
}

export default function UserEditModal({ closeFunction, submitFunction, username, role, setUsername, setRole }: typeof props) {
    return (
        <>
            <div
                className="modal fade"
                id="userEditModal"
                aria-labelledby="userEditModalLabel"
                aria-hidden="true"
            >
                <div className="modal-content">
                    <div className="modal-header">
                        <h2
                            className="modal-title"
                            id="userEditModalLabel"
                        >
                            Update User
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
                                        <option value="admin">Admin</option>
                                        <option value="reader">Reader</option>
                                    </select>
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
                                Update User
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}