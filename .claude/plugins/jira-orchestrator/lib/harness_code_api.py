"""
Harness Code REST API Client for PR Operations.

This module provides a Python client for interacting with the Harness Code
(Gitness-based) REST API to perform write operations on pull requests,
including creating comments, submitting reviews, and merging PRs.

Usage:
    from harness_code_api import HarnessCodeAPI

    client = HarnessCodeAPI()
    client.create_comment("my-repo", 42, "LGTM!")
    client.approve("my-repo", 42, "abc123def456")
"""

import os
import json
import logging
from typing import Optional, Literal, List, Dict, Any
from dataclasses import dataclass
from enum import Enum

try:
    import requests
except ImportError:
    requests = None  # Will use curl fallback

logger = logging.getLogger(__name__)


class ReviewDecision(Enum):
    """Valid review decision types."""
    APPROVED = "approved"
    CHANGE_REQUIRED = "changereq"
    REVIEWED = "reviewed"


class MergeMethod(Enum):
    """Valid merge methods."""
    MERGE = "merge"
    SQUASH = "squash"
    REBASE = "rebase"
    FAST_FORWARD = "fast-forward"


@dataclass
class CommentInput:
    """Input for creating a PR comment."""
    text: str
    parent_id: Optional[int] = None
    path: Optional[str] = None
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    line_start_new: bool = True
    line_end_new: bool = True
    source_commit_sha: Optional[str] = None
    target_commit_sha: Optional[str] = None


@dataclass
class ReviewInput:
    """Input for submitting a PR review."""
    commit_sha: str
    decision: ReviewDecision


@dataclass
class MergeInput:
    """Input for merging a PR."""
    source_sha: str
    method: MergeMethod = MergeMethod.SQUASH
    title: Optional[str] = None
    message: Optional[str] = None
    delete_source_branch: bool = True
    bypass_rules: bool = False
    dry_run: bool = False
    dry_run_rules: bool = False


class HarnessCodeAPIError(Exception):
    """Exception raised for Harness Code API errors."""

    def __init__(self, message: str, status_code: int = None, response: dict = None):
        self.message = message
        self.status_code = status_code
        self.response = response
        super().__init__(self.message)


