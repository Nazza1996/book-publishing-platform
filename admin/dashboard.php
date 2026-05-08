<?php
    require_once __DIR__ . '/../php/auth.php';
?>

<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>NateThePlot - Admin</title>
        <link rel="stylesheet" href="/styles/index.css">
        <link rel="icon" href="/favicon.ico" type="image/x-icon">
        <script type="module" src="index.js"></script>
    </head>

    <style>
        @font-face {
            font-family: 'Recoleta';
            src: url('/fonts/Recoleta.otf') format('opentype');
            font-display: swap;
        }

        @font-face {
            font-family: 'Instrumental-Sans';
            src: url('/fonts/InstrumentalSans.ttf') format('woff2');
            font-display: swap;
        }

        #adminDashboard {
            max-width: 800px;
            margin: 2rem auto;
            padding: 0 1rem;
        }
    </style>

    <body>
        <div id="adminNav"></div>

        <section id="adminDashboard">
            <h1>Dashboard</h1>
            <p>Welcome back, admin.</p>
        </section>

        <div id="footer"></div>
    </body>

</html>
