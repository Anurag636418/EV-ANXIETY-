import logging
import logging.config

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.charging import router as charging_router
from app.api.health import router as health_router
from app.api.places import router as places_router
from app.api.route import router as route_router
from app.api.trip import router as trip_router
from app.api.availability import router as availability_router
from app.api.vehicles import router as vehicles_router
from app.core.config import settings

# ── Logging configuration ──────────────────────────────────────────────────
# Set our service modules to DEBUG so structured charging/trip pipeline logs
# are visible in the uvicorn terminal output.
# Third-party libraries (httpx, uvicorn internals) stay at WARNING to keep
# the terminal readable.
logging.config.dictConfig(
    {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(levelname)-8s %(name)s  %(message)s",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "default",
            },
        },
        "loggers": {
            # Our services — full DEBUG output
            "app.services": {"level": "DEBUG", "handlers": ["console"], "propagate": False},
            # Silence noisy third-party loggers
            "httpx": {"level": "WARNING"},
            "httpcore": {"level": "WARNING"},
        },
    }
)

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(health_router)
app.include_router(places_router)
app.include_router(route_router)
app.include_router(charging_router)
app.include_router(trip_router)
app.include_router(availability_router)
app.include_router(vehicles_router)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    for err in exc.errors():
        if "Please select a location from the autocomplete suggestions." in err.get("msg", ""):
            return JSONResponse(
                status_code=400,
                content={"message": "Please select a location from the autocomplete suggestions."}
            )
    # Default 422 behavior
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body}
    )



@app.get("/")
def root() -> dict[str, str]:
    return {"message": "EV Trip Planner API"}
