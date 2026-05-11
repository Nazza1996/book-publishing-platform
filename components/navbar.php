<?php
if (!isset($_SESSION)) {
    session_start();
}
?>
<nav>
    <a href="/" class="branding">
        <img src="/favicon.ico" alt="NateThePlot Logo">
        <span>NateThePlot</span>
    </a>
    <ul class="nav-list">
        <li><a href="/">Home</a></li>
        <li><a href="/library">Library</a></li>
        <?php if (isset($_SESSION['user_id'])): ?>
            <li><a href="/admin">Admin</a></li>
        <?php endif; ?>
    </ul>
</nav>