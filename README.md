# Task API (NestJS)

Simple API for managing tasks, built with NestJS and TypeScript.

## Swagger

To view the API documentation, navigate to `http://localhost:3000/api` after starting the server. The Swagger UI provides an interactive interface for testing the API endpoints.

## Features

* Creating tasks for users.
* Marking tasks as completed.
* Retrieving a list of all tasks (with optional filtering by done or open status).
* Retrieving a list of tasks for a specific user (with optional status filtering).
* Task creation limits:
  * Maximum 5 tasks per user within 1 minute.
  * (Optional) Maximum 20 tasks globally within 5 minutes.
* Data stored in memory (reset upon application/container restart).

## Requirements
    
* Node.js (recommended version 18.x or later)
* npm (or yarn)
* Docker (for running in a container)

## Installation

1.  Clone the repository:
    ```bash
    git clone <git@github.com:piotreksadon/task-backend.git>
    cd task-api
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

## Local Development (Development Mode)

```bash
npm run start:dev
```

## Run the Docker container:

```bash
docker-compose up
```

or

* Build the Docker image:
```bash
docker build -t task-api .
```

and

* Run the Docker container:
```bash
docker run -p 3000:3000 task-api
```

## Running Tests

* Unit tests:
```bash
npm run test
```

* E2E tests (if we had them):
```bash
npm run test:e2e
```