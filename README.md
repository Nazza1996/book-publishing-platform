# Book Publishing Platform

A full-stack web application for managing and publishing books, chapters, releases, reader groups, and feedback. It includes a public library and reading experience alongside an authenticated administration dashboard.

## Highlights

- Book, chapter, version, and scheduled release management
- Public library and book reading views
- Admin dashboard with role-based access control
- Reader groups and feedback workflows
- JWT-based authentication with refresh-token support
- Responsive light/dark theme and accessibility preferences

## Technology

- **Frontend:** React, TypeScript, Vite, React Router, Sass
- **Backend:** Node.js, Express, TypeScript
- **Database:** MySQL, Sequelize, Umzug migrations
- **Authentication:** JSON Web Tokens, HTTP-only cookies, bcrypt
- **Deployment:** Docker, Docker Compose, multi-stage production image
- **Development tooling:** Nodemon, ESLint, npm workspaces

## Quick start with Docker

### Prerequisites

- Docker Desktop, or another Docker Compose-compatible installation

Build and start the application and database from the repository root:

```bash
docker compose up --build
```

The application is available at [http://localhost:3000](http://localhost:3000). Database migrations run automatically when the server starts, and MySQL data is persisted in the `db_data` Docker volume.

To stop the services:

```bash
docker compose down
```

phpMyAdmin is available as an optional development tool:

```bash
docker compose --profile tools up --build
```

It is then available at [http://localhost:8081](http://localhost:8081).

### Configuration

Docker Compose provides development defaults, but secrets can be overridden in a root `.env` file:

```env
DB_NAME=app
DB_USER=appuser
DB_PASS=secret
DB_HOST=localhost
MYSQL_ROOT_PASSWORD=rootsecret
JWT_SECRET=replace-with-a-strong-secret
REFRESH_SECRET=replace-with-a-strong-refresh-secret
```

Do not use the default secrets in a production deployment.

### Default administrator

The initial users migration creates a default administrator:

```text
Username: admin
Password: password
```

Change this password immediately after the first login and replace or disable the account before using the application beyond local development.

## Native development

Docker is still used for the MySQL database, while the frontend and backend run with the local Node.js toolchain.

1. Install Node.js and npm.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a root `.env` using the configuration above, changing `DB_HOST` to `localhost` if needed.
4. Start MySQL:

   ```bash
   docker compose up db
   ```

5. In a second terminal, start the API and Vite development server:

   ```bash
   npm start
   ```

The Vite development server is available at [http://localhost:5173](http://localhost:5173), with API requests proxied to the backend on port `3000`.

## Useful commands

```bash
npm start      # Run the backend and frontend in development mode
npm run build  # Build the frontend and compile the backend
```
