<?php if (empty($columns)): ?>
    <p class="no-users">No users found.</p>
<?php else: ?>
    <div class="table-wrapper">
        <table class="users-table">
            <thead>
                <tr>
                    <?php foreach ($columns as $field => $label): ?>
                        <th><?php echo htmlspecialchars($label); ?></th>
                    <?php endforeach; ?>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($users)): ?>
                    <tr>
                        <td colspan="<?php echo count($columns) + 1; ?>" class="no-users">No users found.</td>
                    </tr>
                <?php else: ?>
                    <?php foreach ($users as $user): ?>
                        <tr class="user-row" data-user-row-id="<?php echo htmlspecialchars((string)($user['id'] ?? '')); ?>">
                            <?php foreach ($columns as $field => $label): ?>
                                <td><?php echo htmlspecialchars((string)($user[$field] ?? '')); ?></td>
                            <?php endforeach; ?>
                            <td>
                                <div class="row-actions">
                                    <button
                                        type="button"
                                        class="action-link edit-user-button"
                                        data-user-id="<?php echo htmlspecialchars((string)($user['id'] ?? '')); ?>"
                                        data-username="<?php echo htmlspecialchars((string)($user['username'] ?? '')); ?>"
                                    >
                                        Edit
                                    </button>

                                    <?php if ((int)($user['id'] ?? 0) !== (int)($currentUserId ?? 0)): ?>
                                        <button
                                            type="button"
                                            class="action-link delete-user-button"
                                            data-user-id="<?php echo htmlspecialchars((string)($user['id'] ?? '')); ?>"
                                            data-username="<?php echo htmlspecialchars((string)($user['username'] ?? '')); ?>"
                                        >
                                            Delete
                                        </button>
                                    <?php endif; ?>
                                </div>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
<?php endif; ?>