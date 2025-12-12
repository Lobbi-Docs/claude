# Building an AI-powered design system for Claude Code

The most critical insight for implementing an AI-powered design system is that **Claude Code's hierarchical memory system combined with W3C DTCG-compliant design tokens creates a powerful foundation** for maintaining style consistency across sessions. By structuring CLAUDE.md files with progressive disclosure, encoding semantic intent in token `$extensions` metadata, and leveraging sentence transformers for natural language to token mapping, you can build a production-ready system supporting 50+ distinct visual styles with automated accessibility validation.

## Claude Code configuration establishes the foundation

Claude Code uses a **cascading memory hierarchy** that automatically loads context at session start. This architecture enables design system persistence without external databases.

### File hierarchy and loading priority

```
~/.claude/CLAUDE.md          # Global user preferences (highest priority)
./CLAUDE.md                  # Project root (shared via git)
./CLAUDE.local.md            # Personal overrides (git-ignored)
./src/design-system/CLAUDE.md # Subdirectory (loaded on-demand)
```

Files are loaded recursively from the current working directory upward. Subdirectory CLAUDE.md files only load when Claude accesses files in those directories—a form of **progressive disclosure** that keeps context efficient.

### Optimal CLAUDE.md structure for design systems

```markdown
# Design System Project

## Tech Stack

- Framework: Next.js 14 with App Router
- Styling: Tailwind CSS 3.4 + CSS Variables
- Tokens: W3C DTCG format, Style Dictionary v4

## Critical Rules (ALWAYS FOLLOW)

- Use design tokens, NEVER hardcoded values
- All components must be WCAG 2.1 AA compliant
- Follow atomic design: primitives → semantic → component

## Token Architecture

- Primitives: `src/tokens/primitive/`
- Semantic: `src/tokens/semantic/`
- Component: `src/tokens/component/`

See @docs/design-tokens.md for full token documentation
See @docs/style-guide.md for visual guidelines
```

The `@path/to/file` syntax imports external documentation while keeping the main file under **100 lines**—critical for context efficiency.

### Settings.json configuration with validation hooks

The `.claude/settings.json` file enables **pre/post-commit validation** for design token changes:

```json
{
  "permissions": {
    "allow": [
      "Read",
      "Write(src/**)",
      "Edit",
      "Bash(npm run build:tokens)",
      "Bash(npm run validate:contrast)"
    ],
    "deny": ["Write(./tokens/primitive/**)", "Bash(rm -rf *)"]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write(*.json)",
        "hooks": [
          {
            "type": "command",
            "command": "npm run validate:tokens && npm run build:tokens"
          }
        ]
      }
    ]
  }
}
```

This configuration automatically validates token changes and rebuilds outputs whenever JSON files are modified.

### Skill file architecture for design expertise

Skills package domain expertise into reusable modules with three-level progressive disclosure:

```markdown
---
name: design-token-generator
description: Generate design tokens following DTCG spec. Use when creating new tokens, modifying color palettes, or establishing component token bindings.
---

# Design Token Generator

## Instructions

1. Check existing patterns in `src/tokens/`
2. Follow DTCG specification for $type, $value, $extensions
3. Validate contrast ratios before committing
4. Run `npm run build:tokens` after changes

## Token Tiers

- **Primitive**: Raw values (color.blue.500, spacing.4)
- **Semantic**: Contextual meaning (color.text.primary)
- **Component**: Specific bindings (button.primary.background)
```

The **metadata level (~100 tokens)** loads at startup for all skills; instructions load only when invoked; scripts load on-demand.

---

## W3C DTCG specification defines the token schema

The **Design Tokens Format Module 2025.10** provides a standardized JSON schema adopted by Adobe, Figma, Google, and Tokens Studio.

### Complete token type reference

| Type          | Value Format                           | Use Case               |
| ------------- | -------------------------------------- | ---------------------- | ------------------------ |
| `color`       | `{colorSpace, components, alpha, hex}` | UI colors, backgrounds |
| `dimension`   | `{value: number, unit: "px"            | "rem"}`                | Spacing, sizing, borders |
| `fontFamily`  | String or string array                 | Typography stacks      |
| `fontWeight`  | 1-1000 or keyword                      | Bold, light, medium    |
| `duration`    | `{value: number, unit: "ms"            | "s"}`                  | Animations               |
| `cubicBezier` | `[P1x, P1y, P2x, P2y]`                 | Easing functions       |
| `shadow`      | Object or array of shadows             | Elevation, depth       |
| `typography`  | Composite object                       | Complete text styles   |
| `gradient`    | Array of color stops                   | Background fills       |

