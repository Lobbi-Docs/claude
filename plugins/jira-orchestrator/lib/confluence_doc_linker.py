"""
Confluence Documentation Linker for Jira Orchestrator.

This module provides utilities for:
- Automatically linking READMEs to Confluence documentation
- Ensuring Jira issues reference Confluence pages
- Creating/updating Confluence docs per issue and sub-issue
- Generating documentation links for code files

Usage:
    from confluence_doc_linker import ConfluenceDocLinker

    linker = ConfluenceDocLinker()
    linker.ensure_issue_docs("PROJ-123")
    linker.link_readme_to_confluence("./README.md", "PROJ-123")
"""

import os
import re
import json
import logging
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class DocType(Enum):
    """Types of documentation that can be created."""
    TECHNICAL_DESIGN = "tdd"
    API_DOCUMENTATION = "api-doc"
    RUNBOOK = "runbook"
    ARCHITECTURE_DECISION = "adr"
    RELEASE_NOTES = "release-notes"
    USER_GUIDE = "user-guide"
    IMPLEMENTATION_NOTES = "implementation-notes"


@dataclass
class ConfluenceLink:
    """Represents a link to a Confluence page."""
    page_id: str
    title: str
    url: str
    space_key: str
    doc_type: Optional[DocType] = None


@dataclass
class DocumentationConfig:
    """Configuration for documentation creation."""
    space_key: str
    parent_page_id: Optional[str] = None
    create_tdd: bool = True
    create_impl_notes: bool = True
    create_runbook: bool = False
    create_api_docs: bool = False
    templates_space: Optional[str] = None


