import '../../../styles/modal.scss'

const props = {
    closeFunction: () => {},
    submitFunction: () => {},
    bookName: '',
}

export default function BookDeleteModal({ closeFunction, submitFunction, bookName }: typeof props) {
    return (
        <>
            <div
                className="modal fade"
                id="bookDeleteModal"
                aria-labelledby="bookDeleteModalLabel"
                aria-hidden="true"
            >
                <div className="modal-content">
                    <div className="modal-header">
                        <h2
                            className="modal-title"
                            id="bookDeleteModalLabel"
                        >
                            Delete Book
                        </h2>

                        <button
                            type="button"
                            className="btn-close"
                            aria-label="Close"
                            onClick={closeFunction}
                        ></button>
                    </div>

                    <div className="modal-body">
                        <p>Are you sure you want to delete the book <strong>{bookName}</strong>? This action cannot be undone.</p>
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
                            Delete Book
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}