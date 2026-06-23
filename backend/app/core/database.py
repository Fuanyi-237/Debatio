from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client: AsyncIOMotorClient = None

db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)
    await db.sessions.create_index("session_code", unique=True)
    await db.sessions.create_index("host_id")
    await db.sessions.create_index("status")
    await db.arguments.create_index("session_id")
    await db.arguments.create_index("parent_id")
    
    print("Connected to MongoDB")


async def disconnect_db():
    global client
    if client:
        client.close()
        print("Disconnected from MongoDB")


def get_db():
    return db