### Three-tier token architecture

```json
{
  "primitive": {
    "color": {
      "blue": {
        "500": {
          "$type": "color",
          "$value": { "colorSpace": "srgb", "hex": "#3b82f6" }
        }
      }
    },
    "spacing": {
      "4": { "$type": "dimension", "$value": { "value": 16, "unit": "px" } }
    }
  },
  "semantic": {
    "color": {
      "interactive": {
        "primary": { "$value": "{primitive.color.blue.500}" }
      },
      "text": {
        "primary": { "$value": "{primitive.color.gray.900}" }
      }
    }
  },
  "component": {
    "button": {
      "primary": {
        "background": { "$value": "{semantic.color.interactive.primary}" },
        "text": { "$value": "{semantic.color.text.inverse}" }
      }
    }
  }
}
```

### $extensions metadata for AI consumption

The `$extensions` property enables encoding usage guidelines, accessibility constraints, and semantic roles:

```json
{
  "color-action-primary": {
    "$type": "color",
    "$value": "{primitive.color.blue.600}",
    "$extensions": {
      "ai.design-system": {
        "usage": {
          "guidelines": "Use for primary call-to-action buttons",
          "examples": ["Submit buttons", "Primary navigation"],
          "avoid": ["Decorative elements", "Secondary actions"]
        },
        "accessibility": {
          "wcagLevel": "AA",
          "contrastRequirements": {
            "onWhite": { "ratio": 4.5, "passes": true }
          }
        },
        "semanticRole": "interactive.action.primary",
        "componentBindings": ["Button.primary", "Link.cta"]
      }
    }
  }
}
```

This metadata enables AI systems to make informed decisions about token application without hardcoded rules.

---

## Style Dictionary v4 configuration for multi-platform output

### Complete build configuration

```javascript
// sd.config.js
import StyleDictionary from 'style-dictionary';
import { register, expandTypesMap } from '@tokens-studio/sd-transforms';

register(StyleDictionary);

export default {
  source: ['tokens/**/*.json'],
  preprocessors: ['tokens-studio'],
  expand: { typesMap: expandTypesMap },
  platforms: {
    css: {
      transformGroup: 'tokens-studio',
      transforms: ['name/kebab'],
      buildPath: 'dist/css/',
      prefix: 'ds',
      files: [
        {
          destination: 'variables.css',
          format: 'css/variables',
          options: { outputReferences: true },
        },
      ],
    },
    tailwind: {
      transformGroup: 'css',
      buildPath: 'dist/tailwind/',
      files: [
        {
          destination: 'theme.js',
          format: 'javascript/module',
        },
      ],
    },
    js: {
      transformGroup: 'js',
      buildPath: 'dist/js/',
      files: [
        { destination: 'tokens.js', format: 'javascript/es6' },
        { destination: 'tokens.d.ts', format: 'typescript/es6-declarations' },
      ],
    },
  },
};
```

### Tailwind CSS integration with sd-tailwindcss-transformer

```javascript
import { makeSdTailwindConfig } from 'sd-tailwindcss-transformer';

const sdConfig = makeSdTailwindConfig({
  type: 'all',
  isVariables: true, // Use CSS custom properties
  extend: true,
  formatType: 'js',
});

// tailwind.config.js output:
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: 'var(--ds-color-primary)',
        background: 'var(--ds-color-background)',
      },
      spacing: {
        xs: 'var(--ds-spacing-xs)',
        sm: 'var(--ds-spacing-sm)',
      },
    },
  },
};
```

---

## Complete style taxonomy with 50+ design styles

### Historical and contemporary foundations

