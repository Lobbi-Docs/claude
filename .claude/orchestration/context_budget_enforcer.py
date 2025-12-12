"""
Context Budget Enforcement System

Prevents runaway context growth by enforcing token budgets and
providing automatic alerts when approaching limits.
"""

from dataclasses import dataclass
from typing import Dict, Optional
from datetime import datetime
import json


@dataclass
class BudgetAllocation:
    """Track budget allocation for a component"""
    component: str
    allocated_tokens: int
    actual_usage: int
    timestamp: datetime
    status: str  # active|released|exceeded


class ContextBudgetExceeded(Exception):
    """Raised when context budget is exceeded"""
    pass


class ContextBudgetEnforcer:
    """
    Enforce token budgets across components to prevent context overflow

    Token Budgets by Component:
    - EXPLORE phase: 10,000 tokens max
    - PLAN phase: 5,000 tokens max
    - CODE phase: 15,000 tokens max (largest allocation)
    - TEST phase: 8,000 tokens max
    - FIX phase: 5,000 tokens max
    - DOCUMENT phase: 4,000 tokens max
    - Registry indexes: 5,400 tokens max
    - Active checkpoints: 1,200 tokens max
    - MCP tool definitions: 3,000 tokens max
    """

    # Default budget allocations
    DEFAULT_ALLOCATIONS = {
        "explore": 10000,
        "plan": 5000,
        "code": 15000,
        "test": 8000,
        "fix": 5000,
        "document": 4000,
        "registry": 5400,
        "checkpoints": 1200,
        "mcp_tools": 3000,
        "overhead": 3000  # System overhead
    }

    def __init__(self, total_budget: int = 100000):
        """
        Initialize budget enforcer

        Args:
            total_budget: Total token budget (default 100k)
        """
        self.total_budget = total_budget
        self.current_usage = 0
        self.allocations: Dict[str, BudgetAllocation] = {}
        self.allocation_history = []

        # Reserve overhead budget
        self._reserve_overhead()

    def _reserve_overhead(self):
        """Reserve budget for system overhead"""
        overhead = self.DEFAULT_ALLOCATIONS["overhead"]
        self.allocations["overhead"] = BudgetAllocation(
            component="overhead",
            allocated_tokens=overhead,
            actual_usage=overhead,
            timestamp=datetime.now(),
            status="active"
        )
        self.current_usage += overhead

    def allocate_budget(
        self,
        component: str,
        tokens: Optional[int] = None,
        allow_exceed: bool = False
    ) -> 'BudgetGuard':
        """
        Reserve tokens for component

        Args:
            component: Component name (e.g., "explore", "code")
            tokens: Token allocation (uses default if not specified)
            allow_exceed: Allow allocation even if exceeds total budget

        Returns:
            BudgetGuard context manager

        Raises:
            ContextBudgetExceeded: If allocation would exceed budget
        """
        # Use default allocation if not specified
        if tokens is None:
            tokens = self.DEFAULT_ALLOCATIONS.get(component, 5000)

        # Check if allocation would exceed budget
        available = self.total_budget - self.current_usage
        if tokens > available and not allow_exceed:
            raise ContextBudgetExceeded(
                f"Cannot allocate {tokens:,} tokens for '{component}'. "
                f"Only {available:,} tokens available (Total budget: {self.total_budget:,}, "
                f"Current usage: {self.current_usage:,})"
            )

        # Create allocation
        allocation = BudgetAllocation(
            component=component,
            allocated_tokens=tokens,
            actual_usage=0,
            timestamp=datetime.now(),
            status="active"
        )

        self.allocations[component] = allocation
        self.current_usage += tokens

        # Log allocation
        self._log_allocation("allocate", component, tokens)

        print(f"✓ Allocated {tokens:,} tokens for {component} ({self.get_usage_percentage():.1f}% total budget used)")

        return BudgetGuard(self, component, tokens)

    def release_budget(self, component: str, actual_usage: Optional[int] = None):
        """
        Free tokens when component completes

        Args:
            component: Component name
            actual_usage: Actual tokens used (for tracking efficiency)
        """
        if component not in self.allocations:
            print(f"⚠️ Warning: No allocation found for {component}")
            return

        allocation = self.allocations[component]

        # Update actual usage
        if actual_usage is not None:
            allocation.actual_usage = actual_usage

        # Release budget
        self.current_usage -= allocation.allocated_tokens
        allocation.status = "released"

        # Calculate efficiency
        efficiency = (allocation.actual_usage / allocation.allocated_tokens * 100) if allocation.allocated_tokens > 0 else 0

        # Log release
        self._log_allocation("release", component, allocation.allocated_tokens, actual_usage)

        print(f"✓ Released {allocation.allocated_tokens:,} tokens from {component} "
              f"(Used: {allocation.actual_usage:,}, Efficiency: {efficiency:.1f}%)")

    def check_budget_health(self) -> str:
        """
        Alert when approaching limits

        Returns:
            Health status message with appropriate emoji
        """
        usage_pct = self.get_usage_percentage()

        if usage_pct > 90:
            return f"⚠️ CRITICAL: {usage_pct:.1f}% budget used - COMPRESS CONTEXT NOW"
        elif usage_pct > 75:
            return f"⚠️ WARNING: {usage_pct:.1f}% budget used - Consider checkpointing"
        elif usage_pct > 50:
            return f"ℹ️ INFO: {usage_pct:.1f}% budget used - Monitor closely"
        else:
            return f"✅ OK: {usage_pct:.1f}% budget used - Budget healthy"

    def get_usage_percentage(self) -> float:
        """Calculate current budget usage percentage"""
        return (self.current_usage / self.total_budget) * 100

    def get_available_budget(self) -> int:
        """Get available token budget"""
        return max(0, self.total_budget - self.current_usage)

    def get_budget_report(self) -> Dict:
        """
        Generate comprehensive budget report

        Returns:
            Dictionary with budget statistics
        """
        active_allocations = {
            name: alloc for name, alloc in self.allocations.items()
            if alloc.status == "active"
        }

        released_allocations = {
            name: alloc for name, alloc in self.allocations.items()
            if alloc.status == "released"
        }

        # Calculate efficiency for released allocations
        total_allocated = sum(alloc.allocated_tokens for alloc in released_allocations.values())
        total_used = sum(alloc.actual_usage for alloc in released_allocations.values())
        efficiency = (total_used / total_allocated * 100) if total_allocated > 0 else 0

        return {
            "total_budget": self.total_budget,
            "current_usage": self.current_usage,
            "available": self.get_available_budget(),
            "usage_percentage": self.get_usage_percentage(),
            "health_status": self.check_budget_health(),
            "active_allocations": {
                name: {
                    "allocated": alloc.allocated_tokens,
                    "timestamp": alloc.timestamp.isoformat()
                }
                for name, alloc in active_allocations.items()
            },
            "released_allocations": {
                name: {
                    "allocated": alloc.allocated_tokens,
                    "used": alloc.actual_usage,
                    "efficiency": f"{(alloc.actual_usage / alloc.allocated_tokens * 100):.1f}%"
                }
                for name, alloc in released_allocations.items()
            },
            "overall_efficiency": f"{efficiency:.1f}%"
        }

    def print_budget_report(self):
        """Print formatted budget report"""
        report = self.get_budget_report()

        print("\n" + "=" * 70)
        print("CONTEXT BUDGET REPORT")
        print("=" * 70)
        print(f"Total Budget:     {report['total_budget']:,} tokens")
        print(f"Current Usage:    {report['current_usage']:,} tokens ({report['usage_percentage']:.1f}%)")
        print(f"Available:        {report['available']:,} tokens")
        print(f"Health Status:    {report['health_status']}")
        print(f"Overall Efficiency: {report['overall_efficiency']}")

        if report['active_allocations']:
            print("\n--- Active Allocations ---")
            for name, data in report['active_allocations'].items():
                print(f"  {name:20s} {data['allocated']:>8,} tokens")

        if report['released_allocations']:
            print("\n--- Released Allocations (Completed) ---")
            for name, data in report['released_allocations'].items():
                print(f"  {name:20s} Allocated: {data['allocated']:>8,}, "
                      f"Used: {data['used']:>8,}, Efficiency: {data['efficiency']}")

        print("=" * 70 + "\n")

    def _log_allocation(
        self,
        action: str,
        component: str,
        allocated: int,
        actual: Optional[int] = None
    ):
        """Log allocation event"""
        event = {
            "timestamp": datetime.now().isoformat(),
            "action": action,
            "component": component,
            "allocated_tokens": allocated,
            "actual_tokens": actual,
            "total_usage": self.current_usage,
            "usage_percentage": self.get_usage_percentage()
        }
        self.allocation_history.append(event)

    def suggest_optimization(self) -> list:
        """
        Suggest optimizations based on allocation history

        Returns:
            List of optimization suggestions
        """
        suggestions = []

        # Analyze released allocations for over-allocation
        for name, alloc in self.allocations.items():
            if alloc.status == "released" and alloc.actual_usage > 0:
                efficiency = alloc.actual_usage / alloc.allocated_tokens

                if efficiency < 0.5:
                    suggestions.append(
                        f"🔧 {name}: Allocated {alloc.allocated_tokens:,} but used only {alloc.actual_usage:,} "
                        f"({efficiency * 100:.1f}%). Consider reducing allocation to {alloc.actual_usage * 1.2:.0f} tokens."
                    )

                if efficiency > 0.95:
                    suggestions.append(
                        f"📈 {name}: Used {efficiency * 100:.1f}% of allocation. Consider increasing budget "
                        f"from {alloc.allocated_tokens:,} to {alloc.allocated_tokens * 1.2:.0f} tokens."
                    )

        # Check overall budget health
        if self.get_usage_percentage() > 80:
            suggestions.append(
                "⚠️ URGENT: Budget >80% used. Implement checkpointing immediately to free up context."
            )

        return suggestions


