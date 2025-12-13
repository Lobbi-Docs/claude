---
name: task
description: Generate a background task with ARQ, Celery, or Dramatiq
argument-hint: "[task_name] [--framework arq|celery|dramatiq] [--scheduled] [--retry]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
---

# Generate Background Task

Generate a background task for async processing using ARQ (recommended), Celery, or Dramatiq.

## Required Information

Before generating, gather:
1. **Task name** (e.g., "send_email", "process_order", "sync_inventory")
2. **Framework** - ARQ (default), Celery, or Dramatiq
3. **Scheduled?** - Does it run on a schedule (cron)?
4. **Retry policy** - Automatic retry on failure?
5. **Input parameters** - What data does the task need?

## ARQ Task Template (Recommended)

### Task Definition

```python
# app/tasks/email.py
from arq import cron
from typing import Any
import structlog

logger = structlog.get_logger()

async def send_welcome_email(ctx: dict, user_id: str, email: str):
    """
    Send welcome email to new user.

    Args:
        ctx: ARQ context with Redis pool
        user_id: User's unique identifier
        email: User's email address
    """
    logger.info("sending_welcome_email", user_id=user_id, email=email)

    try:
        # Get services from context
        email_service = ctx.get("email_service")

        await email_service.send_welcome(email)

        logger.info("welcome_email_sent", user_id=user_id)
        return {"status": "sent", "user_id": user_id}

    except Exception as e:
        logger.error("email_send_failed", user_id=user_id, error=str(e))
        raise  # ARQ will retry

async def process_order(ctx: dict, order_id: str):
    """Process an order asynchronously."""
    logger.info("processing_order", order_id=order_id)

    db = ctx.get("db")

    # Your order processing logic
    order = await db.orders.find_one({"_id": order_id})
    if not order:
        raise ValueError(f"Order {order_id} not found")

    # Process...
    await db.orders.update_one(
        {"_id": order_id},
        {"$set": {"status": "processed"}}
    )

    return {"order_id": order_id, "status": "processed"}

# Scheduled task (runs daily at midnight)
async def daily_cleanup(ctx: dict):
    """Clean up old data daily."""
    logger.info("running_daily_cleanup")
    # Cleanup logic
    return {"cleaned": True}
```

### Worker Configuration

```python
# app/tasks/worker.py
from arq import create_pool
from arq.connections import RedisSettings
from app.config import get_settings
from app.services.email import EmailService
from app.tasks.email import send_welcome_email, process_order, daily_cleanup

settings = get_settings()

async def startup(ctx: dict):
    """Initialize worker context."""
    ctx["email_service"] = EmailService(settings)
    # Add database connection, etc.

async def shutdown(ctx: dict):
    """Cleanup on worker shutdown."""
    pass

class WorkerSettings:
    """ARQ Worker Settings."""

    functions = [
        send_welcome_email,
        process_order,
    ]

    # Scheduled jobs (cron)
    cron_jobs = [
        cron(daily_cleanup, hour=0, minute=0),  # Midnight daily
    ]

    on_startup = startup
    on_shutdown = shutdown

    redis_settings = RedisSettings.from_dsn(settings.redis_url)

    # Retry settings
    max_tries = 3
    retry_delay = 60  # seconds

    # Job settings
    job_timeout = 300  # 5 minutes
    keep_result = 3600  # 1 hour
```

### Enqueue Tasks

```python
# app/services/task_queue.py
from arq import create_pool
from arq.connections import RedisSettings
from app.config import get_settings

settings = get_settings()

async def get_task_pool():
    return await create_pool(
        RedisSettings.from_dsn(settings.redis_url)
    )

async def enqueue_email(user_id: str, email: str):
    """Enqueue welcome email task."""
    pool = await get_task_pool()
    job = await pool.enqueue_job(
        "send_welcome_email",
        user_id,
        email
    )
    return job.job_id

async def enqueue_order_processing(order_id: str, delay: int = 0):
    """Enqueue order processing with optional delay."""
    pool = await get_task_pool()
    job = await pool.enqueue_job(
        "process_order",
        order_id,
        _defer_by=delay  # Delay in seconds
    )
    return job.job_id
```

## Celery Task Template

### Task Definition