class HarnessCodeAPI:
    """
    Harness Code REST API client for PR operations.

    This client provides methods for:
    - Creating, updating, and deleting PR comments
    - Submitting reviews (approve, request changes, reviewed)
    - Adding reviewers to PRs
    - Merging PRs with various strategies

    Environment Variables:
        HARNESS_API_KEY: Required. Your Harness API key.
        HARNESS_BASE_URL: Optional. Defaults to https://app.harness.io
        HARNESS_ACCOUNT_ID: Optional. Your Harness account ID.
        HARNESS_ORG_ID: Optional. Your Harness organization ID.
        HARNESS_PROJECT_ID: Optional. Your Harness project ID.
    """

    def __init__(
        self,
        api_key: str = None,
        base_url: str = None,
        account_id: str = None,
        org_id: str = None,
        project_id: str = None
    ):
        """
        Initialize the Harness Code API client.

        Args:
            api_key: Harness API key. Defaults to HARNESS_API_KEY env var.
            base_url: Harness base URL. Defaults to HARNESS_BASE_URL env var or https://app.harness.io.
            account_id: Harness account ID. Defaults to HARNESS_ACCOUNT_ID env var.
            org_id: Harness organization ID. Defaults to HARNESS_ORG_ID env var.
            project_id: Harness project ID. Defaults to HARNESS_PROJECT_ID env var.
        """
        self.api_key = api_key or os.environ.get("HARNESS_API_KEY")
        self.base_url = base_url or os.environ.get("HARNESS_BASE_URL", "https://app.harness.io")
        self.account_id = account_id or os.environ.get("HARNESS_ACCOUNT_ID")
        self.org_id = org_id or os.environ.get("HARNESS_ORG_ID")
        self.project_id = project_id or os.environ.get("HARNESS_PROJECT_ID")

        if not self.api_key:
            raise ValueError("HARNESS_API_KEY is required. Set it as an environment variable or pass it directly.")

        self.api_url = f"{self.base_url.rstrip('/')}/code/api/v1"
        self.headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json"
        }

    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: dict = None,
        params: dict = None
    ) -> dict:
        """
        Make an HTTP request to the Harness Code API.

        Args:
            method: HTTP method (GET, POST, PATCH, DELETE).
            endpoint: API endpoint (without base URL).
            data: Request body data.
            params: Query parameters.

        Returns:
            Response JSON as a dictionary.

        Raises:
            HarnessCodeAPIError: If the request fails.
        """
        url = f"{self.api_url}{endpoint}"

        if requests:
            try:
                response = requests.request(
                    method=method,
                    url=url,
                    headers=self.headers,
                    json=data,
                    params=params,
                    timeout=30
                )
                response.raise_for_status()
                return response.json() if response.text else {}
            except requests.exceptions.HTTPError as e:
                error_data = {}
                try:
                    error_data = e.response.json()
                except Exception:
                    pass
                raise HarnessCodeAPIError(
                    message=f"HTTP {e.response.status_code}: {error_data.get('message', str(e))}",
                    status_code=e.response.status_code,
                    response=error_data
                )
            except requests.exceptions.RequestException as e:
                raise HarnessCodeAPIError(f"Request failed: {str(e)}")
        else:
            # Fallback to curl
            return self._curl_request(method, url, data, params)

    def _curl_request(
        self,
        method: str,
        url: str,
        data: dict = None,
        params: dict = None
    ) -> dict:
        """Make request using curl as fallback when requests library is not available."""
        import subprocess

        if params:
            query_string = "&".join(f"{k}={v}" for k, v in params.items())
            url = f"{url}?{query_string}"

        cmd = [
            "curl", "-s", "-X", method,
            "-H", f"x-api-key: {self.api_key}",
            "-H", "Content-Type: application/json",
            url
        ]

        if data:
            cmd.extend(["-d", json.dumps(data)])

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            raise HarnessCodeAPIError(f"curl failed: {result.stderr}")

        try:
            return json.loads(result.stdout) if result.stdout else {}
        except json.JSONDecodeError:
            return {"raw_response": result.stdout}

    # =========================================================================
    # COMMENT OPERATIONS
    # =========================================================================

    def create_comment(
        self,
        repo: str,
        pr_number: int,
        text: str,
        path: Optional[str] = None,
        line_start: Optional[int] = None,
        line_end: Optional[int] = None,
        parent_id: Optional[int] = None,
        source_commit_sha: Optional[str] = None,
        target_commit_sha: Optional[str] = None
    ) -> dict:
        """
        Create a comment on a pull request.

        Args:
            repo: Repository identifier.
            pr_number: Pull request number.
            text: Comment text (Markdown supported).
            path: File path for code comments.
            line_start: Starting line number for code comments.
            line_end: Ending line number for code comments.
            parent_id: Parent comment ID for replies.
            source_commit_sha: Source commit SHA for code comments.
            target_commit_sha: Target commit SHA for code comments.

        Returns:
            Created comment data.

        Examples:
            # General comment
            client.create_comment("my-repo", 42, "LGTM!")

            # Code comment on specific lines
            client.create_comment(
                "my-repo", 42,
                "Consider adding error handling here",
                path="src/auth.ts",
                line_start=50,
                line_end=55
            )

            # Reply to existing comment
            client.create_comment("my-repo", 42, "Good point!", parent_id=12345)
        """
        endpoint = f"/repos/{repo}/pullreq/{pr_number}/comments"

        data = {"text": text}

        if parent_id:
            data["parent_id"] = parent_id
        elif path and line_start is not None:
            data.update({
                "path": path,
                "line_start": line_start,
                "line_end": line_end or line_start,
                "line_start_new": True,
                "line_end_new": True
            })
            if source_commit_sha:
                data["source_commit_sha"] = source_commit_sha
            if target_commit_sha:
                data["target_commit_sha"] = target_commit_sha

        return self._make_request("POST", endpoint, data)

    def update_comment(
        self,
        repo: str,
        pr_number: int,
        comment_id: int,
        text: str
    ) -> dict:
        """
        Update an existing comment.

        Args:
            repo: Repository identifier.
            pr_number: Pull request number.
            comment_id: Comment ID to update.
            text: New comment text.

        Returns:
            Updated comment data.
        """
        endpoint = f"/repos/{repo}/pullreq/{pr_number}/comments/{comment_id}"
        return self._make_request("PATCH", endpoint, {"text": text})

    def delete_comment(
        self,
        repo: str,
        pr_number: int,
        comment_id: int
    ) -> dict:
        """
        Delete a comment.

        Args:
            repo: Repository identifier.
            pr_number: Pull request number.
            comment_id: Comment ID to delete.

        Returns:
            Deletion confirmation.
        """
        endpoint = f"/repos/{repo}/pullreq/{pr_number}/comments/{comment_id}"
        return self._make_request("DELETE", endpoint)

    def update_comment_status(
        self,
        repo: str,
        pr_number: int,
        comment_id: int,
        resolved: bool
    ) -> dict:
        """
        Update comment resolution status.

        Args:
            repo: Repository identifier.
            pr_number: Pull request number.
            comment_id: Comment ID.
            resolved: Whether the comment is resolved.

        Returns:
            Updated comment data.
        """
        endpoint = f"/repos/{repo}/pullreq/{pr_number}/comments/{comment_id}/status"
        return self._make_request("PUT", endpoint, {"resolved": resolved})

    def apply_suggestions(
        self,
        repo: str,
        pr_number: int,
        suggestion_ids: List[int]
    ) -> dict:
        """
        Apply code suggestions from comments.

        Args:
            repo: Repository identifier.
            pr_number: Pull request number.
            suggestion_ids: List of suggestion IDs to apply.

        Returns:
            Result of applying suggestions.
        """
        endpoint = f"/repos/{repo}/pullreq/{pr_number}/comments/apply-suggestions"
        return self._make_request("POST", endpoint, {"suggestion_ids": suggestion_ids})

    # =========================================================================
    # REVIEW OPERATIONS
    # =========================================================================

    def submit_review(
        self,
        repo: str,
        pr_number: int,
        commit_sha: str,
        decision: Literal["approved", "changereq", "reviewed"]
    ) -> dict:
        """
        Submit a review on a pull request.

        Args:
            repo: Repository identifier.
            pr_number: Pull request number.
            commit_sha: Commit SHA being reviewed.
            decision: Review decision - "approved", "changereq", or "reviewed".

        Returns:
            Review submission result.

        Examples:
            # Approve PR
            client.submit_review("my-repo", 42, "abc123", "approved")

            # Request changes
            client.submit_review("my-repo", 42, "abc123", "changereq")

            # Mark as reviewed without approval
            client.submit_review("my-repo", 42, "abc123", "reviewed")
        """
        endpoint = f"/repos/{repo}/pullreq/{pr_number}/reviews"
        data = {
            "commit_sha": commit_sha,
            "decision": decision
        }
        return self._make_request("POST", endpoint, data)

    def approve(self, repo: str, pr_number: int, commit_sha: str) -> dict:
        """
        Approve a pull request.

        Args:
            repo: Repository identifier.
            pr_number: Pull request number.
            commit_sha: Commit SHA being approved.

        Returns:
            Approval result.
        """
        return self.submit_review(repo, pr_number, commit_sha, "approved")

    def request_changes(self, repo: str, pr_number: int, commit_sha: str) -> dict:
        """
        Request changes on a pull request.

        Args:
            repo: Repository identifier.
            pr_number: Pull request number.
            commit_sha: Commit SHA.

        Returns:
            Review result.
        """
        return self.submit_review(repo, pr_number, commit_sha, "changereq")

    # =========================================================================
    # REVIEWER OPERATIONS
    # =========================================================================

    def add_reviewer(
        self,
        repo: str,
        pr_number: int,
        reviewer_id: int
    ) -> dict:
        """
        Add a reviewer to a pull request.

        Args:
            repo: Repository identifier.
            pr_number: Pull request number.
            reviewer_id: User ID of the reviewer to add.

        Returns:
            Reviewer addition result.
        """
        endpoint = f"/repos/{repo}/pullreq/{pr_number}/reviewers"
        return self._make_request("POST", endpoint, {"reviewer_id": reviewer_id})

    def remove_reviewer(
        self,
        repo: str,
        pr_number: int,
        reviewer_id: int
    ) -> dict:
        """
        Remove a reviewer from a pull request.

        Args:
            repo: Repository identifier.
            pr_number: Pull request number.
            reviewer_id: User ID of the reviewer to remove.

        Returns:
            Reviewer removal result.
        """
        endpoint = f"/repos/{repo}/pullreq/{pr_number}/reviewers/{reviewer_id}"
        return self._make_request("DELETE", endpoint)

    # =========================================================================
    # MERGE OPERATIONS
    # =========================================================================

    def merge(
        self,
        repo: str,
        pr_number: int,
        source_sha: str,
        method: Literal["merge", "squash", "rebase", "fast-forward"] = "squash",
        title: Optional[str] = None,
        message: Optional[str] = None,
        delete_source_branch: bool = True,
        bypass_rules: bool = False,
        dry_run: bool = False,
        dry_run_rules: bool = False
    ) -> dict:
        """
        Merge a pull request.

        Args:
            repo: Repository identifier.
            pr_number: Pull request number.
            source_sha: Source branch HEAD SHA.
            method: Merge method - "merge", "squash", "rebase", or "fast-forward".
            title: Merge commit title.
            message: Merge commit message.
            delete_source_branch: Whether to delete source branch after merge.
            bypass_rules: Whether to bypass branch protection rules.
            dry_run: If True, test mergeability without merging.
            dry_run_rules: If True, validate protection rules without merging.

        Returns:
            Merge result.

        Examples:
            # Squash merge with auto-delete
            client.merge(
                "my-repo", 42, "abc123",
                method="squash",
                title="feat: Add authentication",
                delete_source_branch=True
            )

            # Test mergeability (dry run)
            result = client.merge(
                "my-repo", 42, "abc123",
                dry_run=True
            )
            if result.get("mergeable"):
                client.merge("my-repo", 42, "abc123")
        """
        endpoint = f"/repos/{repo}/pullreq/{pr_number}/merge"
        data = {
            "method": method,
            "source_sha": source_sha,
            "delete_source_branch": delete_source_branch,
            "bypass_rules": bypass_rules,
            "dry_run": dry_run,
            "dry_run_rules": dry_run_rules
        }

        if title:
            data["title"] = title
        if message:
            data["message"] = message

        return self._make_request("POST", endpoint, data)

    def check_mergeability(
        self,
        repo: str,
        pr_number: int,
        source_sha: str
    ) -> dict:
        """
        Check if a PR is mergeable without actually merging.

        Args:
            repo: Repository identifier.
            pr_number: Pull request number.
            source_sha: Source branch HEAD SHA.

        Returns:
            Mergeability status including conflicts and rule violations.
        """
        return self.merge(repo, pr_number, source_sha, dry_run=True)

    # =========================================================================
    # REPOSITORY OPERATIONS
    # =========================================================================

    def list_repositories(
        self,
        space: Optional[str] = None,
        query: Optional[str] = None,
        page: int = 1,
        limit: int = 30
    ) -> dict:
        """
        List repositories.

        Args:
            space: Optional space/project to filter by.
            query: Optional search query.
            page: Page number (1-indexed).
            limit: Results per page (max 100).

        Returns:
            List of repositories.
        """
        endpoint = f"/spaces/{space}/repos" if space else "/repos"
        params = {"page": page, "limit": limit}
        if query:
            params["query"] = query
        return self._make_request("GET", endpoint, params=params)

    def get_repository(self, repo: str) -> dict:
        """
        Get repository details.

        Args:
            repo: Repository identifier.

        Returns:
            Repository details.
        """
        return self._make_request("GET", f"/repos/{repo}")

    def create_repository(
        self,
        identifier: str,
        description: Optional[str] = None,
        default_branch: str = "main",
        is_public: bool = False,
        parent_ref: Optional[str] = None,
        readme: bool = True,
        license: Optional[str] = None,
        gitignore: Optional[str] = None
    ) -> dict:
        """
        Create a new repository.

        Args:
            identifier: Repository identifier (URL-safe name).
            description: Repository description.
            default_branch: Default branch name.
            is_public: Whether the repository is public.
            parent_ref: Parent space/project reference.
            readme: Whether to initialize with README.
            license: License template (e.g., "MIT", "Apache-2.0").
            gitignore: Gitignore template (e.g., "Python", "Node").

        Returns:
            Created repository data.

        Examples:
            # Create a private repository
            client.create_repository(
                identifier="my-new-service",
                description="Backend service for user management",
                default_branch="main"
            )

            # Create with initialization
            client.create_repository(
                identifier="frontend-app",
                description="React frontend application",
                readme=True,
                license="MIT",
                gitignore="Node"
            )
        """
        data = {
            "identifier": identifier,
            "default_branch": default_branch,
            "is_public": is_public
        }

        if description:
            data["description"] = description
        if parent_ref:
            data["parent_ref"] = parent_ref
        if readme:
            data["readme"] = readme
        if license:
            data["license"] = license
        if gitignore:
            data["gitignore"] = gitignore

        return self._make_request("POST", "/repos", data)

    def delete_repository(self, repo: str) -> dict:
        """
        Delete a repository.

        Args:
            repo: Repository identifier.

        Returns:
            Deletion confirmation.
        """
        return self._make_request("DELETE", f"/repos/{repo}")

    def update_repository(
        self,
        repo: str,
        description: Optional[str] = None,
        is_public: Optional[bool] = None,
        default_branch: Optional[str] = None
    ) -> dict:
        """
        Update repository settings.

        Args:
            repo: Repository identifier.
            description: New description.
            is_public: New visibility setting.
            default_branch: New default branch.

        Returns:
            Updated repository data.
        """
        data = {}
        if description is not None:
            data["description"] = description
        if is_public is not None:
            data["is_public"] = is_public
        if default_branch is not None:
            data["default_branch"] = default_branch

        return self._make_request("PATCH", f"/repos/{repo}", data)

    # =========================================================================
    # MULTI-REPO WORKSPACE SUPPORT
    # =========================================================================

    def ensure_repository_exists(
        self,
        identifier: str,
        description: Optional[str] = None,
        default_branch: str = "main"
    ) -> dict:
        """
        Ensure a repository exists, creating it if necessary.

        Args:
            identifier: Repository identifier.
            description: Repository description (used if creating).
            default_branch: Default branch (used if creating).

        Returns:
            Repository data (existing or newly created).
        """
        try:
            return self.get_repository(identifier)
        except HarnessCodeAPIError as e:
            if e.status_code == 404:
                logger.info(f"Repository {identifier} not found, creating...")
                return self.create_repository(
                    identifier=identifier,
                    description=description,
                    default_branch=default_branch
                )
            raise

    def setup_workspace_repos(
        self,
        repos_config: List[Dict[str, Any]]
    ) -> List[dict]:
        """
        Set up multiple repositories for a workspace.

        Args:
            repos_config: List of repository configurations, each containing:
                - identifier: Repository identifier
                - description: Optional description
                - default_branch: Optional default branch
                - path: Local path (for reference)

        Returns:
            List of repository data for all repos.

        Examples:
            repos = client.setup_workspace_repos([
                {"identifier": "frontend", "description": "React frontend"},
                {"identifier": "backend", "description": "API backend"},
                {"identifier": "shared-libs", "description": "Shared libraries"}
            ])
        """
        results = []
        for config in repos_config:
            result = self.ensure_repository_exists(
                identifier=config["identifier"],
                description=config.get("description"),
                default_branch=config.get("default_branch", "main")
            )
            result["local_path"] = config.get("path")
            results.append(result)
        return results

    def get_workspace_prs(
        self,
        repo_identifiers: List[str],
        state: str = "open",
        jira_key: Optional[str] = None
    ) -> List[dict]:
        """
        Get PRs across multiple repositories in a workspace.

        Args:
            repo_identifiers: List of repository identifiers.
            state: PR state filter (open, closed, merged, all).
            jira_key: Optional Jira key to filter PRs by.

        Returns:
            List of PRs from all repositories.
        """
        all_prs = []

        for repo in repo_identifiers:
            try:
                prs = self._make_request(
                    "GET",
                    f"/repos/{repo}/pullreq",
                    params={"state": state}
                )

                for pr in prs.get("values", prs if isinstance(prs, list) else []):
                    pr["repository"] = repo

                    # Filter by Jira key if provided
                    if jira_key:
                        title = pr.get("title", "")
                        branch = pr.get("source_branch", "")
                        if jira_key in title or jira_key in branch:
                            all_prs.append(pr)
                    else:
                        all_prs.append(pr)

            except HarnessCodeAPIError as e:
                logger.warning(f"Failed to get PRs for {repo}: {e}")

        return all_prs

    def review_workspace_prs(
        self,
        repo_identifiers: List[str],
        jira_key: str,
        auto_approve: bool = False
    ) -> dict:
        """
        Review all PRs in a workspace that are linked to a Jira issue.

        Args:
            repo_identifiers: List of repository identifiers.
            jira_key: Jira issue key to find PRs for.
            auto_approve: Whether to auto-approve PRs without critical issues.

        Returns:
            Summary of reviews performed.
        """
        prs = self.get_workspace_prs(repo_identifiers, state="open", jira_key=jira_key)

        results = {
            "jira_key": jira_key,
            "prs_reviewed": 0,
            "prs_approved": 0,
            "prs_changes_requested": 0,
            "reviews": []
        }

        for pr in prs:
            repo = pr["repository"]
            pr_number = pr.get("number")
            commit_sha = pr.get("source_sha", pr.get("merge_base_sha"))

            if not pr_number or not commit_sha:
                continue

            # For now, just mark as reviewed (actual analysis would be done by Claude)
            decision = "reviewed"

            try:
                review_result = self.submit_review(repo, pr_number, commit_sha, decision)
                results["reviews"].append({
                    "repo": repo,
                    "pr": pr_number,
                    "decision": decision,
                    "result": review_result
                })
                results["prs_reviewed"] += 1

                if decision == "approved":
                    results["prs_approved"] += 1
                elif decision == "changereq":
                    results["prs_changes_requested"] += 1

            except HarnessCodeAPIError as e:
                logger.error(f"Failed to review PR {pr_number} in {repo}: {e}")
                results["reviews"].append({
                    "repo": repo,
                    "pr": pr_number,
                    "error": str(e)
                })

        return results

    # =========================================================================
    # JIRA INTEGRATION HELPERS
    # =========================================================================

    def review_with_jira_sync(
        self,
        repo: str,
        pr_number: int,
        commit_sha: str,
        decision: Literal["approved", "changereq", "reviewed"],
        jira_key: str,
        jira_client: Any = None,
        issues_found: List[Dict] = None
    ) -> dict:
        """
        Submit a review and sync status to Jira.

        Args:
            repo: Repository identifier.
            pr_number: Pull request number.
            commit_sha: Commit SHA being reviewed.
            decision: Review decision.
            jira_key: Jira issue key to update.
            jira_client: Optional Jira MCP client for updating the issue.
            issues_found: Optional list of issues found during review.

        Returns:
            Dictionary with review result and Jira sync status.
        """
        # Submit the review
        review_result = self.submit_review(repo, pr_number, commit_sha, decision)

        # Build Jira comment
        decision_labels = {
            "approved": "Approved",
            "changereq": "Changes Requested",
            "reviewed": "Reviewed"
        }

        issues_count = len(issues_found) if issues_found else 0
        jira_body = f"""
## Code Review Complete

**PR:** #{pr_number}
**Status:** {decision_labels.get(decision, decision)}
**Issues Found:** {issues_count}
"""

        if issues_found:
            by_severity = {}
            for issue in issues_found:
                sev = issue.get("severity", "info")
                by_severity[sev] = by_severity.get(sev, 0) + 1

            jira_body += "\n### Issues by Severity\n"
            for sev, count in sorted(by_severity.items()):
                jira_body += f"- {sev.title()}: {count}\n"

        # Sync to Jira if client provided
        jira_result = None
        if jira_client:
            try:
                jira_result = jira_client.add_comment(jira_key, jira_body)
            except Exception as e:
                logger.warning(f"Failed to sync to Jira: {e}")

        return {
            "review": review_result,
            "jira_sync": jira_result,
            "jira_comment": jira_body
        }