class BudgetGuard:
    """Context manager for budget enforcement"""

    def __init__(self, enforcer: ContextBudgetEnforcer, component: str, tokens: int):
        self.enforcer = enforcer
        self.component = component
        self.tokens = tokens
        self.actual_usage = 0

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Auto-release budget on context exit"""
        self.enforcer.release_budget(self.component, self.actual_usage)

    def update_usage(self, tokens: int):
        """Update actual token usage"""
        self.actual_usage = tokens


# Example usage
if __name__ == "__main__":
    print("Testing Context Budget Enforcer\n")

    # Initialize with 100k token budget
    budget = ContextBudgetEnforcer(total_budget=100000)

    # Phase 1: EXPLORE
    print("\n--- PHASE 1: EXPLORE ---")
    with budget.allocate_budget("explore") as guard:
        # Simulate work
        guard.update_usage(7500)  # Actually used 7,500 tokens
        print(f"  Exploring codebase... using ~7,500 tokens")

    # Phase 2: PLAN
    print("\n--- PHASE 2: PLAN ---")
    with budget.allocate_budget("plan") as guard:
        guard.update_usage(3200)
        print(f"  Planning implementation... using ~3,200 tokens")

    # Phase 3: CODE
    print("\n--- PHASE 3: CODE ---")
    with budget.allocate_budget("code") as guard:
        guard.update_usage(12000)
        print(f"  Implementing code... using ~12,000 tokens")

    # Phase 4: TEST
    print("\n--- PHASE 4: TEST ---")
    with budget.allocate_budget("test") as guard:
        guard.update_usage(6500)
        print(f"  Writing tests... using ~6,500 tokens")

    # Print budget report
    budget.print_budget_report()

    # Get optimization suggestions
    print("\n--- OPTIMIZATION SUGGESTIONS ---")
    suggestions = budget.suggest_optimization()
    if suggestions:
        for suggestion in suggestions:
            print(suggestion)
    else:
        print("✅ No optimizations needed - budget usage is efficient")

    # Save allocation history
    print("\n--- ALLOCATION HISTORY ---")
    history_file = ".claude/orchestration/db/budget-history.json"
    with open(history_file, 'w') as f:
        json.dump(budget.allocation_history, f, indent=2)
    print(f"Saved allocation history to {history_file}")