class ConfluenceDocLinker:
    """
    Links and manages Confluence documentation for Jira issues.

    This class provides functionality to:
    1. Ensure every Jira issue has associated Confluence documentation
    2. Link READMEs to their corresponding Confluence pages
    3. Create documentation per issue and sub-issue
    4. Update Jira issues with documentation links

    Environment Variables:
        CONFLUENCE_BASE_URL: Confluence instance URL
        CONFLUENCE_SPACE_KEY: Default space for documentation
        CONFLUENCE_PARENT_PAGE_ID: Default parent page for new docs
    """

    def __init__(
        self,
        base_url: str = None,
        space_key: str = None,
        parent_page_id: str = None,
        jira_mcp_client: Any = None,
        confluence_mcp_client: Any = None
    ):
        """
        Initialize the Confluence Doc Linker.

        Args:
            base_url: Confluence base URL.
            space_key: Default Confluence space key.
            parent_page_id: Default parent page ID for new documentation.
            jira_mcp_client: Jira MCP client for issue operations.
            confluence_mcp_client: Confluence MCP client for page operations.
        """
        self.base_url = base_url or os.environ.get(
            "CONFLUENCE_BASE_URL",
            os.environ.get("ATLASSIAN_URL", "https://your-company.atlassian.net")
        )
        self.space_key = space_key or os.environ.get("CONFLUENCE_SPACE_KEY", "ENG")
        self.parent_page_id = parent_page_id or os.environ.get("CONFLUENCE_PARENT_PAGE_ID")
        self.jira_mcp = jira_mcp_client
        self.confluence_mcp = confluence_mcp_client

    # =========================================================================
    # ISSUE DOCUMENTATION MANAGEMENT
    # =========================================================================

    def ensure_issue_docs(
        self,
        jira_key: str,
        doc_config: DocumentationConfig = None,
        force_create: bool = False
    ) -> Dict[str, ConfluenceLink]:
        """
        Ensure documentation exists for a Jira issue.

        Creates necessary documentation pages if they don't exist and
        links them to the Jira issue.

        Args:
            jira_key: Jira issue key (e.g., "PROJ-123").
            doc_config: Configuration for documentation creation.
            force_create: If True, create docs even if they already exist.

        Returns:
            Dictionary mapping doc types to their Confluence links.

        Example:
            linker = ConfluenceDocLinker()
            docs = linker.ensure_issue_docs("PROJ-123")
            print(docs["tdd"].url)  # URL to the TDD page
        """
        config = doc_config or DocumentationConfig(
            space_key=self.space_key,
            parent_page_id=self.parent_page_id
        )

        # Get existing linked pages
        existing_docs = self._find_existing_docs(jira_key)

        docs = {}

        # Create Technical Design Document
        if config.create_tdd:
            if "tdd" not in existing_docs or force_create:
                docs["tdd"] = self._create_issue_doc(
                    jira_key=jira_key,
                    doc_type=DocType.TECHNICAL_DESIGN,
                    config=config
                )
            else:
                docs["tdd"] = existing_docs["tdd"]

        # Create Implementation Notes
        if config.create_impl_notes:
            if "implementation-notes" not in existing_docs or force_create:
                docs["implementation-notes"] = self._create_issue_doc(
                    jira_key=jira_key,
                    doc_type=DocType.IMPLEMENTATION_NOTES,
                    config=config
                )
            else:
                docs["implementation-notes"] = existing_docs["implementation-notes"]

        # Create Runbook (optional)
        if config.create_runbook:
            if "runbook" not in existing_docs or force_create:
                docs["runbook"] = self._create_issue_doc(
                    jira_key=jira_key,
                    doc_type=DocType.RUNBOOK,
                    config=config
                )
            else:
                docs["runbook"] = existing_docs["runbook"]

        # Create API Docs (optional)
        if config.create_api_docs:
            if "api-doc" not in existing_docs or force_create:
                docs["api-doc"] = self._create_issue_doc(
                    jira_key=jira_key,
                    doc_type=DocType.API_DOCUMENTATION,
                    config=config
                )
            else:
                docs["api-doc"] = existing_docs["api-doc"]

        # Link all docs to Jira issue
        self._link_docs_to_jira(jira_key, docs)

        return docs

    def ensure_sub_issue_docs(
        self,
        parent_jira_key: str,
        sub_issue_keys: List[str],
        doc_config: DocumentationConfig = None
    ) -> Dict[str, Dict[str, ConfluenceLink]]:
        """
        Ensure documentation exists for sub-issues of a parent issue.

        Creates implementation notes for each sub-issue and links them
        to both the sub-issue and the parent's documentation.

        Args:
            parent_jira_key: Parent Jira issue key.
            sub_issue_keys: List of sub-issue keys.
            doc_config: Configuration for documentation.

        Returns:
            Dictionary mapping sub-issue keys to their documentation links.
        """
        config = doc_config or DocumentationConfig(
            space_key=self.space_key,
            parent_page_id=self.parent_page_id,
            create_tdd=False,
            create_impl_notes=True
        )

        # Ensure parent has docs first
        parent_docs = self.ensure_issue_docs(parent_jira_key, config)

        sub_docs = {}
        for sub_key in sub_issue_keys:
            # Create sub-issue specific config with parent TDD as context
            sub_config = DocumentationConfig(
                space_key=config.space_key,
                parent_page_id=parent_docs.get("tdd", {}).page_id if parent_docs.get("tdd") else config.parent_page_id,
                create_tdd=False,
                create_impl_notes=True,
                create_runbook=False,
                create_api_docs=False
            )

            sub_docs[sub_key] = self._create_sub_issue_doc(
                parent_key=parent_jira_key,
                sub_key=sub_key,
                config=sub_config
            )

            # Link to Jira sub-issue
            self._link_docs_to_jira(sub_key, sub_docs[sub_key])

        return sub_docs

    # =========================================================================
    # README LINKING
    # =========================================================================

    def link_readme_to_confluence(
        self,
        readme_path: str,
        jira_key: str = None,
        confluence_page_id: str = None,
        update_readme: bool = True
    ) -> Dict[str, Any]:
        """
        Link a README file to its Confluence documentation.

        Adds a "Documentation" section to the README with links to
        Confluence pages, and optionally updates the Confluence page
        with a link back to the repository README.

        Args:
            readme_path: Path to the README file.
            jira_key: Optional Jira issue key to find docs for.
            confluence_page_id: Direct Confluence page ID to link.
            update_readme: Whether to modify the README file.

        Returns:
            Dictionary with linked documentation information.

        Example:
            result = linker.link_readme_to_confluence(
                "./README.md",
                jira_key="PROJ-123"
            )
        """
        result = {
            "readme_path": readme_path,
            "jira_key": jira_key,
            "confluence_links": [],
            "readme_updated": False
        }

        # Find Confluence pages for this Jira issue
        confluence_links = []

        if confluence_page_id:
            page = self._get_confluence_page(confluence_page_id)
            if page:
                confluence_links.append(page)

        if jira_key:
            docs = self._find_existing_docs(jira_key)
            confluence_links.extend(docs.values())

        result["confluence_links"] = confluence_links

        # Update README with documentation links
        if update_readme and confluence_links and os.path.exists(readme_path):
            self._add_docs_section_to_readme(readme_path, confluence_links, jira_key)
            result["readme_updated"] = True

        return result

    def _add_docs_section_to_readme(
        self,
        readme_path: str,
        confluence_links: List[ConfluenceLink],
        jira_key: str = None
    ):
        """Add or update the Documentation section in a README file."""
        with open(readme_path, 'r') as f:
            content = f.read()

        # Build documentation section
        docs_section = "\n## Documentation\n\n"

        if jira_key:
            jira_url = f"{os.environ.get('JIRA_BASE_URL', 'https://your-company.atlassian.net')}/browse/{jira_key}"
            docs_section += f"**Jira Issue:** [{jira_key}]({jira_url})\n\n"

        docs_section += "**Confluence Documentation:**\n\n"

        for link in confluence_links:
            doc_type_label = self._doc_type_label(link.doc_type)
            docs_section += f"- [{doc_type_label}: {link.title}]({link.url})\n"

        docs_section += "\n"

        # Check if Documentation section exists
        docs_pattern = r'## Documentation\n.*?(?=\n## |\n# |\Z)'

        if re.search(docs_pattern, content, re.DOTALL):
            # Update existing section
            content = re.sub(docs_pattern, docs_section.strip() + "\n", content, flags=re.DOTALL)
        else:
            # Add after first heading or at end
            first_heading = re.search(r'^# .+$', content, re.MULTILINE)
            if first_heading:
                insert_pos = first_heading.end()
                # Find next section after title
                next_section = re.search(r'\n## ', content[insert_pos:])
                if next_section:
                    insert_pos = insert_pos + next_section.start()
                content = content[:insert_pos] + "\n" + docs_section + content[insert_pos:]
            else:
                content = docs_section + content

        with open(readme_path, 'w') as f:
            f.write(content)

    def _doc_type_label(self, doc_type: DocType) -> str:
        """Get human-readable label for doc type."""
        labels = {
            DocType.TECHNICAL_DESIGN: "Technical Design",
            DocType.API_DOCUMENTATION: "API Documentation",
            DocType.RUNBOOK: "Runbook",
            DocType.ARCHITECTURE_DECISION: "Architecture Decision",
            DocType.RELEASE_NOTES: "Release Notes",
            DocType.USER_GUIDE: "User Guide",
            DocType.IMPLEMENTATION_NOTES: "Implementation Notes"
        }
        return labels.get(doc_type, "Documentation")

    # =========================================================================
    # HARNESS INTEGRATION
    # =========================================================================

    def link_pr_to_docs(
        self,
        repo: str,
        pr_number: int,
        jira_key: str,
        harness_client: Any = None
    ) -> Dict[str, Any]:
        """
        Add Confluence documentation links to a PR description.

        Args:
            repo: Repository identifier.
            pr_number: Pull request number.
            jira_key: Jira issue key.
            harness_client: Harness Code API client.

        Returns:
            Result of the PR update.
        """
        # Find existing docs for the issue
        docs = self._find_existing_docs(jira_key)

        if not docs:
            # Create default docs
            docs = self.ensure_issue_docs(jira_key)

        # Build documentation section for PR
        docs_section = "\n\n## Related Documentation\n\n"

        jira_url = f"{os.environ.get('JIRA_BASE_URL', 'https://your-company.atlassian.net')}/browse/{jira_key}"
        docs_section += f"**Jira:** [{jira_key}]({jira_url})\n\n"

        for doc_type, link in docs.items():
            docs_section += f"- [{self._doc_type_label(link.doc_type)}: {link.title}]({link.url})\n"

        # Add as PR comment if Harness client provided
        if harness_client:
            try:
                harness_client.create_comment(
                    repo=repo,
                    pr_number=pr_number,
                    text=docs_section
                )
                return {"success": True, "docs_linked": list(docs.keys())}
            except Exception as e:
                logger.error(f"Failed to add docs to PR: {e}")
                return {"success": False, "error": str(e)}

        return {"docs_section": docs_section, "docs": docs}

    # =========================================================================
    # CONFLUENCE OPERATIONS (Stub methods - to be implemented with MCP)
    # =========================================================================

    def _find_existing_docs(self, jira_key: str) -> Dict[str, ConfluenceLink]:
        """
        Find existing Confluence pages linked to a Jira issue.

        This method searches Confluence for pages that:
        1. Have the Jira key in their title
        2. Are linked from the Jira issue
        3. Have labels matching the issue key
        """
        docs = {}

        if self.confluence_mcp:
            try:
                # Search by title containing Jira key
                results = self.confluence_mcp.search(
                    query=f'title ~ "{jira_key}" AND space = "{self.space_key}"'
                )

                for page in results:
                    title = page.get("title", "")
                    doc_type = self._infer_doc_type(title)

                    link = ConfluenceLink(
                        page_id=page.get("id"),
                        title=title,
                        url=f"{self.base_url}/wiki/spaces/{self.space_key}/pages/{page.get('id')}",
                        space_key=self.space_key,
                        doc_type=doc_type
                    )

                    if doc_type:
                        docs[doc_type.value] = link
                    else:
                        docs["general"] = link

            except Exception as e:
                logger.warning(f"Failed to search Confluence: {e}")

        return docs

    def _infer_doc_type(self, title: str) -> Optional[DocType]:
        """Infer document type from page title."""
        title_lower = title.lower()

        if "technical design" in title_lower or "tdd" in title_lower:
            return DocType.TECHNICAL_DESIGN
        elif "api" in title_lower and ("doc" in title_lower or "reference" in title_lower):
            return DocType.API_DOCUMENTATION
        elif "runbook" in title_lower or "playbook" in title_lower:
            return DocType.RUNBOOK
        elif "adr" in title_lower or "architecture decision" in title_lower:
            return DocType.ARCHITECTURE_DECISION
        elif "release" in title_lower and "notes" in title_lower:
            return DocType.RELEASE_NOTES
        elif "user guide" in title_lower or "tutorial" in title_lower:
            return DocType.USER_GUIDE
        elif "implementation" in title_lower or "impl notes" in title_lower:
            return DocType.IMPLEMENTATION_NOTES

        return None

    def _create_issue_doc(
        self,
        jira_key: str,
        doc_type: DocType,
        config: DocumentationConfig
    ) -> ConfluenceLink:
        """Create a documentation page for a Jira issue."""
        title = self._generate_doc_title(jira_key, doc_type)
        content = self._generate_doc_content(jira_key, doc_type)

        page_id = None

        if self.confluence_mcp:
            try:
                result = self.confluence_mcp.create_page(
                    space_key=config.space_key,
                    title=title,
                    body=content,
                    parent_id=config.parent_page_id
                )
                page_id = result.get("id")
            except Exception as e:
                logger.error(f"Failed to create Confluence page: {e}")

        if not page_id:
            # Generate placeholder link
            page_id = f"placeholder-{jira_key}-{doc_type.value}"

        return ConfluenceLink(
            page_id=page_id,
            title=title,
            url=f"{self.base_url}/wiki/spaces/{config.space_key}/pages/{page_id}",
            space_key=config.space_key,
            doc_type=doc_type
        )

    def _create_sub_issue_doc(
        self,
        parent_key: str,
        sub_key: str,
        config: DocumentationConfig
    ) -> Dict[str, ConfluenceLink]:
        """Create implementation notes for a sub-issue."""
        docs = {}

        if config.create_impl_notes:
            title = f"{sub_key}: Implementation Notes"
            content = self._generate_sub_issue_content(parent_key, sub_key)

            page_id = None

            if self.confluence_mcp:
                try:
                    result = self.confluence_mcp.create_page(
                        space_key=config.space_key,
                        title=title,
                        body=content,
                        parent_id=config.parent_page_id
                    )
                    page_id = result.get("id")
                except Exception as e:
                    logger.error(f"Failed to create sub-issue doc: {e}")

            if not page_id:
                page_id = f"placeholder-{sub_key}-impl"

            docs["implementation-notes"] = ConfluenceLink(
                page_id=page_id,
                title=title,
                url=f"{self.base_url}/wiki/spaces/{config.space_key}/pages/{page_id}",
                space_key=config.space_key,
                doc_type=DocType.IMPLEMENTATION_NOTES
            )

        return docs

    def _generate_doc_title(self, jira_key: str, doc_type: DocType) -> str:
        """Generate a title for a documentation page."""
        type_labels = {
            DocType.TECHNICAL_DESIGN: "Technical Design",
            DocType.API_DOCUMENTATION: "API Documentation",
            DocType.RUNBOOK: "Runbook",
            DocType.ARCHITECTURE_DECISION: "Architecture Decision Record",
            DocType.RELEASE_NOTES: "Release Notes",
            DocType.USER_GUIDE: "User Guide",
            DocType.IMPLEMENTATION_NOTES: "Implementation Notes"
        }

        return f"{jira_key}: {type_labels.get(doc_type, 'Documentation')}"

    def _generate_doc_content(self, jira_key: str, doc_type: DocType) -> str:
        """Generate initial content for a documentation page."""
        jira_url = f"{os.environ.get('JIRA_BASE_URL', 'https://your-company.atlassian.net')}/browse/{jira_key}"

        if doc_type == DocType.TECHNICAL_DESIGN:
            return f"""
# {jira_key} - Technical Design Document

**Status:** Draft
**Author:** [Author Name]
**Created:** [Date]
**Last Updated:** [Date]
**Jira Issue:** [{jira_key}]({jira_url})

---

## Overview

[Brief description of what this feature/change does]

## Requirements

### Functional Requirements

1. [Requirement 1]
2. [Requirement 2]

### Non-Functional Requirements

- **Performance:** [Requirements]
- **Security:** [Requirements]
- **Scalability:** [Requirements]

## Design

### Architecture

[High-level architecture diagram and description]

### Components

[Component breakdown and responsibilities]

### Data Model

[Database schema changes]

### API Changes

[New or modified API endpoints]

## Implementation Plan

1. [Phase 1]
2. [Phase 2]
3. [Phase 3]

## Testing Strategy

[Unit tests, integration tests, E2E tests]

## Deployment

[Deployment plan and rollback strategy]

## Related Documentation

- [Link to related docs]
"""
        elif doc_type == DocType.IMPLEMENTATION_NOTES:
            return f"""
# {jira_key} - Implementation Notes

**Jira Issue:** [{jira_key}]({jira_url})
**Status:** In Progress

---

## Summary

[What was implemented]

## Changes Made

### Files Modified

- `path/to/file1.ts` - [Description of changes]
- `path/to/file2.ts` - [Description of changes]

### Database Changes

[Any schema changes]

### API Changes

[New or modified endpoints]

## Testing

### Unit Tests

- [Test file and coverage]

### Integration Tests

- [Test scenarios]

## Notes

[Implementation decisions, gotchas, future considerations]

## Related

- [Parent TDD link]
- [Related issues]
"""
        elif doc_type == DocType.RUNBOOK:
            return f"""
# {jira_key} - Runbook

**Service:** [Service Name]
**Team:** [Team Name]
**On-Call:** [#slack-channel]
**Jira:** [{jira_key}]({jira_url})

---

## Overview

[What this runbook covers]

## Prerequisites

- [Required access/permissions]
- [Required tools]

## Procedures

### Procedure 1: [Name]

**When:** [When to use this procedure]

```bash
# Step 1
command1

# Step 2
command2
```

### Procedure 2: [Name]

[Steps]

## Troubleshooting

### Issue 1: [Description]

**Symptoms:** [What you'll see]
**Cause:** [Why it happens]
**Resolution:** [How to fix]

## Escalation

[When and how to escalate]
"""

        return f"""
# {jira_key} - Documentation

**Jira Issue:** [{jira_key}]({jira_url})

---

## Overview

[Description]

## Details

[Content]

## Related Documentation

- [Links]
"""

    def _generate_sub_issue_content(self, parent_key: str, sub_key: str) -> str:
        """Generate content for a sub-issue implementation notes page."""
        jira_url = f"{os.environ.get('JIRA_BASE_URL', 'https://your-company.atlassian.net')}/browse"

        return f"""
# {sub_key} - Implementation Notes

**Parent Issue:** [{parent_key}]({jira_url}/{parent_key})
**Sub-Issue:** [{sub_key}]({jira_url}/{sub_key})
**Status:** In Progress

---

## Summary

[What this sub-task implements]

## Changes

[Files modified and what was changed]

## Testing

[How to test these changes]

## Notes

[Implementation details and considerations]
"""

    def _get_confluence_page(self, page_id: str) -> Optional[ConfluenceLink]:
        """Get Confluence page details by ID."""
        if self.confluence_mcp:
            try:
                page = self.confluence_mcp.get_page(page_id=page_id)
                return ConfluenceLink(
                    page_id=page.get("id"),
                    title=page.get("title"),
                    url=f"{self.base_url}/wiki/spaces/{page.get('space', {}).get('key')}/pages/{page_id}",
                    space_key=page.get("space", {}).get("key", self.space_key)
                )
            except Exception as e:
                logger.warning(f"Failed to get page {page_id}: {e}")

        return None

    def _link_docs_to_jira(
        self,
        jira_key: str,
        docs: Dict[str, ConfluenceLink]
    ):
        """Add documentation links to a Jira issue."""
        if not self.jira_mcp or not docs:
            return

        try:
            # Build comment with doc links
            comment_body = "## Documentation Links\n\n"

            for doc_type, link in docs.items():
                label = self._doc_type_label(link.doc_type) if link.doc_type else doc_type
                comment_body += f"- [{label}]({link.url})\n"

            self.jira_mcp.add_comment(jira_key, comment_body)

        except Exception as e:
            logger.warning(f"Failed to update Jira {jira_key} with doc links: {e}")


