# Design System Style Guide

Comprehensive aesthetic rules and principles for the AI-powered design system.

## Table of Contents

1. [Anti-AI-Slop Rules](#anti-ai-slop-rules)
2. [Core Design Principles](#core-design-principles)
3. [Style-Specific Guidelines](#style-specific-guidelines)
4. [Component Patterns](#component-patterns)
5. [Accessibility Standards](#accessibility-standards)
6. [Motion & Animation](#motion--animation)
7. [Responsive Design](#responsive-design)

---

## Anti-AI-Slop Rules

### The Never List

**NEVER use these overused patterns:**

#### Typography

- ❌ Inter (every AI project uses this)
- ❌ Roboto (Android default, too generic)
- ❌ Arial, Helvetica (system fallbacks only)
- ❌ Comic Sans (obvious, but stated for completeness)
- ✅ Style-specific fonts that match aesthetic intent

#### Colors

- ❌ Purple gradients (#667eea → #764ba2) - Startup cliché
- ❌ Generic blue (#007bff) - Bootstrap blue everywhere
- ❌ Gray-50 through gray-900 without customization
- ❌ Pure black (#000000) for dark mode - Use rich blacks instead
- ✅ Distinctive color palettes that reflect style identity

#### Layout

- ❌ Every corner is border-radius: 8px
- ❌ Generic card with shadow-md (0 4px 6px rgba(0,0,0,0.1))
- ❌ Centered div with max-width: 1200px
- ❌ Gap: 1rem everywhere without intentional rhythm
- ✅ Style-appropriate spacing and shape language

#### Components

- ❌ Gradient buttons with subtle shine effect
- ❌ Card grids with identical spacing
- ❌ Hero sections with background image + gradient overlay
- ❌ Navbar with logo left, links right (unless intentional)
- ✅ Components that express style personality

#### Content Patterns

- ❌ Overused emoji: 🚀 ✨ 🎉 💡 🔥 ⚡
- ❌ "Supercharge your workflow" type copy
- ❌ Generic placeholder text ("Lorem ipsum" is fine, but make it stylistic)
- ✅ Content that matches the visual language

### The Always List

**ALWAYS follow these principles:**

1. **Commit to the Aesthetic**
   - Go all-in on your chosen style
   - Half-measures create generic results
   - If doing brutalist, make it BRUTALLY brutalist
   - If doing art-deco, make it LUXURIOUSLY art-deco

2. **Use Design Tokens Exclusively**
   - Never hardcode colors: Use `var(--color-primary)`
   - Never hardcode spacing: Use `var(--space-md)`
   - Never hardcode typography: Use `var(--font-heading)`
   - Magic numbers are banned (except 0, 1, 100%)

3. **Define All Interactive States**
   - Default state
   - Hover state (cursor: pointer elements)
   - Focus state (keyboard navigation)
   - Active state (click/press feedback)
   - Disabled state (unavailable actions)
   - Loading state (async operations)

4. **Design for Accessibility**
   - Minimum WCAG AA contrast (4.5:1 text, 3:1 UI)
   - Focus indicators visible and distinctive
   - Touch targets minimum 44x44px
   - Semantic HTML structure
   - ARIA labels where needed

5. **Test in Context**
   - Light mode AND dark mode
   - Mobile AND desktop viewports
   - With real content (not just "Button")
   - With edge cases (very long text, empty states)

---

## Core Design Principles

### 1. Hierarchy

Every design needs clear visual hierarchy:

```css
/* Bad - Everything looks equally important */
.title {
  font-size: 18px;
  font-weight: 500;
}
.subtitle {
  font-size: 16px;
  font-weight: 500;
}
.body {
  font-size: 14px;
  font-weight: 400;
}

/* Good - Clear hierarchy with scale */
.title {
  font-size: var(--text-4xl); /* 36px */
  font-weight: var(--font-bold); /* 700 */
  line-height: 1.2;
}
.subtitle {
  font-size: var(--text-xl); /* 24px */
  font-weight: var(--font-medium); /* 500 */
  line-height: 1.4;
}
.body {
  font-size: var(--text-base); /* 16px */
  font-weight: var(--font-normal); /* 400 */
  line-height: 1.6;
}
```

### 2. Contrast

Use contrast to guide attention:

- **Color Contrast**: Light vs dark, saturated vs desaturated
- **Size Contrast**: Large headings vs small body text
- **Weight Contrast**: Bold vs regular, thick vs thin
- **Space Contrast**: Tight grouping vs generous whitespace

### 3. Repetition

Consistency creates cohesion:

- Repeat colors from your palette (not every color in every section)
- Repeat spacing values (use the scale: 4, 8, 16, 24, 32, 48, 64)
- Repeat border radius (pick 2-3 values max)
- Repeat animation durations (150ms, 300ms, 500ms)

### 4. Alignment

Everything should align to something:

- Text aligns to a grid or baseline
- Components align to column structure
- Icons align to text baseline or center
- Edges align to common margin

### 5. Proximity

Related items should be close, unrelated items separated:

```css
/* Bad - Equal spacing everywhere */
.form-field {
  margin-bottom: 20px;
}

/* Good - Grouped by relationship */
.form-label {
  margin-bottom: 4px;
} /* Label close to input */
.form-input {
  margin-bottom: 8px;
} /* Input close to helper */
.form-helper {
  margin-bottom: 24px;
} /* Field group separate */
```

---

## Style-Specific Guidelines

### Minimalist Styles

**Characteristics:**

- Maximum whitespace (3x typical spacing)
- Monochromatic or near-monochromatic palettes
- Sans-serif typography, often geometric
- Minimal borders, shadows, or decorative elements
- Focus on content and functionality

**Example Tokens (Minimalist):**

```json
{
  "colors": {
    "background": "#FFFFFF",
    "surface": "#F8F8F8",
    "text-primary": "#1A1A1A",
    "text-secondary": "#666666",
    "accent": "#000000"
  },
  "typography": {
    "font-primary": "'Helvetica Neue', sans-serif",
    "font-secondary": "system-ui, sans-serif"
  },
  "spacing": {
    "unit": "8px",
    "scale": [0, 8, 16, 32, 64, 128]
  },
  "borders": {
    "radius": "0px",
    "width": "1px"
  },
  "shadows": {
    "none": "none"
  }
}
```

**Application Tips:**

- Use generous line-height (1.7-2.0)
- Limit color palette to 2-3 colors
- Embrace whitespace - don't fill every gap
- Use hairline borders (1px) or no borders
- Animation should be subtle or absent

---

### Historical Styles (Art Deco, Baroque, Victorian)

**Characteristics:**

- Ornamental details and decorative elements
- Rich color palettes with gold/metallic accents
- Serif typography with decorative alternates
- Geometric or organic patterns
- Luxury and opulence

**Example Tokens (Art Deco):**

```json
{
  "colors": {
    "background": "#0A0A0A",
    "surface": "#1A1A1A",
    "gold": "#D4AF37",
    "bronze": "#CD7F32",
    "pearl": "#F0EAD6",
    "emerald": "#046307"
  },
  "typography": {
    "font-display": "'Bodoni', 'Didot', serif",
    "font-body": "'Futura', 'Avenir', sans-serif"
  },
  "patterns": {
    "chevron": "repeating-linear-gradient(45deg, ...)",
    "sunburst": "radial-gradient(...)",
    "geometric": "conic-gradient(...)"
  },
  "borders": {
    "decorative": "2px solid var(--color-gold)"
  }
}
```

**Application Tips:**

- Use decorative borders and frames
- Incorporate geometric patterns as backgrounds
- Add metallic gradients for accents
- Use drop caps and ornamental typography
- High contrast between elements

---

### Digital UI Styles (Glassmorphism, Neumorphism, Material)

**Characteristics:**

- Modern web/app interface patterns
- Depth through shadows, blur, or elevation
- Smooth animations and transitions
- Interactive feedback on all actions
- Clean, functional layouts

**Example Tokens (Glassmorphism):**

```json
{
  "colors": {
    "background": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "glass-surface": "rgba(255, 255, 255, 0.1)",
    "glass-border": "rgba(255, 255, 255, 0.2)",
    "text-on-glass": "rgba(255, 255, 255, 0.9)"
  },
  "effects": {
    "backdrop-blur": "blur(10px)",
    "glass-shadow": "0 8px 32px 0 rgba(31, 38, 135, 0.37)"
  },
  "borders": {
    "radius": "16px",
    "width": "1px"
  }
}
```

**Application Tips:**

- Layer translucent surfaces with backdrop-blur
- Use subtle borders to define glass edges
- Add depth with layered shadows
- Animate blur and opacity on interactions
- Maintain legibility on varied backgrounds

---

### Futuristic Styles (Cyberpunk, Cybernetic, Dystopian)

**Characteristics:**

- High contrast (neon on dark)
- Technology-inspired elements
- Glitch effects and digital artifacts
- Monospace or tech-inspired fonts
- Angular shapes and sharp edges

**Example Tokens (Cyberpunk):**

```json
{
  "colors": {
    "background": "#0a0e27",
    "surface": "#151a2e",
    "neon-cyan": "#00f0ff",
    "neon-magenta": "#ff006e",
    "neon-yellow": "#ffea00",
    "grid-line": "#1a2038"
  },
  "typography": {
    "font-display": "'Orbitron', 'Exo', sans-serif",
    "font-mono": "'Share Tech Mono', monospace"
  },
  "effects": {
    "neon-glow": "0 0 10px currentColor, 0 0 20px currentColor",
    "scan-line": "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,240,255,0.03) 2px, rgba(0,240,255,0.03) 4px)"
  }
}
```

**Application Tips:**

- Use glow effects on interactive elements
- Add scan lines or grid backgrounds
- Animate with glitch transitions
- Use sharp corners (border-radius: 0 or 2px)
- High contrast text (neon on dark)

---

### Nature-Inspired Styles (Organic, Botanical, Coastal)

**Characteristics:**

- Natural color palettes
- Organic shapes and curves
- Texture and depth
- Soft, calming aesthetics
- Earth tones and green hues

**Example Tokens (Botanical):**

```json
{
  "colors": {
    "background": "#F5F3ED",
    "leaf-green": "#2D5016",
    "sage": "#9CAF88",
    "terracotta": "#C65D3B",
    "cream": "#F9F7F1"
  },
  "typography": {
    "font-display": "'Cormorant', serif",
    "font-body": "'Lora', serif"
  },
  "patterns": {
    "leaf-texture": "url('/patterns/botanical-leaves.svg')",
    "organic-shape": "border-radius: 60% 40% 70% 30% / 50% 60% 40% 50%"
  }
}
```

**Application Tips:**

- Use organic border-radius values
- Add subtle textures (paper, canvas, linen)
- Incorporate plant-inspired illustrations
- Use serif fonts for elegance
- Muted, natural color palettes

---

## Component Patterns

### Button Component

Every style needs distinct button treatment:

#### Minimalist Button

```css
.btn-minimalist {
  background: transparent;
  border: 1px solid var(--color-text);
  color: var(--color-text);
  padding: var(--space-sm) var(--space-md);
  font-family: var(--font-primary);
  font-weight: 500;
  transition: all 150ms ease;
}

.btn-minimalist:hover {
  background: var(--color-text);
  color: var(--color-background);
}

.btn-minimalist:focus {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}
```

#### Art Deco Button

```css
.btn-art-deco {
  background: linear-gradient(135deg, var(--color-gold) 0%, var(--color-bronze) 100%);
  border: 2px solid var(--color-gold);
  color: var(--color-background);
  padding: var(--space-md) var(--space-lg);
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  position: relative;
  overflow: hidden;
}

.btn-art-deco::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 500ms ease;
}

.btn-art-deco:hover::before {
  left: 100%;
}
```

#### Cyberpunk Button

```css
.btn-cyberpunk {
  background: transparent;
  border: 2px solid var(--color-neon-cyan);
  color: var(--color-neon-cyan);
  padding: var(--space-sm) var(--space-lg);
  font-family: var(--font-mono);
  font-weight: 700;
  text-transform: uppercase;
  position: relative;
  clip-path: polygon(
    0 0,
    calc(100% - 10px) 0,
    100% 10px,
    100% 100%,
    10px 100%,
    0 calc(100% - 10px)
  );
  box-shadow: 0 0 10px var(--color-neon-cyan);
  transition: all 200ms ease;
}

.btn-cyberpunk:hover {
  background: var(--color-neon-cyan);
  color: var(--color-background);
  box-shadow:
    0 0 20px var(--color-neon-cyan),
    inset 0 0 10px var(--color-neon-cyan);
  transform: translateY(-2px);
}

.btn-cyberpunk:active {
  transform: translateY(0);
  box-shadow: 0 0 5px var(--color-neon-cyan);
}
```

### Card Component

Cards should reflect style aesthetic:

#### Glassmorphism Card

```css
.card-glass {
  background: var(--glass-surface);
  backdrop-filter: var(--backdrop-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--glass-shadow);
}

.card-glass:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-4px);
  transition: all 300ms ease;
}
```

#### Brutalist Card

```css
.card-brutalist {
  background: var(--color-surface);
  border: 3px solid var(--color-text);
  padding: var(--space-md);
  box-shadow: 8px 8px 0 var(--color-text);
  transition: none; /* Brutalist = no smooth transitions */
}

.card-brutalist:hover {
  transform: translate(4px, 4px);
  box-shadow: 4px 4px 0 var(--color-text);
}
```

### Form Input

Input fields must match style language:

#### Neumorphism Input

```css
.input-neuro {
  background: var(--color-background);
  border: none;
  padding: var(--space-md);
  border-radius: var(--radius-lg);
  font-family: var(--font-body);
  box-shadow:
    inset 2px 2px 5px rgba(0, 0, 0, 0.1),
    inset -2px -2px 5px rgba(255, 255, 255, 0.7);
  transition: box-shadow 200ms ease;
}

.input-neuro:focus {
  outline: none;
  box-shadow:
    inset 4px 4px 8px rgba(0, 0, 0, 0.15),
    inset -4px -4px 8px rgba(255, 255, 255, 0.8),
    0 0 0 2px var(--color-accent);
}
```

#### Organic Input

```css
.input-organic {
  background: var(--color-cream);
  border: 2px solid var(--color-sage);
  padding: var(--space-md);
  border-radius: 24px 8px 24px 8px; /* Organic asymmetry */
  font-family: var(--font-body);
  color: var(--color-leaf-green);
  transition: all 200ms ease;
}

.input-organic:focus {
  outline: none;
  border-color: var(--color-leaf-green);
  border-radius: 8px 24px 8px 24px; /* Flip on focus */
  box-shadow: 0 4px 12px rgba(45, 80, 22, 0.1);
}
```

---

## Accessibility Standards

### Color Contrast

**WCAG AA Requirements (Minimum):**

- Normal text (< 18px): 4.5:1 contrast ratio
- Large text (≥ 18px or 14px bold): 3:1 contrast ratio
- UI components and graphics: 3:1 contrast ratio

**WCAG AAA Requirements (Enhanced):**

- Normal text: 7:1 contrast ratio
- Large text: 4.5:1 contrast ratio

**Testing Tools:**

```bash
# Use contrast checkers
https://contrast-ratio.com
https://webaim.org/resources/contrastchecker/
```

### Focus Indicators

Every focusable element MUST have visible focus:

```css
/* Bad - No focus indicator */
button {
  outline: none; /* NEVER do this without replacement */
}

/* Good - Custom focus indicator */
button {
  outline: none;
}

button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--color-focus-glow);
}
```

### Touch Targets

Minimum size for touch/click targets:

- **Minimum**: 44x44px (WCAG 2.1 Level AAA)
- **Recommended**: 48x48px (better for accessibility)
- **Spacing**: 8px minimum between adjacent targets

```css
.btn-accessible {
  min-width: 44px;
  min-height: 44px;
  padding: var(--space-sm) var(--space-md);
  margin: var(--space-xs);
}
```

### Semantic HTML

Use proper HTML elements:

```html
<!-- Bad -->
<div onclick="doSomething()">Click me</div>

<!-- Good -->
<button type="button" onclick="doSomething()">Click me</button>

<!-- Bad -->
<div class="heading">Page Title</div>

<!-- Good -->
<h1>Page Title</h1>

<!-- Bad -->
<div class="nav">
  <div class="link">Home</div>
</div>

<!-- Good -->
<nav>
  <a href="/">Home</a>
</nav>
```

---

## Motion & Animation

### Duration Guidelines

- **Micro-interactions**: 100-150ms (button hover, checkbox toggle)
- **Standard transitions**: 200-300ms (dropdown, tooltip, modal)
- **Complex animations**: 400-500ms (page transitions, drawer slide)
- **Loading states**: 600-1000ms (skeleton screens, progress)

### Easing Functions

Choose easing that matches the style:

```css
/* Minimalist - Simple, linear */
.minimalist-transition {
  transition: all 200ms linear;
}

/* Material - Responsive, natural */
.material-transition {
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Playful - Bouncy, energetic */
.playful-transition {
  transition: all 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* Brutalist - Abrupt, no easing */
.brutalist-transition {
  /* NO transition - instant changes */
}
```

### Reduced Motion

Always respect user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Responsive Design

### Breakpoint System

Standard breakpoints for most styles:

```css
/* Mobile first approach */
.component {
  /* Base styles (mobile) */
}

@media (min-width: 640px) {
  /* sm - tablet portrait */
  .component {
  }
}

@media (min-width: 768px) {
  /* md - tablet landscape */
  .component {
  }
}

@media (min-width: 1024px) {
  /* lg - laptop */
  .component {
  }
}

@media (min-width: 1280px) {
  /* xl - desktop */
  .component {
  }
}

@media (min-width: 1536px) {
  /* 2xl - large desktop */
  .component {
  }
}
```

### Fluid Typography

Scale typography responsively:

```css
.heading {
  font-size: clamp(
    var(--text-2xl),
    /* Minimum (mobile) */ 4vw + 1rem,
    /* Preferred (scales) */ var(--text-6xl) /* Maximum (desktop) */
  );
}
```

### Container Queries

For component-level responsiveness:

```css
.card-container {
  container-type: inline-size;
}

.card {
  display: grid;
  grid-template-columns: 1fr;
}

@container (min-width: 400px) {
  .card {
    grid-template-columns: 200px 1fr;
  }
}
```

---

## Checklist for Style Application

Before marking a component as "styled", verify:

- [ ] Uses design tokens (no hardcoded values)
- [ ] Has hover state (if interactive)
- [ ] Has focus state (keyboard accessible)
- [ ] Has active/pressed state (if button/link)
- [ ] Has disabled state (if applicable)
- [ ] Meets WCAG AA contrast requirements
- [ ] Touch target ≥ 44x44px (if interactive)
- [ ] Respects prefers-reduced-motion
- [ ] Works in light AND dark mode (if applicable)
- [ ] Responsive across mobile/tablet/desktop
- [ ] Uses semantic HTML
- [ ] Has proper ARIA labels (if needed)
- [ ] Matches the intended style aesthetic
- [ ] No generic "AI slop" patterns
- [ ] Animation duration is appropriate
- [ ] Typography scale is maintained

---

_This style guide is a living document. Update it as new patterns emerge and styles evolve._
