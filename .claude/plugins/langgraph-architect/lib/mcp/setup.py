"""
Setup script for LangGraph MCP Server

This script automates the setup process for the MCP server.
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read README
readme_file = Path(__file__).parent / "README.md"
long_description = ""
if readme_file.exists():
    with open(readme_file, "r", encoding="utf-8") as f:
        long_description = f.read()

# Read requirements
requirements_file = Path(__file__).parent / "requirements.txt"
requirements = []
if requirements_file.exists():
    with open(requirements_file, "r", encoding="utf-8") as f:
        requirements = [
            line.strip()
            for line in f
            if line.strip() and not line.startswith("#")
        ]

setup(
    name="langgraph-mcp-server",
    version="1.0.0",
    description="MCP server for LangGraph agents",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="Brookside BI",
    license="MIT",
    packages=find_packages(),
    python_requires=">=3.10",
    install_requires=requirements,
    entry_points={
        "console_scripts": [
            "langgraph-mcp-server=langgraph_mcp_server.__main__:main",
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
    keywords="mcp langgraph langchain agents ai claude",
    project_urls={
        "Source": "https://github.com/Lobbi-Docs/claude",
        "Documentation": "https://github.com/Lobbi-Docs/claude/tree/main/.claude/plugins/langgraph-architect",
    },
)
