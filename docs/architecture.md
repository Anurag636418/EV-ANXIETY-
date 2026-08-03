# Architecture

## Current Scope

This is a starter skeleton only. It intentionally contains no authentication, no database, and no EV trip-planning business logic.

## Local Architecture

```text
Browser
  -> Next.js frontend
    -> FastAPI backend
      -> Future routing and charging provider APIs
```

## Frontend Responsibilities

- Render the user interface.
- Collect trip-planning inputs in future milestones.
- Call backend API endpoints.
- Display route, charging stations, and trip summary in future milestones.

## Backend Responsibilities

- Expose API endpoints.
- Validate requests and responses.
- Hide external provider API keys from the frontend.
- Orchestrate routing, charging, and recommendation services in future milestones.

## Intentional Non-Goals

- No microservices.
- No authentication.
- No database.
- No charging recommendation logic yet.
- No external map or charging API integration yet.
