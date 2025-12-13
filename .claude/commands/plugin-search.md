# Plugin Search Command

Search and discover plugins using semantic search and intelligent recommendations.

## Usage

```
/plugin-search <query> [options]
```

## Search Modes

- **Text Search** - Full-text search across plugin metadata
- **Semantic Search** - Find conceptually similar plugins
- **Category Browse** - Explore by category
- **Recommendations** - Personalized suggestions

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--category <cat>` | Filter by category | All |
| `--author <name>` | Filter by author | All |
| `--tags <tags>` | Filter by tags (comma-separated) | All |
| `--min-rating <n>` | Minimum rating (1-5) | None |
| `--sort <field>` | Sort by: relevance, downloads, rating, recent | `relevance` |
| `--limit <n>` | Maximum results | `20` |
| `--trending` | Show trending plugins | `false` |
| `--similar <id>` | Find similar to plugin ID | None |
| `--recommend` | Personalized recommendations | `false` |

## Examples

### Basic Search

```bash
# Search for authentication plugins
/plugin-search authentication

# Search with category filter
/plugin-search api --category devops

# Search by multiple tags
/plugin-search --tags keycloak,oauth,security
```

### Discovery Features

```bash
# Show trending plugins this week
/plugin-search --trending --sort downloads

# Get personalized recommendations
/plugin-search --recommend

# Find plugins similar to a specific one
/plugin-search --similar lobbi-platform-manager
```

### Advanced Filtering

```bash
# High-rated plugins by specific author
/plugin-search --author "Markus Ahling" --min-rating 4

# Recently updated plugins in testing category
/plugin-search --category testing --sort recent --limit 10
```

## Search Results Format

```
Plugin Search Results (15 found)
══════════════════════════════════════════════════════════════

1. lobbi-platform-manager v1.0.0
   ★★★★★ (5.0) | ⬇ 1,234 downloads | 🏷️ keycloak, mern, multi-tenant
   Streamline development on the-lobbi/keycloak-alpha with Keycloak
   management, service orchestration, and test generation

2. frontend-design-system v1.0.0
   ★★★★☆ (4.5) | ⬇ 892 downloads | 🏷️ design, ui, components
   256 curated design styles with AI-powered selection and React
   component generation

3. keycloak-admin v0.9.0
   ★★★★☆ (4.2) | ⬇ 567 downloads | 🏷️ keycloak, admin, oauth
   Keycloak administration automation for realm and user management

══════════════════════════════════════════════════════════════
Page 1 of 2 | Use --offset 20 for next page
```

## Categories

| Category | Description |
|----------|-------------|
| `devops` | CI/CD, deployment, infrastructure |
| `authentication` | Auth, SSO, identity management |
| `testing` | Test generation, mocking, coverage |
| `frontend` | UI, components, design systems |
| `backend` | API, database, services |
| `documentation` | Docs, comments, README generation |
| `ai-ml` | Machine learning, AI integration |
| `platform` | Platform-specific tools |

## Recommendation Engine

The recommendation system uses multiple signals:

### Collaborative Filtering
```
Users who installed [Plugin A] also installed:
- Plugin B (85% overlap)
- Plugin C (72% overlap)
- Plugin D (65% overlap)
```

### Content-Based Filtering
```
Similar to [Plugin A] based on:
- Description similarity: 92%
- Tag overlap: 4/5 tags
- Category match: Same category
```

### Trending Calculation
```
trending_score = (
  recent_installs * 0.5 +      # Last 7 days
  install_velocity * 0.3 +      # Growth rate
  recent_ratings * 0.2          # Recent positive reviews
)
```

## Search Algorithm

The search engine uses TF-IDF with boosting:

```
final_score = (
  tf_idf_score * 0.40 +         # Text relevance
  download_score * 0.20 +        # Popularity
  rating_score * 0.20 +          # Quality
  recency_score * 0.10 +         # Freshness
  exact_match_boost * 0.10       # Exact matches
)
```

## Analytics

Search queries are tracked to improve discovery:

```bash
# View popular searches
/plugin-search --stats popular

# View searches with no results (gaps)
/plugin-search --stats gaps
```

## Integration

Search integrates with the plugin ecosystem:

1. **Install from search**: Click result to install
2. **Compare plugins**: Side-by-side comparison
3. **Dependency check**: Verify compatibility before install
4. **Update notifications**: Alert when installed plugins have updates

## See Also

- `/plugin-install` - Install discovered plugins
- `/plugin-list` - View installed plugins
- `/plugin-update` - Update installed plugins
