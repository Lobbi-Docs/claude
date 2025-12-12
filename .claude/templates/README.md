# RealmWorks Documentation Templates

This directory contains reusable templates for creating consistent, high-quality documentation across the RealmWorks project.

All templates follow the **[Documentation Standard](../DOCUMENTATION_STANDARD.md)** established in Phase 3: Visual Excellence.

## 📁 Available Templates

### 1. Architecture Documentation Template
**File**: [architecture-template.md](architecture-template.md)
**Use For**: System architecture, component design, C4 diagrams
**Pattern**: Overview → C4 diagrams → Technology choices → Metrics

### 2. Feature Documentation Template
**File**: [feature-template.md](feature-template.md)
**Use For**: Individual features, automation workflows, integrations
**Pattern**: Visual proof → Architecture → Configuration → Testing

### 3. API Documentation Template
**File**: [api-template.md](api-template.md)
**Use For**: REST APIs, GraphQL endpoints, webhooks
**Pattern**: Authentication → Endpoints → Examples → Rate limiting

### 4. Workflow/Automation Documentation Template
**File**: [workflow-template.md](workflow-template.md)
**Use For**: GitHub Actions, CI/CD pipelines, automation scripts
**Pattern**: Purpose → Triggers → Steps → Troubleshooting

## 🚀 Quick Start

1. **Copy template** to appropriate location
2. **Replace placeholders** (search for `[`, `]`, `X`, `YYYY`)
3. **Fill in sections** following examples
4. **Run validation** with `scripts/validate-docs.sh`
5. **Review checklist** in [DOCUMENTATION_STANDARD.md](../DOCUMENTATION_STANDARD.md#-documentation-checklist)

## 📐 Template Structure

All templates include:
- **Visual elements**: Badges, diagrams, screenshots
- **Code examples**: Complete, working code with syntax highlighting
- **Metadata**: Last updated, owner, status
- **Links**: Related documentation

## ✅ Before Publishing

Run through the documentation checklist:
- [ ] Visual elements present (badges, diagrams, screenshots)
- [ ] Code examples complete and syntax-highlighted
- [ ] All links work (run validation script)
- [ ] Metadata accurate (date, owner, version)

See full checklist in [DOCUMENTATION_STANDARD.md](../DOCUMENTATION_STANDARD.md#-documentation-checklist)

## 🔗 Resources

- [Documentation Standard](../DOCUMENTATION_STANDARD.md) - Complete style guide
- [Screenshot Guidelines](../SCREENSHOT_GUIDELINES.md) - How to capture screenshots
- [Badge Catalog](../../.github/BADGES.md) - Available badges
- [Phase 3 Visual Excellence](../context/project-phases/phase-03-visual-excellence.md) - Origin of this standard

---

**Last Updated**: 2025-10-05
**Maintained By**: Documentation Team
