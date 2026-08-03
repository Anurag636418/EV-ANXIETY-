# Intelligent EV Trip Planning and Charging Assistance System

A production-minded portfolio project skeleton for an EV trip planning web application.

This repository currently contains only starter structure:

- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: FastAPI
- No authentication
- No database
- No business logic

## Project Structure

```text
.
├── Backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── health.py
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   └── config.py
│   │   ├── schemas/
│   │   │   └── __init__.py
│   │   ├── services/
│   │   │   └── __init__.py
│   │   ├── __init__.py
│   │   └── main.py
│   ├── .env.example
│   └── requirements.txt
├── Frontend/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   ├── lib/
│   ├── public/
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── tailwind.config.ts
│   └── tsconfig.json
├── docs/
│   └── architecture.md
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js 20 or newer
- Python 3.11 or newer

## Backend Setup

```bash
cd Backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend runs at:

```text
http://localhost:8000
```

Health check:

```text
http://localhost:8000/api/health
```

Route planning endpoint:

```text
POST http://localhost:8000/route
```

Example request:

```json
{
  "origin": "Bengaluru",
  "destination": "Mysuru"
}
```

The backend uses Nominatim for geocoding and the public OSRM demo server for basic development routing.

## Frontend Setup

Open a second terminal:

```bash
cd Frontend
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:3000
```

## Development Notes

- Keep API keys only in backend environment variables.
- Keep frontend focused on UI and API calls.
- Keep backend focused on validation, external API calls, and trip-planning orchestration.
- Add business logic only when implementing the first functional milestone.