**Art Deco** uses black (#000000), gold (#D4AF37), and jewel tones with geometric sans-serifs like Futura. Key elements include sunburst patterns, chevrons, and metallic gradients. Blends well with Mid-Century Modern and Minimalist styles.

**Bauhaus** limits palettes to primary colors (red, blue, yellow) on black/white foundations. Typography is exclusively geometric sans-serif (Universal Type, Akzidenz-Grotesk). Mathematical grid systems and asymmetrical balance define layouts.

**Swiss/International Style** emphasizes modular grids, Helvetica typography, and flush-left alignment. Colors are minimal—often black, white, plus one bold accent. Information hierarchy through scale is paramount.

**Neo-Brutalism** evolved web brutalism for commercial use with **heavy black outlines (4px+)**, hard drop shadows (solid color, 4-8px offset), and saturated colors like magenta (#FF00FF) and electric yellow (#FFFF00). Adopted by Figma and Gumroad.

### Digital native styles with CSS specifications

**Glassmorphism** creates frosted glass effects:

```css
background: rgba(255, 255, 255, 0.1);
backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.3);
border-radius: 16px;
```

Core colors include semi-transparent whites and vibrant accents (#65dfc9, #d892ef).

**Neumorphism** (Soft UI) uses matching background and shadow tones:

```css
background: #e0e0e0;
box-shadow:
  8px 8px 15px #a3b1c6,
  -8px -8px 15px #ffffff;
/* Pressed state: */
box-shadow: inset 5px 5px 9px rgba(94, 104, 121, 0.3);
```

**Synthwave** defines neon retro-futurism with gradient backgrounds and glowing text:

```css
background: linear-gradient(180deg, #1b2853, #ff007b);
text-shadow:
  0 0 5px #00bfff,
  0 0 20px #ff007b;
border: 2px solid #00bfff;
```

Core neon palette: #ff007b (magenta), #00bfff (cyan), #ffd319 (yellow).

**Cyberpunk** uses high-tech dystopian aesthetics with clipped corners:

```css
clip-path: polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 0 100%);
color: #fee801;
text-shadow:
  2px 0 #c5003c,
  -2px 0 #54c1e6;
```

**Bento Grid** creates asymmetric dashboard layouts:

```css
display: grid;
grid-template-columns: repeat(12, minmax(0, 1fr));
grid-auto-flow: dense;
gap: 1rem;
```

### Brand archetype specifications

| Archetype          | Primary Colors                   | Typography         | Key Traits                          |
| ------------------ | -------------------------------- | ------------------ | ----------------------------------- |
| **Luxury**         | Black, white, gold               | Thin sans-serif    | Extensive whitespace, single accent |
| **Corporate**      | Blues (#0066CC), grays           | Roboto, Open Sans  | Data-dense, 8px grid                |
| **Startup/Tech**   | Vibrant purples, gradients       | Inter, Circular    | Dark mode, 3D elements              |
| **Healthcare**     | Calm blues (#4A90D9), greens     | Lato, Source Sans  | 44px touch targets, high contrast   |
| **Financial**      | Navy (#1A365D), forest green     | Traditional serifs | Security indicators, precision      |
| **SaaS Dashboard** | Neutral backgrounds, data colors | System fonts       | KPI cards, filter patterns          |

### Regional and mood-based variations

**Japanese Minimalism (Wabi-sabi)** emphasizes imperfection with earth tones (indigo #3B5998, terracotta, sage), organic typefaces, and intentional asymmetry. The "Ma" concept treats negative space as essential.

**Scandinavian Cozy (Hygge)** uses warm whites (#F5F5F0), soft grays, and muted earth accents. Natural material textures (wool, linen, wood) and rounded corners create warmth within minimalism.

**Mood palette mapping:**

- **Playful**: Yellow #FFD93D, coral #FF6B6B, rounded corners, bouncy animations
- **Calm/Serene**: Sage #9DC183, pale blue #AED9E0, expansive whitespace
- **Mysterious**: Deep purple #2D1B4E, midnight blue, gold accents, dramatic shadows
- **Trustworthy**: Trust blue #0066CC, navy #003366, security badges, consistent patterns

---

## Semantic intent classification maps language to tokens

### Pipeline architecture

```
User Input → Intent Classification (BERT) → Synonym Resolution
    → Emotion Mapping (Circumplex) → Vector Similarity → Token Output
```

### Sentence transformer implementation

```python
from sentence_transformers import SentenceTransformer, util

class DesignStyleMatcher:
    def __init__(self):
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        self.style_embeddings = {}

    def build_style_space(self, styles: dict):
        for name, description in styles.items():
            self.style_embeddings[name] = self.model.encode(description)

    def match(self, query: str, top_k: int = 3):
        query_emb = self.model.encode(query)
        scores = {
            name: util.cos_sim(query_emb, emb).item()
            for name, emb in self.style_embeddings.items()
        }
        return sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_k]

# Usage
matcher = DesignStyleMatcher()
matcher.build_style_space({
    "corporate": "professional, trustworthy, blue, structured",
    "playful": "fun, bright, rounded, colorful",
    "minimal": "simple, whitespace, elegant"
})
results = matcher.match("I want something fun and energetic")
```

The **all-MiniLM-L6-v2** model (384 dimensions) provides fast inference; **all-mpnet-base-v2** (768 dimensions) offers higher accuracy for nuanced style matching.

### Synonym ring for design vocabulary

```python
DESIGN_SYNONYMS = {
    "font_weight_bold": {
        "colloquial": ["bold", "heavy", "strong", "chunky"],
        "technical": "font-weight: 700"
    },
    "high_contrast": {
        "colloquial": ["pop", "stand out", "eye-catching", "punchy"],
        "technical": "contrast: high; saturation: 80%"
    },
    "rounded": {
        "colloquial": ["soft edges", "friendly", "approachable"],
        "technical": "border-radius: var(--radius-lg)"
    }
}
```

### Emotion-to-design mapping using Russell's Circumplex

Map **valence** (pleasant↔unpleasant) and **arousal** (high↔low) to design properties:

| Emotion | Valence | Arousal | Design Output                          |
| ------- | ------- | ------- | -------------------------------------- |
| Excited | +0.8    | +0.9    | Warm hue, high saturation, bold weight |
| Calm    | +0.6    | -0.4    | Cool hue, low saturation, spacious     |
| Angry   | -0.7    | +0.8    | Red hue, sharp corners, compact        |

---

## Prompt engineering patterns for design generation

### Anti-slop constraints prevent generic output

Include explicit negative constraints:

```
AVOID in component design:
- Generic rounded corners on everything
- Default blue color schemes
- Placeholder "Lorem ipsum" text
- Vague terms like "modern" without specifics
- Padding values not from defined scale
```

### Chain-of-thought for aesthetic decisions

```
Before generating, think through each decision:

<thinking>
1. USER NEEDS: What problem does this component solve?
2. VISUAL HIERARCHY: What should users notice first?
3. INTERACTION STATES: Hover, focus, active, disabled?
4. SPACING RHYTHM: How does this fit the 8px grid?
5. ACCESSIBILITY: Contrast ratios, keyboard nav, ARIA?
</thinking>

Now generate the component based on this reasoning.
```

### Few-shot component patterns

```
EXAMPLE 1 - Primary Button:
<button class="bg-primary text-primary-foreground px-4 py-2 rounded-md
              font-medium hover:bg-primary/90 focus:ring-2">
Design choices: Primary brand color, touch-friendly padding,
visible focus ring for accessibility.

Now create a [new component] following these patterns.
```

### Extended thinking triggers

For complex design decisions, trigger deeper reasoning:

- `"think"` → ~4,000 tokens of reasoning
- `"think harder"` → ~10,000 tokens
- `"ultrathink"` → ~32,000 tokens for thorough evaluation

---

## Style blending implements the 80/20 rule

### Conflict resolution matrix

When blending styles, resolve token category conflicts by dominance:

| Category       | Primary Style (80%) | Secondary Style (20%) |
| -------------- | ------------------- | --------------------- |
| Colors         | Full palette        | Accent colors only    |
| Typography     | Heading + body      | Display accents       |
| Spacing        | Complete scale      | None (use primary)    |
| Borders/Radius | Primary values      | None                  |
| Shadows        | Primary approach    | Subtle influence      |

### Weighted token merging

```javascript
function blendStyles(primary, secondary, ratio = 0.8) {
  const blended = {};

  for (const [key, value] of Object.entries(primary.tokens)) {
    if (key.includes('accent') && secondary.tokens[key]) {
      // Secondary influences accents
      blended[key] = secondary.tokens[key];
    } else {
      blended[key] = value;
    }
  }

  return blended;
}
```

### Compatibility scoring dimensions

Score style pairs on five dimensions (1-10 scale):

- **Formality**: Casual ↔ Formal
- **Era**: Historical ↔ Contemporary
- **Texture**: Flat ↔ Dimensional
- **Temperature**: Warm ↔ Cool
- **Ornamentation**: Minimal ↔ Decorative

Styles with scores within 3 points on 4+ dimensions blend well.

---

## Accessibility integration enforces WCAG compliance

### axe-core with Playwright configuration

```javascript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Component meets WCAG 2.1 AA', async ({ page }) => {
  await page.goto('/components/button');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
```

### Contrast enforcement in tokens

```json
{
  "color-text-primary": {
    "$value": "{primitive.color.gray.900}",
    "$extensions": {
      "a11y": {
        "contrastPairs": [
          { "background": "{color.background.primary}", "minRatio": 4.5 },
          { "background": "{color.background.secondary}", "minRatio": 4.5 }
        ]
      }
    }
  }
}
```

### Build-time contrast validation

```javascript
import Color from 'colorjs.io';

function validateContrast(fg, bg, minRatio) {
  const c1 = new Color(fg);
  const c2 = new Color(bg);
  const ratio = c1.contrast(c2, 'WCAG21');

  if (ratio < minRatio) {
    throw new Error(`Contrast ${ratio.toFixed(2)}:1 below ${minRatio}:1`);
  }
}
```

### ARIA patterns by component

| Component | Required ARIA                 | Key States                       |
| --------- | ----------------------------- | -------------------------------- |
| Button    | `role="button"`               | `aria-pressed`, `aria-expanded`  |
| Dialog    | `role="dialog"`               | `aria-modal`, `aria-labelledby`  |
| Tabs      | `role="tablist/tab/tabpanel"` | `aria-selected`, `aria-controls` |
| Switch    | `role="switch"`               | `aria-checked`                   |

---

## Build pipeline automates token deployment

### GitHub Actions workflow

```yaml
name: Design Tokens CI

on:
  push:
    paths: ['tokens/**', 'config.js']

jobs:
  validate-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }

      - run: npm ci
      - run: npm run validate:schema
      - run: npm run validate:contrast
      - run: npm run build:tokens

      - uses: actions/upload-artifact@v4
        with:
          name: design-tokens
          path: dist/
```

### Hot reload for development

```javascript
import chokidar from 'chokidar';
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 3001 });

chokidar.watch('tokens/**/*.json').on('all', async () => {
  await buildTokens();
  wss.clients.forEach((client) => {
    client.send(JSON.stringify({ type: 'tokens-updated' }));
  });
});
```

Client-side reload:

```javascript
const ws = new WebSocket('ws://localhost:3001');
ws.onmessage = () => {
  document.querySelectorAll('link[href*="tokens"]').forEach((link) => {
    link.href = link.href.split('?')[0] + '?t=' + Date.now();
  });
};
```

---

## Complete project structure

```
project/
├── .claude/
│   ├── settings.json           # Permissions, hooks
│   ├── commands/
│   │   └── create-component.md # Slash command templates
│   └── skills/
│       └── design-tokens/
│           └── SKILL.md        # Token generation expertise
├── CLAUDE.md                   # Project context
├── tokens/
│   ├── primitive/
│   │   ├── colors.json
│   │   ├── spacing.json
│   │   └── typography.json
│   ├── semantic/
│   │   └── colors.json
│   ├── component/
│   │   └── button.json
│   └── $themes.json
├── dist/
│   ├── css/variables.css
│   ├── tailwind/theme.js
│   └── js/tokens.js
├── scripts/
│   ├── build.js
│   ├── validate-contrast.js
│   └── dev.js                  # Hot reload server
├── sd.config.js                # Style Dictionary config
└── tailwind.config.js          # Tailwind integration
```

---

## Conclusion

Building an AI-powered design system for Claude Code requires integrating four key components: **hierarchical memory management** through CLAUDE.md files, **W3C DTCG-compliant token architecture** with semantic metadata, **NLP-based intent classification** for natural language queries, and **automated accessibility validation** in the build pipeline.

The three-tier token architecture (primitive → semantic → component) combined with `$extensions` metadata enables AI systems to understand not just token values, but their intended usage, accessibility constraints, and component bindings. Sentence transformers like all-MiniLM-L6-v2 provide efficient style matching from natural language queries, while the emotion-to-design mapping framework translates subjective descriptors into concrete design properties.

For production deployment, the GitHub Actions workflow ensures all tokens pass schema validation and contrast requirements before merging, while the hot reload development server enables rapid iteration without manual rebuilds. The Style Dictionary v4 configuration generates consistent outputs across CSS, Tailwind, JavaScript, and TypeScript from a single source of truth.
