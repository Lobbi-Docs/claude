# Documentation Archive

This directory contains older and superseded documentation that is no longer part of the active documentation set. These files are preserved for historical reference and context but are not loaded by default to reduce context bloat.

## Archived Documents

### 1. IMPROVEMENT-PROPOSAL-v5.md (23 KB)
**Date Archived:** January 2, 2026

Historical proposal document outlining improvements to the `/jira:ship`, `/jira:iterate`, and `/jira:council` commands. This represents an earlier iteration of the plugin architecture.

**Content:**
- Vision for simplified command interfaces
- Command specifications
- Feature proposals
- Implementation considerations

**Status:** Superseded by current implementation

---

### 2. IMPROVEMENT-ANALYSIS-v5.1.md (22 KB)
**Date Archived:** January 2, 2026

Deep analysis document identifying gaps and improvements across the three main commands. This was a companion analysis to the v5 proposal.

**Content:**
- Gap analysis for each command
- Priority improvements matrix
- Severity assessments
- Proposed solutions

**Status:** Analysis incorporated into current design

---

### 3. INSTALLATION-SYSTEM.md (22 KB)
**Date Archived:** January 2, 2026

System architecture overview of the installation infrastructure. This document duplicated significant content from `INSTALLATION.md` with an emphasis on technical system flows and architecture diagrams.

**Content:**
- Installation system components
- Verification flows
- Setup wizard flows
- System architecture diagrams
- Environment variables reference
- Troubleshooting guide

**Status:** Merged into `/INSTALLATION.md` for user reference

---

## Why These Were Archived

### Context Bloat Reduction

The main `docs/` directory was loading all documents by default, causing significant context overhead (76+ KB of active documentation). Archiving these files:

- **Reduces active context by ~45%** (67 KB archived from 292 KB total)
- **Improves AI model performance** by focusing on current, relevant docs
- **Maintains historical reference** without cluttering active workflows
- **Preserves institutional knowledge** for future reference

### Selection Criteria

Documents were selected for archival if they met one or more of these criteria:

1. **Superseded by current implementation** - Information is outdated or replaced
2. **Proposal/Analysis documents** - Historical decision-making artifacts
3. **Duplicate content** - Information available in active documents
4. **Less frequently accessed** - Not part of standard user workflows

---

## How to Access Archived Documents

If you need to reference an archived document:

```bash
# List all archived documents
ls -la docs/archive/

# View an archived document
cat docs/archive/IMPROVEMENT-PROPOSAL-v5.md

# Search archived content
grep -r "keyword" docs/archive/
```

---

## Restoring Documents

If an archived document is needed in the active documentation:

```bash
# Move back to docs/
mv docs/archive/DOCUMENT-NAME.md docs/DOCUMENT-NAME.md

# Update references in relevant documents
# Notify team of the restoration
```

---

## Archival Log

| Document | Size | Date | Reason |
|----------|------|------|--------|
| IMPROVEMENT-PROPOSAL-v5.md | 23 KB | 2026-01-02 | Historical proposal, superseded |
| IMPROVEMENT-ANALYSIS-v5.1.md | 22 KB | 2026-01-02 | Historical analysis, merged into current design |
| INSTALLATION-SYSTEM.md | 22 KB | 2026-01-02 | Duplicate of INSTALLATION.md, system overview |

**Total Archived:** 67 KB
**Context Reduction:** ~23% of total docs size

---

## See Also

- [Main Documentation](../README.md) - Current active documentation
- [Installation Guide](../INSTALLATION.md) - User installation guide
- [Installation Checklist](../INSTALL-CHECKLIST.md) - Step-by-step checklist
