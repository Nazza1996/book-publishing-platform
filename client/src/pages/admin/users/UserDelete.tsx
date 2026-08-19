import { apiFetch, toast } from '../../../helpers';
import '../../../styles/modal.scss'

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

export default function UserDeleteModal({ closeFunction, user }: props) {
    const handleSubmit = async () => {
        const res = await apiFetch(`/api/users/${user.id}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            toast.success('User deleted successfully');
            closeFunction();
        }
    }

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
                        <p>Are you sure you want to delete the user <strong>{user.username}</strong>? This action cannot be undone.</p>
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
                            onClick={handleSubmit}
                        >
                            Delete User
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}