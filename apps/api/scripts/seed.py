import asyncio
import logging
import uuid

from kerf.db.session import async_session_maker, init_db
from kerf.models.project import Project
from kerf.models.user import User
from sqlalchemy import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kerf.seed")


async def seed() -> None:
    logger.info("Initializing database migrations...")
    await init_db()

    async with async_session_maker() as session:
        # 1. Seed demo user
        res = await session.execute(
            select(User).where(User.email == "demo@kerf.dev")
        )
        user = res.scalar_one_or_none()
        if not user:
            user = User(id=uuid.uuid4(), email="demo@kerf.dev")
            session.add(user)
            await session.commit()
            await session.refresh(user)
            print(f"Seeded demo user: {user.email} (id: {user.id})")
        else:
            print(f"Demo user already exists: {user.email} (id: {user.id})")

        # 2. Seed default project
        res_p = await session.execute(
            select(Project).where(
                Project.owner_id == user.id, Project.name == "Demo Project"
            )
        )
        project = res_p.scalar_one_or_none()
        if not project:
            project = Project(
                id=uuid.uuid4(),
                owner_id=user.id,
                name="Demo Project",
                fps_num=30,
                fps_den=1,
                width=1920,
                height=1080,
            )
            session.add(project)
            await session.commit()
            await session.refresh(project)
            print(f"Seeded demo project: {project.name} (id: {project.id})")
        else:
            print(f"Demo project already exists: {project.name} (id: {project.id})")


if __name__ == "__main__":
    asyncio.run(seed())
