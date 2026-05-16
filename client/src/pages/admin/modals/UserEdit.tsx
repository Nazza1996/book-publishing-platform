import '../../../styles/modal.css'

const props = {
    closeFunction: () => {},
    submitFunction: () => {},
    username: '',
    setUsername: (_username: string) => {},
}

export default function UserEditModal({ closeFunction, submitFunction, username, setUsername }: typeof props) {
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