# =========================================================================
# UTILITY FUNCTIONS
# =========================================================================

def extract_jira_key(text: str) -> Optional[str]:
    """Extract Jira issue key from text."""
    match = re.search(r'([A-Z]+-\d+)', text)
    return match.group(1) if match else None


def build_doc_link_section(
    jira_key: str,
    confluence_links: List[ConfluenceLink],
    jira_base_url: str = None
) -> str:
    """
    Build a documentation links section for READMEs or PR descriptions.

    Args:
        jira_key: Jira issue key.
        confluence_links: List of Confluence page links.
        jira_base_url: Base URL for Jira.

    Returns:
        Markdown formatted documentation section.
    """
    jira_url = f"{jira_base_url or 'https://your-company.atlassian.net'}/browse/{jira_key}"

    section = f"""## Documentation

**Jira Issue:** [{jira_key}]({jira_url})

**Confluence Documentation:**
"""

    for link in confluence_links:
        doc_type_label = {
            DocType.TECHNICAL_DESIGN: "Technical Design Document",
            DocType.API_DOCUMENTATION: "API Documentation",
            DocType.RUNBOOK: "Runbook",
            DocType.ARCHITECTURE_DECISION: "Architecture Decision Record",
            DocType.RELEASE_NOTES: "Release Notes",
            DocType.USER_GUIDE: "User Guide",
            DocType.IMPLEMENTATION_NOTES: "Implementation Notes"
        }.get(link.doc_type, "Documentation")

        section += f"- [{doc_type_label}: {link.title}]({link.url})\n"

    return section


