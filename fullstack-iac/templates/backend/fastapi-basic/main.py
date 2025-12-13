"""
FastAPI Basic Template
A minimal FastAPI application with essential endpoints and middleware.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from datetime import datetime

# Application metadata
app = FastAPI(
    title="FastAPI Basic Template",
    description="A minimal FastAPI application starter template",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class HealthCheck(BaseModel):
    """Health check response model"""
    status: str
    timestamp: datetime
    version: str

class Item(BaseModel):
    """Example item model"""
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    price: float
    tax: Optional[float] = None

class ItemResponse(BaseModel):
    """Item response with metadata"""
    item: Item
    created_at: datetime

# In-memory storage (replace with database in production)
items_db: List[Item] = []
item_id_counter = 1

# Routes
@app.get("/", tags=["Root"])
async def read_root():
    """Root endpoint with API information"""
    return {
        "message": "Welcome to FastAPI Basic Template",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health", response_model=HealthCheck, tags=["Health"])
async def health_check():
    """Health check endpoint for monitoring"""
    return HealthCheck(
        status="healthy",
        timestamp=datetime.now(),
        version="1.0.0"
    )

@app.post("/items", response_model=ItemResponse, status_code=201, tags=["Items"])
async def create_item(item: Item):
    """Create a new item"""
    global item_id_counter
    item.id = item_id_counter
    item_id_counter += 1
    items_db.append(item)
    return ItemResponse(item=item, created_at=datetime.now())

@app.get("/items", response_model=List[Item], tags=["Items"])
async def list_items(skip: int = 0, limit: int = 10):
    """List all items with pagination"""
    return items_db[skip : skip + limit]

@app.get("/items/{item_id}", response_model=Item, tags=["Items"])
async def get_item(item_id: int):
    """Get a specific item by ID"""
    for item in items_db:
        if item.id == item_id:
            return item
    raise HTTPException(status_code=404, detail="Item not found")

@app.put("/items/{item_id}", response_model=Item, tags=["Items"])
async def update_item(item_id: int, updated_item: Item):
    """Update an existing item"""
    for idx, item in enumerate(items_db):
        if item.id == item_id:
            updated_item.id = item_id
            items_db[idx] = updated_item
            return updated_item
    raise HTTPException(status_code=404, detail="Item not found")

@app.delete("/items/{item_id}", status_code=204, tags=["Items"])
async def delete_item(item_id: int):
    """Delete an item"""
    for idx, item in enumerate(items_db):
        if item.id == item_id:
            items_db.pop(idx)
            return
    raise HTTPException(status_code=404, detail="Item not found")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
