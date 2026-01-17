"""
Example LangGraph Agent for MCP Server Testing

A simple hello world agent that demonstrates the basic structure
required for MCP server integration.

This agent:
- Accepts a greeting message
- Responds with a friendly greeting
- Maintains conversation state
- Can be invoked via MCP

Usage:
    # Register this agent
    python -m langgraph_mcp_server --discover

    # Or register programmatically
    from agent_registry import AgentRegistry
    registry = AgentRegistry()
    registry.register_agent(
        agent_id="hello_world",
        name="Hello World",
        description="Simple greeting agent",
        module_path="/path/to/example_agent.py"
    )
"""

from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver


# Define the state schema
class AgentState(TypedDict):
    """State for the hello world agent"""
    messages: Annotated[Sequence[BaseMessage], add_messages]
    greeting_count: int


def greeting_node(state: AgentState) -> AgentState:
    """
    Process greeting and generate response.

    This is the main node that handles the agent logic.
    """
    # Get the last message
    messages = state.get("messages", [])
    if not messages:
        return state

    last_message = messages[-1]

    # Get greeting count
    greeting_count = state.get("greeting_count", 0) + 1

    # Generate response based on input
    user_input = last_message.content.lower() if hasattr(last_message, 'content') else ""

    if "hello" in user_input or "hi" in user_input:
        response = f"Hello! This is greeting #{greeting_count}. How can I help you today?"
    elif "bye" in user_input or "goodbye" in user_input:
        response = f"Goodbye! It was nice talking to you. We had {greeting_count} greetings total."
    elif "how are you" in user_input:
        response = "I'm doing great, thank you for asking! I'm here to help with greetings and conversations."
    elif "what can you do" in user_input or "help" in user_input:
        response = (
            "I'm a simple greeting agent. I can:\n"
            "- Say hello and greet you\n"
            "- Keep track of our conversation\n"
            "- Respond to questions about how I'm doing\n"
            "- Say goodbye when you're ready to go"
        )
    else:
        response = f"Hello! You said: '{user_input}'. This is greeting #{greeting_count}."

    # Return updated state
    return {
        "messages": [AIMessage(content=response)],
        "greeting_count": greeting_count
    }


def should_continue(state: AgentState) -> str:
    """
    Determine if the conversation should continue.

    This is a conditional edge function.
    """
    messages = state.get("messages", [])
    if not messages:
        return END

    last_message = messages[-1]
    content = last_message.content.lower() if hasattr(last_message, 'content') else ""

    # End if user says goodbye
    if "bye" in content or "goodbye" in content:
        return END

    return END  # For this simple agent, always end after one response


# Create the graph
def create_graph():
    """
    Create and compile the LangGraph graph.

    This function is called by the MCP server when loading the agent.
    """
    # Create state graph
    workflow = StateGraph(AgentState)

    # Add nodes
    workflow.add_node("greeting", greeting_node)

    # Set entry point
    workflow.set_entry_point("greeting")

    # Add conditional edges
    workflow.add_conditional_edges(
        "greeting",
        should_continue,
        {
            END: END
        }
    )

    # Compile with checkpointer for state management
    checkpointer = MemorySaver()
    graph = workflow.compile(checkpointer=checkpointer)

    return graph


# Create the compiled graph (alternative to create_graph function)
graph = create_graph()


# For testing the agent directly
if __name__ == "__main__":
    import asyncio

    async def test_agent():
        """Test the agent directly"""
        config = {"configurable": {"thread_id": "test-thread-1"}}

        print("Testing Hello World Agent")
        print("=" * 50)

        # Test 1: Initial greeting
        print("\nTest 1: Initial greeting")
        result = await graph.ainvoke(
            {"messages": [HumanMessage(content="Hello!")], "greeting_count": 0},
            config
        )
        print(f"User: Hello!")
        print(f"Agent: {result['messages'][-1].content}")
        print(f"Greeting count: {result['greeting_count']}")

        # Test 2: Ask what it can do
        print("\nTest 2: Ask capabilities")
        result = await graph.ainvoke(
            {"messages": [HumanMessage(content="What can you do?")]},
            config
        )
        print(f"User: What can you do?")
        print(f"Agent: {result['messages'][-1].content}")
        print(f"Greeting count: {result['greeting_count']}")

        # Test 3: Ask how it's doing
        print("\nTest 3: Ask how it's doing")
        result = await graph.ainvoke(
            {"messages": [HumanMessage(content="How are you?")]},
            config
        )
        print(f"User: How are you?")
        print(f"Agent: {result['messages'][-1].content}")
        print(f"Greeting count: {result['greeting_count']}")

        # Test 4: Say goodbye
        print("\nTest 4: Say goodbye")
        result = await graph.ainvoke(
            {"messages": [HumanMessage(content="Goodbye!")]},
            config
        )
        print(f"User: Goodbye!")
        print(f"Agent: {result['messages'][-1].content}")
        print(f"Greeting count: {result['greeting_count']}")

        print("\n" + "=" * 50)
        print("All tests completed successfully!")

    asyncio.run(test_agent())