# =========================================================================
# CLI INTERFACE
# =========================================================================

def main():
    """CLI interface for Confluence doc linker operations."""
    import argparse

    parser = argparse.ArgumentParser(description="Confluence Documentation Linker CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # ensure-docs command
    ensure_parser = subparsers.add_parser("ensure-docs", help="Ensure docs exist for issue")
    ensure_parser.add_argument("--jira-key", required=True, help="Jira issue key")
    ensure_parser.add_argument("--space", help="Confluence space key")
    ensure_parser.add_argument("--create-runbook", action="store_true", help="Create runbook")
    ensure_parser.add_argument("--create-api-docs", action="store_true", help="Create API docs")

    # link-readme command
    readme_parser = subparsers.add_parser("link-readme", help="Link README to Confluence")
    readme_parser.add_argument("--readme-path", required=True, help="Path to README file")
    readme_parser.add_argument("--jira-key", required=True, help="Jira issue key")
    readme_parser.add_argument("--no-update", action="store_true", help="Don't modify README")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    linker = ConfluenceDocLinker()

    if args.command == "ensure-docs":
        config = DocumentationConfig(
            space_key=args.space or linker.space_key,
            create_tdd=True,
            create_impl_notes=True,
            create_runbook=args.create_runbook,
            create_api_docs=args.create_api_docs
        )
        result = linker.ensure_issue_docs(args.jira_key, config)
        print(json.dumps({k: vars(v) for k, v in result.items()}, indent=2))

    elif args.command == "link-readme":
        result = linker.link_readme_to_confluence(
            readme_path=args.readme_path,
            jira_key=args.jira_key,
            update_readme=not args.no_update
        )
        print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    main()
