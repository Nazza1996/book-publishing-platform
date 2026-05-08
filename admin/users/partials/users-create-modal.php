<div class="modal-backdrop" id="createUserModal" aria-hidden="true">
    <div class="edit-modal" role="dialog" aria-modal="true" aria-labelledby="createUserTitle">
        <h2 id="createUserTitle">Create User</h2>
        <p class="modal-meta">Add a new user account.</p>

        <form method="post" id="createUserForm">
            <input type="hidden" name="action" value="create_user">

            <div class="modal-field">
                <label for="createUsername">Username</label>
                <input type="text" name="username" id="createUsername" autocomplete="off" required>
            </div>

            <div class="modal-field">
                <label for="createPassword">Password</label>
                <input type="password" name="password" id="createPassword" autocomplete="new-password" required>
            </div>

            <div class="modal-actions">
                <button type="button" class="modal-button secondary" id="closeCreateModal">Cancel</button>
                <button type="submit" class="modal-button primary">Create User</button>
            </div>
        </form>
    </div>
</div>