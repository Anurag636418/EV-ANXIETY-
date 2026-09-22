# EV Route Planner

An EV trip-planning application that combines route planning, charging-station discovery, live charger availability, and vehicle data in an interactive map interface.

## Current Functionality

- Search for origin and destination places with autocomplete.
- Plan a complete EV trip from the frontend.
- Display the route, distance, duration, and trip summary on a Leaflet map.
- Discover charging stations along the route corridor.
- Rank charging recommendations using distance, power, operator, and connector preferences.
- Filter duplicate stations and limit route sampling to keep provider requests manageable.
- Select from the supported EV vehicle database.
- Fetch live connector availability where the charging provider supports it.
- Simulate the trip on the map with state-of-charge, progress, speed, and charging status.
- Use responsive controls that work as a desktop side panel or mobile bottom sheet.
- Expose health checks and provider telemetry for backend diagnostics.

## Technology

### Frontend

- Next.js 15 and React 19
- TypeScript
- Tailwind CSS
- Leaflet and React Leaflet for maps and route/station markers

### Backend

- Python 3.11+
- FastAPI and Uvicorn
- Pydantic Settings for configuration and request/response validation
- HTTPX for asynchronous provider requests
- Service-oriented routing, charging, availability, geocoding, range, and trip-planning modules

### External Services

- Nominatim for place search and geocoding
- OSRM public demo server for route geometry and directions
- TomTom Search API for charging-station discovery and live availability
- Open Charge Map as an available charging provider option/fallback

## Project Structure

```text
.
├── Backend/
│   ├── app/
│   │   ├── api/          FastAPI route handlers
│   │   ├── core/         Application configuration
│   │   ├── data/         Supported EV vehicle data
│   │   ├── schemas/      Pydantic request and response models
│   │   └── services/     Routing, charging, availability, and trip logic
│   ├── tests/             Backend test and provider verification suites
│   └── requirements.txt
├── Frontend/
│   ├── app/              Next.js app entry points and global styles
│   ├── components/       Map, trip controls, summaries, and simulation UI
│   ├── lib/              API client, types, and route formatting helpers
│   └── package.json
├── docs/                  Architecture notes
└── README.md
```

## Prerequisites

- Python 3.11 or newer
- Node.js 20 or newer
- API keys for provider-backed charging discovery and live availability

## Configuration

Create `Backend/.env` when using TomTom or Open Charge Map:

```env
TOM_TOM_API_KEY=your_tomtom_key
OPENCHARGEMAP_API_KEY=your_openchargemap_key
CHARGING_PROVIDER=tomtom
FRONTEND_ORIGINS=http://localhost:3000
```

`CHARGING_PROVIDER` supports `tomtom`, `openchargemap`, or `both`. The backend also has defaults for charging search radius, route waypoint sampling, recommendation weights, detour limits, and the live-availability cache TTL.

The frontend uses `http://localhost:8000` by default. To point it at another backend, set:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Run Locally

Start the backend:

```powershell
cd Backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Start the frontend in a second terminal:

```powershell
cd Frontend
npm install
npm run dev
```

Open `http://localhost:3000`. The API is available at `http://localhost:8000` and FastAPI documentation is available at `http://localhost:8000/docs`.

## API Surface

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` and `/api/health` | Backend health check |
| `GET` | `/places/search?q=...` | Place autocomplete and geocoding |
| `POST` | `/route` | Plan a route between two places |
| `POST` | `/trip/plan` | Orchestrate route planning and charging discovery |
| `POST` | `/charging/stations` | Find stations along a supplied route |
| `POST` | `/availability/fetch` | Fetch live station availability |
| `GET` | `/vehicles` | List supported EV vehicles |

Example route request:

```json
{
  "origin": "Bengaluru",
  "destination": "Mysuru"
}
```

## Tests

From the repository root, run:

```powershell
Backend\.venv\Scripts\python.exe -m pytest Backend\tests
```

## Current Limitations

- There is no authentication, user account system, or database.
- Provider coverage and live availability depend on the configured external APIs.
- The OSRM and Nominatim public services are intended for development use and have usage limits.
- API credentials must remain in backend environment variables and must not be exposed to the frontend.