# =========================================================================
# CLI INTERFACE
# =========================================================================

def main():
    """CLI interface for Harness Code API operations."""
    import argparse

    parser = argparse.ArgumentParser(description="Harness Code API CLI")
    parser.add_argument("--repo", required=True, help="Repository identifier")
    parser.add_argument("--pr", type=int, required=True, help="PR number")

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Comment command
    comment_parser = subparsers.add_parser("comment", help="Add a comment")
    comment_parser.add_argument("--text", required=True, help="Comment text")
    comment_parser.add_argument("--path", help="File path for code comment")
    comment_parser.add_argument("--line-start", type=int, help="Start line")
    comment_parser.add_argument("--line-end", type=int, help="End line")
    comment_parser.add_argument("--parent-id", type=int, help="Parent comment ID for reply")

    # Review command
    review_parser = subparsers.add_parser("review", help="Submit a review")
    review_parser.add_argument("--commit-sha", required=True, help="Commit SHA")
    review_parser.add_argument(
        "--decision",
        required=True,
        choices=["approved", "changereq", "reviewed"],
        help="Review decision"
    )

    # Merge command
    merge_parser = subparsers.add_parser("merge", help="Merge the PR")
    merge_parser.add_argument("--source-sha", required=True, help="Source SHA")
    merge_parser.add_argument(
        "--method",
        default="squash",
        choices=["merge", "squash", "rebase", "fast-forward"],
        help="Merge method"
    )
    merge_parser.add_argument("--title", help="Merge commit title")
    merge_parser.add_argument("--message", help="Merge commit message")
    merge_parser.add_argument("--keep-branch", action="store_true", help="Keep source branch")
    merge_parser.add_argument("--dry-run", action="store_true", help="Test mergeability only")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    client = HarnessCodeAPI()

    if args.command == "comment":
        result = client.create_comment(
            args.repo, args.pr, args.text,
            path=args.path,
            line_start=args.line_start,
            line_end=args.line_end,
            parent_id=args.parent_id
        )
    elif args.command == "review":
        result = client.submit_review(
            args.repo, args.pr, args.commit_sha, args.decision
        )
    elif args.command == "merge":
        result = client.merge(
            args.repo, args.pr, args.source_sha,
            method=args.method,
            title=args.title,
            message=args.message,
            delete_source_branch=not args.keep_branch,
            dry_run=args.dry_run
        )

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
