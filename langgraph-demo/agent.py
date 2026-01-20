"""Simple LangGraph Agent Demo"""

from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_anthropic import ChatAnthropic


class AgentState(TypedDict):
    """State schema for the agent."""
    messages: Annotated[list, add_messages]


# Initialize the LLM
llm = ChatAnthropic(model="claude-sonnet-4-20250514")


def agent_node(state: AgentState) -> dict:
    """Process messages and generate a response."""
    response = llm.invoke(state["messages"])
    return {"messages": [response]}


def should_continue(state: AgentState) -> str:
    """Determine if we should continue or end."""
    last_message = state["messages"][-1]
    # If the AI says goodbye or completes the task, end
    if hasattr(last_message, "content"):
        content = last_message.content.lower()
        if any(word in content for word in ["goodbye", "bye", "farewell"]):
            return "end"
    return "continue"


# Build the graph
builder = StateGraph(AgentState)

# Add nodes
builder.add_node("agent", agent_node)

# Set entry point
builder.set_entry_point("agent")

# Add edges
builder.add_conditional_edges(
    "agent",
    should_continue,
    {
        "continue": "agent",
        "end": END
    }
)

# Compile the graph
graph = builder.compile()


if __name__ == "__main__":
    # Test the agent
    result = graph.invoke({
        "messages": [{"role": "user", "content": "Hello! What can you help me with?"}]
    })
    print(result["messages"][-1].content)
