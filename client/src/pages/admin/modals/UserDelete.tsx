import '../../../styles/modal.css'

const props = {
    closeFunction: () => {},
    submitFunction: () => {},
    username: '',
}

export default function UserDeleteModal({ closeFunction, submitFunction, username }: typeof props) {
    return (
        <>
            <div
                className="modal fade"
                id="userDeleteModal"
                aria-labelledby="userDeleteModalLabel"
                aria-hidden="true"
            >
                <div className="modal-content">
                    <div className="modal-header">
                        <h2
                            className="modal-title"
                            id="userDeleteModalLabel"
                        >
                            Delete User
                        </h2>

                        <button
                            type="button"
                            className="btn-close"
                            aria-label="Close"
                            onClick={closeFunction}
                        ></button>
                    </div>

                    <div className="modal-body">
                        <p>Are you sure you want to delete the user <strong>{username}</strong>? This action cannot be undone.</p>
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
                            type="button"
                            className="btn btn-primary"
                            onClick={submitFunction}
                        >
                            Delete User
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}