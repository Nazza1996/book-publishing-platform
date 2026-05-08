<div class="modal-backdrop" id="deleteUserModal" aria-hidden="true">
    <div class="edit-modal" role="dialog" aria-modal="true" aria-labelledby="deleteUserTitle">
        <h2 id="deleteUserTitle">Delete User</h2>
        <div class="modal-content">
            <p class="modal-meta" id="deleteUserMessage">Are you sure you want to delete this user?</p>
            <p class="modal-meta">This action cannot be undone.</p>
        </div>

        <form method="post" id="deleteUserForm">
            <input type="hidden" name="action" value="delete_user">
            <input type="hidden" name="user_id" id="deleteUserId">

            <div class="modal-actions">
                <button type="button" class="modal-button secondary" id="closeDeleteModal">Cancel</button>
                <button type="submit" class="modal-button primary">Delete User</button>
            </div>
        </form>
    </div>
</div>