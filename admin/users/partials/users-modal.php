<div class="modal-backdrop" id="editUserModal" aria-hidden="true">
    <div class="edit-modal" role="dialog" aria-modal="true" aria-labelledby="editUserTitle">
        <h2 id="editUserTitle">Edit User</h2>
        <p class="modal-meta">Update the selected user's details.</p>

        <form method="post" id="editUserForm">
            <input type="hidden" name="action" value="update_user">
            <input type="hidden" name="user_id" id="editUserId">

            <div class="modal-field">
                <label for="editUsername">Username</label>
                <input type="text" name="username" id="editUsername" autocomplete="off" required>
            </div>

            <div class="modal-actions">
                <button type="button" class="modal-button secondary" id="closeEditModal">Cancel</button>
                <button type="submit" name="save_user" class="modal-button primary">Save Changes</button>
            </div>
        </form>
    </div>
</div>