---
name: endpoint
description: Generate a complete FastAPI CRUD endpoint with router, schemas, service layer, and tests
argument-hint: "[resource_name] [--fields name:str,email:str] [--auth] [--cache]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
---

# Generate FastAPI Endpoint

Generate a complete CRUD endpoint for a FastAPI application with MongoDB/Beanie.

## Required Information

Before generating, gather:
1. **Resource name** (e.g., "product", "order", "customer")
2. **Fields** with types (e.g., name:str, price:float, quantity:int)
3. **Authentication required?** (adds Keycloak auth dependency)
4. **Caching enabled?** (adds Redis cache layer)

## Generation Steps

### 1. Analyze Project Structure

First, identify the project structure:
- Check if using domain-driven (`app/domains/`) or layer-based (`app/routes/`)
- Find existing patterns in the codebase
- Identify import conventions

### 2. Generate Schema (schemas.py)

Create Pydantic schemas for request/response:

```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class {Resource}Base(BaseModel):
    # Add fields from user input
    pass

class {Resource}Create({Resource}Base):
    pass

class {Resource}Update(BaseModel):
    # All fields optional for partial update
    pass

class {Resource}Response({Resource}Base):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

### 3. Generate Model (models.py)

Create Beanie document model:

```python
from beanie import Document, Indexed
from datetime import datetime
from pydantic import Field

class {Resource}(Document):
    # Add fields with indexes as needed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "{resources}"  # Collection name (plural)
```

### 4. Generate Service (service.py)

Create service layer with business logic:

```python
from typing import List, Optional
from beanie import PydanticObjectId

class {Resource}Service:
    async def get_all(self, skip: int = 0, limit: int = 100) -> List[{Resource}]:
        return await {Resource}.find_all().skip(skip).limit(limit).to_list()

    async def get_by_id(self, id: str) -> Optional[{Resource}]:
        return await {Resource}.get(PydanticObjectId(id))

    async def create(self, data: {Resource}Create) -> {Resource}:
        resource = {Resource}(**data.model_dump())
        await resource.insert()
        return resource

    async def update(self, id: str, data: {Resource}Update) -> Optional[{Resource}]:
        resource = await self.get_by_id(id)
        if not resource:
            return None
        update_data = data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        await resource.set(update_data)
        return resource

    async def delete(self, id: str) -> bool:
        resource = await self.get_by_id(id)
        if not resource:
            return False
        await resource.delete()
        return True
```

### 5. Generate Router (router.py)

Create FastAPI router with all CRUD operations:

```python
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List

router = APIRouter(prefix="/{resources}", tags=["{Resources}"])

def get_service() -> {Resource}Service:
    return {Resource}Service()

@router.get("/", response_model=List[{Resource}Response])
async def list_{resources}(
    skip: int = 0,
    limit: int = 100,
    service: {Resource}Service = Depends(get_service)
):
    return await service.get_all(skip, limit)

@router.get("/{id}", response_model={Resource}Response)
async def get_{resource}(
    id: str,
    service: {Resource}Service = Depends(get_service)
):
    resource = await service.get_by_id(id)
    if not resource:
        raise HTTPException(status_code=404, detail="{Resource} not found")
    return resource

@router.post("/", response_model={Resource}Response, status_code=status.HTTP_201_CREATED)
async def create_{resource}(
    data: {Resource}Create,
    service: {Resource}Service = Depends(get_service)
):
    return await service.create(data)

@router.patch("/{id}", response_model={Resource}Response)
async def update_{resource}(
    id: str,
    data: {Resource}Update,
    service: {Resource}Service = Depends(get_service)
):
    resource = await service.update(id, data)
    if not resource:
        raise HTTPException(status_code=404, detail="{Resource} not found")
    return resource

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_{resource}(
    id: str,
    service: {Resource}Service = Depends(get_service)
):
    if not await service.delete(id):
        raise HTTPException(status_code=404, detail="{Resource} not found")
```

### 6. Generate Tests (test_{resource}.py)

Create pytest tests:

```python
import pytest
from httpx import AsyncClient

@pytest.fixture
async def sample_{resource}(client: AsyncClient):
    response = await client.post("/{resources}/", json={...})
    return response.json()

@pytest.mark.asyncio
async def test_create_{resource}(client: AsyncClient):
    response = await client.post("/{resources}/", json={...})
    assert response.status_code == 201
    assert "id" in response.json()

@pytest.mark.asyncio
async def test_get_{resource}(client: AsyncClient, sample_{resource}):
    response = await client.get(f"/{resources}/{sample_{resource}['id']}")
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_list_{resources}(client: AsyncClient):
    response = await client.get("/{resources}/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_update_{resource}(client: AsyncClient, sample_{resource}):
    response = await client.patch(
        f"/{resources}/{sample_{resource}['id']}",
        json={...}
    )
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_delete_{resource}(client: AsyncClient, sample_{resource}):
    response = await client.delete(f"/{resources}/{sample_{resource}['id']}")
    assert response.status_code == 204
```

## Output Files

Generate these files in the appropriate location:
- `domains/{resource}/schemas.py` or `schemas/{resource}.py`
- `domains/{resource}/models.py` or `models/{resource}.py`
- `domains/{resource}/service.py` or `services/{resource}.py`
- `domains/{resource}/router.py` or `routes/{resource}.py`
- `tests/test_{resource}.py`

## Post-Generation

After generating:
1. Add model to Beanie initialization in `database.py`
2. Include router in main app
3. Run tests to verify
