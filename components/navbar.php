<?php
if (!isset($_SESSION)) {
    session_start();
}
?>
<nav>
    <a class="branding" href="/">NateThePlot</a>
    <ul class="nav-list">
        <li><a href="/">Home</a></li>
        <li><a href="/library">Library</a></li>
        <li><a href="/about_me.html">About Me</a></li>
        <?php if (isset($_SESSION['user_id'])): ?>
            <li><a href="/admin">Admin</a></li>
        <?php endif; ?>
    </ul>
</nav>