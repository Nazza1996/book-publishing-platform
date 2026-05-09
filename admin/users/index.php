<?php
    require_once __DIR__ . '/../../php/auth.php';
    require_once __DIR__ . '/../../php/db.php';
    require_once __DIR__ . '/../../php/repositories/UserRepository.php';

    $columns = [
        'id' => 'ID',
        'username' => 'Username',
    ];

    $currentUserId = (int)($_SESSION['user_id'] ?? 0);

    $message = $_SESSION['users_flash_message'] ?? null;
    $messageType = $_SESSION['users_flash_type'] ?? 'success';

    unset($_SESSION['users_flash_message'], $_SESSION['users_flash_type']);

    $redirectToUsers = function (string $messageText, string $type = 'success'): void {
        $_SESSION['users_flash_message'] = $messageText;
        $_SESSION['users_flash_type'] = $type;
        header('Location: /admin/users/');
        exit;
    };

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = (string)($_POST['action'] ?? '');

        try {
            if ($action === 'create_user') {
                $username = trim((string)($_POST['username'] ?? ''));
                $password = (string)($_POST['password'] ?? '');

                if ($username === '' || $password === '') {
                    throw new InvalidArgumentException('Please provide a username and password.');
                }

                UserRepository::createUser($pdo, $username, password_hash($password, PASSWORD_DEFAULT));
                $redirectToUsers('User created successfully.');
            } elseif ($action === 'update_user') {
                $userId = filter_input(INPUT_POST, 'user_id', FILTER_VALIDATE_INT);
                $username = trim((string)($_POST['username'] ?? ''));

                if (!$userId || $username === '') {
                    throw new InvalidArgumentException('Please provide a valid username.');
                }

                UserRepository::updateUsername($pdo, $userId, $username);
                $redirectToUsers('User updated successfully.');
            } elseif ($action === 'delete_user') {
                $userId = filter_input(INPUT_POST, 'user_id', FILTER_VALIDATE_INT);

                if (!$userId) {
                    throw new InvalidArgumentException('Please choose a valid user to delete.');
                }

                if ($userId === $currentUserId) {
                    throw new InvalidArgumentException('You cannot delete your own account.');
                }

                UserRepository::deleteUser($pdo, $userId);
                $redirectToUsers('User deleted successfully.');
            }
        } catch (Throwable $e) {
            $message = $e instanceof InvalidArgumentException ? $e->getMessage() : 'Unable to process the request.';
            $messageType = 'error';
        }
    }

    try {
        $users = UserRepository::getAll($pdo);
    } catch (Throwable $e) {
        $users = [];
        $columns = [];
        $message = $message ?? 'Unable to load users.';
        $messageType = 'error';
    }
?>

<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>Users - Admin</title>
        <link rel="stylesheet" href="/styles/index.css">
        <link rel="stylesheet" href="/styles/admin-users.css">
        <script type="module" src="/js/index.js"></script>
        <script defer src="./users.js"></script>

        <style>
            .back-link {
                margin-top: 1.5rem;
            }

            .back-dashboard-button {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1.1rem;
                border-radius: 999px;
                border: 1px solid #d8d8d8;
                background: linear-gradient(180deg, #ffffff 0%, #f4f4f4 100%);
                color: #1f1f1f;
                text-decoration: none;
                font-weight: 600;
                box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
                transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
            }

            .back-dashboard-button:hover,
            .back-dashboard-button:focus-visible {
                transform: translateY(-1px);
                border-color: #bcbcbc;
                box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
                outline: none;
            }

            .back-dashboard-button::before {
                content: "←";
                font-size: 1rem;
                line-height: 1;
            }
        </style>
    </head>

    <body>
        <div id="navbar"></div>

        <main class="users-container">
            <h1>Users</h1>

            <div class="users-toolbar">
                <button type="button" class="toolbar-button primary" data-open-create-user>Create User</button>
            </div>

            <?php if ($message): ?>
                <p class="message <?php echo htmlspecialchars($messageType); ?>"><?php echo htmlspecialchars($message); ?></p>
            <?php endif; ?>

            <?php include __DIR__ . '/partials/users-table.php'; ?>

            <p class="back-link"><a class="back-dashboard-button" href="/admin">Back to Dashboard</a></p>
        </main>

        <?php include __DIR__ . '/partials/users-create-modal.php'; ?>
        <?php include __DIR__ . '/partials/users-modal.php'; ?>
        <?php include __DIR__ . '/partials/users-delete-modal.php'; ?>

        <div id="footer"></div>
    </body>
</html>