```python
# app/tasks/celery_tasks.py
from celery import Celery
from celery.utils.log import get_task_logger
from app.config import get_settings

settings = get_settings()
logger = get_task_logger(__name__)

app = Celery(
    "tasks",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_routes={
        "app.tasks.*": {"queue": "default"},
        "app.tasks.email.*": {"queue": "email"},
    }
)

@app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True
)
def send_welcome_email(self, user_id: str, email: str):
    """Send welcome email (Celery task)."""
    logger.info(f"Sending welcome email to {email}")

    try:
        # Email sending logic
        return {"status": "sent", "user_id": user_id}
    except Exception as exc:
        logger.error(f"Email failed: {exc}")
        raise self.retry(exc=exc)

@app.task
def process_order(order_id: str):
    """Process order (Celery task)."""
    logger.info(f"Processing order {order_id}")
    # Processing logic
    return {"order_id": order_id, "status": "processed"}

# Scheduled task with beat
@app.task
def daily_cleanup():
    """Daily cleanup task."""
    logger.info("Running daily cleanup")
    return {"cleaned": True}
```

### Celery Beat Schedule

```python
# app/tasks/celery_config.py
from celery.schedules import crontab

app.conf.beat_schedule = {
    "daily-cleanup": {
        "task": "app.tasks.celery_tasks.daily_cleanup",
        "schedule": crontab(hour=0, minute=0),
    },
    "hourly-sync": {
        "task": "app.tasks.celery_tasks.sync_data",
        "schedule": crontab(minute=0),  # Every hour
    },
}
```

### Enqueue Celery Tasks

```python
from app.tasks.celery_tasks import send_welcome_email, process_order

# Immediate execution
send_welcome_email.delay(user_id, email)

# With countdown (delay)
process_order.apply_async(args=[order_id], countdown=60)

# With ETA
from datetime import datetime, timedelta
eta = datetime.utcnow() + timedelta(hours=1)
process_order.apply_async(args=[order_id], eta=eta)
```

## Dramatiq Task Template

### Task Definition

```python
# app/tasks/dramatiq_tasks.py
import dramatiq
from dramatiq.brokers.redis import RedisBroker
from dramatiq.middleware import CurrentMessage
import structlog

from app.config import get_settings

settings = get_settings()
logger = structlog.get_logger()

# Configure broker
redis_broker = RedisBroker(url=settings.redis_url)
dramatiq.set_broker(redis_broker)

@dramatiq.actor(
    max_retries=3,
    min_backoff=1000,
    max_backoff=60000,
    queue_name="email"
)
def send_welcome_email(user_id: str, email: str):
    """Send welcome email (Dramatiq task)."""
    logger.info("sending_welcome_email", user_id=user_id, email=email)

    # Email sending logic
    return {"status": "sent", "user_id": user_id}

@dramatiq.actor(
    max_retries=5,
    queue_name="orders",
    time_limit=300000  # 5 minutes
)
def process_order(order_id: str):
    """Process order (Dramatiq task)."""
    logger.info("processing_order", order_id=order_id)
    # Processing logic
    return {"order_id": order_id, "status": "processed"}
```

### Enqueue Dramatiq Tasks

```python
from app.tasks.dramatiq_tasks import send_welcome_email, process_order

# Immediate execution
send_welcome_email.send(user_id, email)

# With delay
send_welcome_email.send_with_options(
    args=(user_id, email),
    delay=60000  # milliseconds
)
```

## FastAPI Integration

### Dependency for Task Queue

```python
# app/dependencies.py
from fastapi import Depends
from arq import ArqRedis
from app.services.task_queue import get_task_pool

async def get_task_queue() -> ArqRedis:
    return await get_task_pool()

# In route
@router.post("/users/")
async def create_user(
    data: UserCreate,
    task_queue: ArqRedis = Depends(get_task_queue)
):
    user = await create_user_in_db(data)

    # Enqueue welcome email
    await task_queue.enqueue_job(
        "send_welcome_email",
        str(user.id),
        user.email
    )

    return user
```

## Running Workers

### ARQ

```bash
# Start worker
arq app.tasks.worker.WorkerSettings

# With multiple workers
arq app.tasks.worker.WorkerSettings --watch  # Auto-reload
```

### Celery

```bash
# Start worker
celery -A app.tasks.celery_tasks worker --loglevel=info

# Start beat (scheduler)
celery -A app.tasks.celery_tasks beat --loglevel=info

# Combined worker + beat
celery -A app.tasks.celery_tasks worker --beat --loglevel=info
```

### Dramatiq

```bash
# Start worker
dramatiq app.tasks.dramatiq_tasks

# With multiple processes
dramatiq app.tasks.dramatiq_tasks --processes 4 --threads 4
```

## Output Files

Generate at:
- `app/tasks/{task_name}.py` - Task definition
- `app/tasks/worker.py` - Worker configuration (if not exists)
- `app/services/task_queue.py` - Queue service (if not exists)
