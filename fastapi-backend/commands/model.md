---
name: model
description: Generate a Beanie document model with indexes, validation, and relationships
argument-hint: "[model_name] [--fields name:str,price:float] [--indexes field1,field2] [--embedded]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
---

# Generate Beanie Document Model

Generate a MongoDB document model using Beanie ODM with proper indexing and validation.

## Required Information

Before generating, gather:
1. **Model name** (e.g., "Product", "Order", "Customer")
2. **Fields** with types and constraints
3. **Indexes** - which fields need indexing
4. **Relationships** - links to other documents
5. **Embedded documents** - nested data structures

## Field Type Reference

Common field types:
- `str` - String
- `int` - Integer
- `float` - Float
- `bool` - Boolean
- `datetime` - DateTime
- `EmailStr` - Validated email
- `HttpUrl` - Validated URL
- `List[str]` - Array of strings
- `Dict[str, Any]` - Object/Map
- `Optional[str]` - Nullable field

## Generation Template

```python
from beanie import Document, Indexed, Link, BackLink, PydanticObjectId
from pydantic import Field, EmailStr, validator
from datetime import datetime
from typing import Optional, List
from enum import Enum

# Embedded document (if needed)
class Address(BaseModel):
    street: str
    city: str
    state: str
    postal_code: str
    country: str = "US"

# Enum for choices (if needed)
class Status(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"

class {ModelName}(Document):
    """
    {ModelName} document.

    Collection: {collection_name}
    """

    # Basic fields
    name: Indexed(str)  # Single field index
    email: Indexed(EmailStr, unique=True)  # Unique index

    # Optional fields
    description: Optional[str] = None

    # Constrained fields
    quantity: int = Field(ge=0, default=0)
    price: float = Field(ge=0)

    # Enum field
    status: Status = Status.PENDING

    # Embedded document
    address: Optional[Address] = None

    # Array fields
    tags: List[str] = []

    # Relationships
    owner: Link["User"]  # Reference to another document
    items: List[Link["Item"]] = []  # Array of references

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Custom validators
    @validator("name")
    def name_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()

    class Settings:
        name = "{collection_name}"  # MongoDB collection name
        use_state_management = True
        indexes = [
            # Compound index
            IndexModel(
                [("status", ASCENDING), ("created_at", DESCENDING)],
                name="status_created_idx"
            ),
            # Text index for search
            IndexModel(
                [("name", TEXT), ("description", TEXT)],
                name="search_idx"
            ),
            # TTL index (auto-delete)
            # IndexModel(
            #     [("expires_at", ASCENDING)],
            #     expireAfterSeconds=0,
            #     name="ttl_idx"
            # )
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Example",
                "email": "example@test.com"
            }
        }

    # Instance methods
    async def update_timestamp(self):
        self.updated_at = datetime.utcnow()
        await self.save()

    # Class methods
    @classmethod
    async def find_by_status(cls, status: Status) -> List["{ModelName}"]:
        return await cls.find(cls.status == status).to_list()
```

## Relationship Patterns

### One-to-One Link

```python
class User(Document):
    profile: Link["Profile"]

class Profile(Document):
    user: BackLink[User] = Field(original_field="profile")
```

### One-to-Many

```python
class Author(Document):
    name: str
    books: List[BackLink["Book"]] = Field(original_field="author")

class Book(Document):
    title: str
    author: Link[Author]
```

### Many-to-Many

```python
class Student(Document):
    name: str
    courses: List[Link["Course"]] = []

class Course(Document):
    name: str
    students: List[BackLink[Student]] = Field(original_field="courses")
```

## Output

Generate file at appropriate location:
- `domains/{resource}/models.py` (domain-driven)
- `models/{model_name}.py` (layer-based)

## Post-Generation

After generating:
1. Add model to Beanie initialization list
2. Create corresponding schema if needed
3. Run migrations if structure changed
