"""
Agent Registry for LangGraph MCP Server

Manages registration, discovery, and loading of LangGraph agents.
Provides a centralized registry for agent metadata and lifecycle management.

Features:
- Dynamic agent registration and discovery
- Agent metadata management
- Module loading and validation
- Agent introspection
- Persistence to JSON

Registry Structure:
    ~/.langgraph/agents/
    ├── registry.json          # Agent metadata registry
    ├── agent_1/
    │   ├── agent.py          # Agent implementation
    │   ├── config.json       # Agent configuration
    │   └── requirements.txt  # Agent dependencies
    ├── agent_2/
    │   └── ...
    └── ...
"""

import json
import logging
import sys
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Dict, List, Optional, Any, Set
from datetime import datetime
import importlib.util

logger = logging.getLogger("agent-registry")


@dataclass
class AgentMetadata:
    """Metadata for a LangGraph agent"""

    # Core identification
    id: str
    name: str
    description: str
    version: str = "1.0.0"

    # Agent characteristics
    agent_type: str = "general"  # general, supervisor, worker, specialized
    model: Optional[str] = None
    capabilities: List[str] = field(default_factory=list)
    tools: List[str] = field(default_factory=list)

    # File paths
    module_path: Optional[str] = None
    config_path: Optional[str] = None

    # Metadata
    author: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    tags: List[str] = field(default_factory=list)

    # Runtime info
    enabled: bool = True
    health_status: str = "unknown"  # healthy, unhealthy, unknown
    last_invoked: Optional[str] = None
    invocation_count: int = 0

    # Dependencies
    dependencies: List[str] = field(default_factory=list)
    python_version: str = ">=3.10"

    # Configuration
    default_config: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AgentMetadata':
        """Create from dictionary"""
        return cls(**data)


