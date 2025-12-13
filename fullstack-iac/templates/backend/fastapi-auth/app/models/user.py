"""
User model for in-memory storage.
Replace with SQLAlchemy/Pydantic models for database persistence.
"""
from typing import Optional, List, Dict
from datetime import datetime
from app.core.security import get_password_hash

class User:
    """User model"""
    def __init__(
        self,
        username: str,
        email: str,
        hashed_password: str,
        full_name: Optional[str] = None,
        is_active: bool = True,
        is_superuser: bool = False,
        created_at: Optional[datetime] = None
    ):
        self.username = username
        self.email = email
        self.hashed_password = hashed_password
        self.full_name = full_name
        self.is_active = is_active
        self.is_superuser = is_superuser
        self.created_at = created_at or datetime.utcnow()

    def to_dict(self) -> Dict:
        """Convert to dictionary (excluding password)"""
        return {
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "is_active": self.is_active,
            "is_superuser": self.is_superuser,
            "created_at": self.created_at.isoformat()
        }

# In-memory user database (replace with real database)
users_db: Dict[str, User] = {}

def create_user(username: str, email: str, password: str, full_name: Optional[str] = None) -> User:
    """Create a new user"""
    if username in users_db:
        raise ValueError("Username already exists")

    user = User(
        username=username,
        email=email,
        hashed_password=get_password_hash(password),
        full_name=full_name
    )
    users_db[username] = user
    return user

def get_user(username: str) -> Optional[User]:
    """Get user by username"""
    return users_db.get(username)

def get_user_by_email(email: str) -> Optional[User]:
    """Get user by email"""
    for user in users_db.values():
        if user.email == email:
            return user
    return None

def list_users() -> List[User]:
    """List all users"""
    return list(users_db.values())

# Create a default test user
create_user(
    username="testuser",
    email="test@example.com",
    password="testpass123",
    full_name="Test User"
)
