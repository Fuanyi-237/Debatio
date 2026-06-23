from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import connect_db, disconnect_db
from app.api.auth import router as auth_router
from app.api.sessions import router as sessions_router
from app.api.arguments import router as arguments_router
from app.api.votes import router as votes_router
from app.websocket.socket_manager import sio


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await disconnect_db()


app = FastAPI(
    title="Debatio API",
    description="Structured Debate & Roundtable Platform",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(sessions_router, prefix="/api/sessions", tags=["sessions"])
app.include_router(arguments_router, prefix="/api/arguments", tags=["arguments"])
app.include_router(votes_router, prefix="/api/votes", tags=["votes"])

# Mount Socket.IO ASGI app
from socketio import ASGIApp as SocketIOApp
app.mount("/socket.io", SocketIOApp(sio))


@app.get("/")
async def root():
    return {"message": "Debatio API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