class AgentRegistry:
    """Registry for managing LangGraph agents"""

    def __init__(self, registry_path: Optional[str] = None):
        """
        Initialize the agent registry.

        Args:
            registry_path: Path to registry directory.
                          Defaults to ~/.langgraph/agents
        """
        if registry_path:
            self.registry_path = Path(registry_path)
        else:
            self.registry_path = Path.home() / ".langgraph" / "agents"

        # Ensure directory exists
        self.registry_path.mkdir(parents=True, exist_ok=True)

        # Registry file
        self.registry_file = self.registry_path / "registry.json"

        # In-memory cache
        self._agents: Dict[str, AgentMetadata] = {}
        self._loaded_modules: Dict[str, Any] = {}

        # Load registry
        self._load_registry()

        logger.info(f"Initialized agent registry at: {self.registry_path}")

    def _load_registry(self):
        """Load agent registry from disk"""
        if self.registry_file.exists():
            try:
                with open(self.registry_file, 'r') as f:
                    data = json.load(f)

                for agent_id, agent_data in data.items():
                    self._agents[agent_id] = AgentMetadata.from_dict(agent_data)

                logger.info(f"Loaded {len(self._agents)} agents from registry")
            except Exception as e:
                logger.error(f"Error loading registry: {str(e)}")
                self._agents = {}
        else:
            logger.info("No existing registry found, starting fresh")
            self._agents = {}
            self._save_registry()

    def _save_registry(self):
        """Save agent registry to disk"""
        try:
            data = {agent_id: agent.to_dict()
                   for agent_id, agent in self._agents.items()}

            with open(self.registry_file, 'w') as f:
                json.dump(data, f, indent=2)

            logger.debug("Registry saved to disk")
        except Exception as e:
            logger.error(f"Error saving registry: {str(e)}")

    def register_agent(
        self,
        agent_id: str,
        name: str,
        description: str,
        module_path: str,
        **kwargs
    ) -> AgentMetadata:
        """
        Register a new agent in the registry.

        Args:
            agent_id: Unique identifier for the agent
            name: Human-readable name
            description: Agent description
            module_path: Path to agent module file
            **kwargs: Additional metadata fields

        Returns:
            AgentMetadata object

        Raises:
            ValueError: If agent_id already exists
        """
        if agent_id in self._agents:
            raise ValueError(f"Agent already registered: {agent_id}")

        # Validate module path
        module_file = Path(module_path)
        if not module_file.exists():
            raise FileNotFoundError(f"Module file not found: {module_path}")

        # Create metadata
        metadata = AgentMetadata(
            id=agent_id,
            name=name,
            description=description,
            module_path=str(module_file.absolute()),
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
            **kwargs
        )

        # Add to registry
        self._agents[agent_id] = metadata
        self._save_registry()

        logger.info(f"Registered agent: {agent_id} ({name})")
        return metadata

    def unregister_agent(self, agent_id: str) -> bool:
        """
        Unregister an agent from the registry.

        Args:
            agent_id: Agent to unregister

        Returns:
            True if agent was unregistered, False if not found
        """
        if agent_id in self._agents:
            del self._agents[agent_id]

            # Also remove from loaded modules
            if agent_id in self._loaded_modules:
                del self._loaded_modules[agent_id]

            self._save_registry()
            logger.info(f"Unregistered agent: {agent_id}")
            return True

        return False

    def update_agent_metadata(
        self,
        agent_id: str,
        **updates
    ) -> Optional[AgentMetadata]:
        """
        Update agent metadata.

        Args:
            agent_id: Agent to update
            **updates: Fields to update

        Returns:
            Updated AgentMetadata or None if not found
        """
        if agent_id not in self._agents:
            return None

        metadata = self._agents[agent_id]

        # Update fields
        for key, value in updates.items():
            if hasattr(metadata, key):
                setattr(metadata, key, value)

        # Update timestamp
        metadata.updated_at = datetime.now().isoformat()

        self._save_registry()
        logger.debug(f"Updated metadata for agent: {agent_id}")

        return metadata

    def get_agent_metadata(self, agent_id: str) -> Optional[AgentMetadata]:
        """
        Get metadata for an agent.

        Args:
            agent_id: Agent identifier

        Returns:
            AgentMetadata or None if not found
        """
        return self._agents.get(agent_id)

    def list_agents(
        self,
        enabled_only: bool = True,
        agent_type: Optional[str] = None,
        tags: Optional[Set[str]] = None
    ) -> Dict[str, AgentMetadata]:
        """
        List registered agents with optional filtering.

        Args:
            enabled_only: Only return enabled agents
            agent_type: Filter by agent type
            tags: Filter by tags (agent must have all specified tags)

        Returns:
            Dictionary of agent_id -> AgentMetadata
        """
        agents = {}

        for agent_id, metadata in self._agents.items():
            # Apply filters
            if enabled_only and not metadata.enabled:
                continue

            if agent_type and metadata.agent_type != agent_type:
                continue

            if tags and not tags.issubset(set(metadata.tags)):
                continue

            agents[agent_id] = metadata

        return agents

    def agent_exists(self, agent_id: str) -> bool:
        """Check if an agent is registered"""
        return agent_id in self._agents

    def load_agent(self, agent_id: str, force_reload: bool = False) -> Optional[Any]:
        """
        Load an agent module dynamically.

        Args:
            agent_id: Agent to load
            force_reload: Force reload even if cached

        Returns:
            Loaded module or None if failed
        """
        # Check cache first
        if not force_reload and agent_id in self._loaded_modules:
            logger.debug(f"Returning cached module for agent: {agent_id}")
            return self._loaded_modules[agent_id]

        # Get metadata
        metadata = self.get_agent_metadata(agent_id)
        if not metadata:
            logger.error(f"Agent not found in registry: {agent_id}")
            return None

        if not metadata.module_path:
            logger.error(f"No module path specified for agent: {agent_id}")
            return None

        # Load module
        try:
            module_path = Path(metadata.module_path)
            if not module_path.exists():
                logger.error(f"Module file not found: {module_path}")
                self.update_agent_metadata(agent_id, health_status="unhealthy")
                return None

            # Create module spec
            spec = importlib.util.spec_from_file_location(
                f"agent_{agent_id}",
                str(module_path)
            )

            if spec is None or spec.loader is None:
                logger.error(f"Failed to create module spec for: {module_path}")
                return None

            # Load module
            module = importlib.util.module_from_spec(spec)
            sys.modules[f"agent_{agent_id}"] = module
            spec.loader.exec_module(module)

            # Cache module
            self._loaded_modules[agent_id] = module

            # Update health status
            self.update_agent_metadata(agent_id, health_status="healthy")

            logger.info(f"Loaded agent module: {agent_id}")
            return module

        except Exception as e:
            logger.error(f"Error loading agent {agent_id}: {str(e)}", exc_info=True)
            self.update_agent_metadata(agent_id, health_status="unhealthy")
            return None

    def validate_agent(self, agent_id: str) -> bool:
        """
        Validate that an agent module can be loaded and has required attributes.

        Args:
            agent_id: Agent to validate

        Returns:
            True if valid, False otherwise
        """
        module = self.load_agent(agent_id)

        if not module:
            return False

        # Check for required attributes
        required_attrs = ['graph']  # or 'create_graph'

        has_graph = hasattr(module, 'graph')
        has_create_graph = hasattr(module, 'create_graph')

        if not (has_graph or has_create_graph):
            logger.error(f"Agent {agent_id} missing required attribute: graph or create_graph")
            self.update_agent_metadata(agent_id, health_status="unhealthy")
            return False

        self.update_agent_metadata(agent_id, health_status="healthy")
        return True

    def discover_agents(self, scan_path: Optional[Path] = None) -> int:
        """
        Discover and register agents from a directory.

        Looks for agent.py files in subdirectories and attempts to
        register them based on metadata files or module inspection.

        Args:
            scan_path: Path to scan. Defaults to registry_path.

        Returns:
            Number of agents discovered and registered
        """
        if scan_path is None:
            scan_path = self.registry_path

        scan_path = Path(scan_path)
        discovered = 0

        logger.info(f"Scanning for agents in: {scan_path}")

        # Look for agent.py files
        for agent_file in scan_path.rglob("agent.py"):
            agent_dir = agent_file.parent
            agent_id = agent_dir.name

            # Skip if already registered
            if self.agent_exists(agent_id):
                logger.debug(f"Agent already registered: {agent_id}")
                continue

            # Look for config.json
            config_file = agent_dir / "config.json"

            if config_file.exists():
                try:
                    with open(config_file, 'r') as f:
                        config = json.load(f)

                    # Register from config
                    self.register_agent(
                        agent_id=agent_id,
                        name=config.get("name", agent_id),
                        description=config.get("description", "No description"),
                        module_path=str(agent_file),
                        **{k: v for k, v in config.items()
                           if k not in ["name", "description"]}
                    )

                    discovered += 1
                    logger.info(f"Discovered and registered agent: {agent_id}")

                except Exception as e:
                    logger.error(f"Error registering agent {agent_id}: {str(e)}")
            else:
                # Register with minimal metadata
                try:
                    self.register_agent(
                        agent_id=agent_id,
                        name=agent_id.replace("_", " ").title(),
                        description=f"Agent: {agent_id}",
                        module_path=str(agent_file)
                    )
                    discovered += 1
                    logger.info(f"Discovered and registered agent: {agent_id}")
                except Exception as e:
                    logger.error(f"Error registering agent {agent_id}: {str(e)}")

        return discovered

    def get_agent_stats(self) -> Dict[str, Any]:
        """Get statistics about registered agents"""
        total = len(self._agents)
        enabled = sum(1 for a in self._agents.values() if a.enabled)
        healthy = sum(1 for a in self._agents.values() if a.health_status == "healthy")

        types = {}
        for agent in self._agents.values():
            agent_type = agent.agent_type
            types[agent_type] = types.get(agent_type, 0) + 1

        return {
            "total_agents": total,
            "enabled_agents": enabled,
            "healthy_agents": healthy,
            "unhealthy_agents": total - healthy,
            "agent_types": types,
            "registry_path": str(self.registry_path),
            "registry_file": str(self.registry_file)
        }

    def export_registry(self, output_path: str) -> bool:
        """
        Export registry to a JSON file.

        Args:
            output_path: Path to export file

        Returns:
            True if successful
        """
        try:
            with open(output_path, 'w') as f:
                json.dump(
                    {agent_id: agent.to_dict() for agent_id, agent in self._agents.items()},
                    f,
                    indent=2
                )
            logger.info(f"Exported registry to: {output_path}")
            return True
        except Exception as e:
            logger.error(f"Error exporting registry: {str(e)}")
            return False

    def import_registry(self, input_path: str, merge: bool = True) -> int:
        """
        Import agents from a JSON file.

        Args:
            input_path: Path to import file
            merge: If True, merge with existing registry. If False, replace.

        Returns:
            Number of agents imported
        """
        try:
            with open(input_path, 'r') as f:
                data = json.load(f)

            if not merge:
                self._agents = {}

            imported = 0
            for agent_id, agent_data in data.items():
                if agent_id in self._agents and merge:
                    logger.debug(f"Skipping existing agent: {agent_id}")
                    continue

                self._agents[agent_id] = AgentMetadata.from_dict(agent_data)
                imported += 1

            self._save_registry()
            logger.info(f"Imported {imported} agents from: {input_path}")
            return imported

        except Exception as e:
            logger.error(f"Error importing registry: {str(e)}")
            return 0
