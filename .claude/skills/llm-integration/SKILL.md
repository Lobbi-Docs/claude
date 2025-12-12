---
name: llmintegration
description: LLM integration patterns for Claude, GPT, Gemini, and Ollama. Activate for AI API integration, prompt engineering, token management, and multi-model orchestration.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# LLM Integration Skill

Provides comprehensive LLM integration capabilities for the Golden Armada AI Agent Fleet Platform.

## When to Use This Skill

Activate this skill when working with:
- Claude/Anthropic API integration
- OpenAI GPT integration
- Google Gemini integration
- Ollama local models
- Multi-model orchestration
- Prompt engineering

## Anthropic Claude Integration

\`\`\`python
import anthropic

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

# Basic completion
message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Hello, Claude!"}
    ]
)
print(message.content[0].text)

# With system prompt
message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    system="You are a helpful coding assistant.",
    messages=[
        {"role": "user", "content": "Write a Python function to sort a list."}
    ]
)

# Streaming
with client.messages.stream(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Tell me a story."}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)

# Tool use
tools = [
    {
        "name": "get_weather",
        "description": "Get the current weather in a location",
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {"type": "string", "description": "The city and state"}
            },
            "required": ["location"]
        }
    }
]

message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    tools=tools,
    messages=[{"role": "user", "content": "What's the weather in San Francisco?"}]
)
\`\`\`

## OpenAI GPT Integration

\`\`\`python
from openai import OpenAI

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

# Basic completion
response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello!"}
    ]
)
print(response.choices[0].message.content)

# Streaming
stream = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Write a poem."}],
    stream=True
)
for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")

# Function calling
functions = [
    {
        "name": "get_weather",
        "description": "Get the current weather",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {"type": "string"}
            },
            "required": ["location"]
        }
    }
]

response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Weather in NYC?"}],
    functions=functions,
    function_call="auto"
)
\`\`\`

## Google Gemini Integration

\`\`\`python
import google.generativeai as genai

genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

model = genai.GenerativeModel('gemini-pro')

# Basic generation
response = model.generate_content("Explain quantum computing")
print(response.text)

# Chat
chat = model.start_chat(history=[])
response = chat.send_message("Hello!")
print(response.text)

# Streaming
response = model.generate_content("Tell me a story", stream=True)
for chunk in response:
    print(chunk.text, end="")
\`\`\`

## Ollama Local Models

\`\`\`python
import ollama

# Basic completion
response = ollama.chat(
    model='llama2',
    messages=[
        {'role': 'user', 'content': 'Hello!'}
    ]
)
print(response['message']['content'])

# Streaming
stream = ollama.chat(
    model='llama2',
    messages=[{'role': 'user', 'content': 'Tell me a story.'}],
    stream=True
)
for chunk in stream:
    print(chunk['message']['content'], end='')

# Pull model
ollama.pull('llama2')

# List models
models = ollama.list()
\`\`\`

## Multi-Model Abstraction

\`\`\`python
from abc import ABC, abstractmethod
from typing import Generator

class LLMProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str, **kwargs) -> str:
        pass

    @abstractmethod
    def stream(self, prompt: str, **kwargs) -> Generator[str, None, None]:
        pass

class ClaudeProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model

    def generate(self, prompt: str, **kwargs) -> str:
        message = self.client.messages.create(
            model=self.model,
            max_tokens=kwargs.get('max_tokens', 1024),
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text

    def stream(self, prompt: str, **kwargs) -> Generator[str, None, None]:
        with self.client.messages.stream(
            model=self.model,
            max_tokens=kwargs.get('max_tokens', 1024),
            messages=[{"role": "user", "content": prompt}]
        ) as stream:
            for text in stream.text_stream:
                yield text

class LLMFactory:
    @staticmethod
    def create(provider: str, **kwargs) -> LLMProvider:
        providers = {
            'claude': ClaudeProvider,
            'gpt': GPTProvider,
            'gemini': GeminiProvider,
            'ollama': OllamaProvider
        }
        return providers[provider](**kwargs)
\`\`\`

## Prompt Engineering Best Practices

\`\`\`python
# Structured prompts
SYSTEM_PROMPT = """You are a helpful coding assistant.

Guidelines:
1. Write clean, well-documented code
2. Follow best practices
3. Explain your reasoning
"""

# Few-shot examples
FEW_SHOT_PROMPT = """Convert natural language to SQL.

Example 1:
Input: Get all users
Output: SELECT * FROM users;

Example 2:
Input: Count active orders
Output: SELECT COUNT(*) FROM orders WHERE status = 'active';

Input: {user_input}
Output:"""

# Chain of thought
COT_PROMPT = """Solve this step by step:
{problem}

Let's think through this:
1."""
\`\`\`

## Token Management

\`\`\`python
import tiktoken

def count_tokens(text: str, model: str = "gpt-4") -> int:
    encoding = tiktoken.encoding_for_model(model)
    return len(encoding.encode(text))

def truncate_to_token_limit(text: str, max_tokens: int, model: str = "gpt-4") -> str:
    encoding = tiktoken.encoding_for_model(model)
    tokens = encoding.encode(text)
    if len(tokens) <= max_tokens:
        return text
    return encoding.decode(tokens[:max_tokens])
\`\`\`
