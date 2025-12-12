# Design System Prompt Templates

Ready-to-use prompts for applying the AI design system. Copy, customize, and use these templates to ensure consistent, high-quality styling.

---

## Table of Contents

1. [Style Application Templates](#style-application-templates)
2. [Component Generation Templates](#component-generation-templates)
3. [Style Blending Templates](#style-blending-templates)
4. [Negative Prompting](#negative-prompting)
5. [Code Review Templates](#code-review-templates)
6. [Migration Templates](#migration-templates)

---

## Style Application Templates

### Template: Apply Single Style

```
<design_system_context>
You are styling components using the {STYLE_NAME} design system.

Active Style: {STYLE_NAME}
Token Reference: src/design-system/tokens/styles/{style-name}.json

Style Characteristics:
- {Characteristic 1}
- {Characteristic 2}
- {Characteristic 3}

Anti-AI-Slop Rules:
- DO NOT use Inter, Roboto, or Arial fonts
- DO NOT use generic purple gradients
- DO NOT use cookie-cutter card layouts
- DO commit fully to the {STYLE_NAME} aesthetic
- DO use design tokens for ALL values
- DO define hover, focus, active, and disabled states

Task: Apply {STYLE_NAME} styling to the following components:
{LIST_COMPONENTS}

Requirements:
1. Use design tokens from the style file
2. Include all interactive states (hover, focus, active, disabled)
3. Ensure WCAG AA color contrast
4. Make it distinctively {STYLE_NAME} - no generic patterns
5. Test in both light and dark contexts (if applicable)
</design_system_context>

Components to style:
{COMPONENT_CODE_OR_DESCRIPTION}
```

**Example Usage:**

```
<design_system_context>
You are styling components using the art-deco design system.

Active Style: art-deco
Token Reference: src/design-system/tokens/styles/art-deco.json

Style Characteristics:
- Geometric patterns and shapes (chevrons, sunbursts, zigzags)
- Luxurious color palette with gold, bronze, and rich jewel tones
- Bold, high-contrast typography using Bodoni or Didot for headings
- Decorative borders and frames
- Opulent, sophisticated atmosphere

Anti-AI-Slop Rules:
- DO NOT use Inter, Roboto, or Arial fonts
- DO NOT use generic purple gradients
- DO NOT use cookie-cutter card layouts
- DO commit fully to the art-deco aesthetic
- DO use design tokens for ALL values
- DO define hover, focus, active, and disabled states

Task: Apply art-deco styling to the following components:
- Navigation bar
- Hero section
- Feature cards
- Call-to-action button

Requirements:
1. Use design tokens from the style file
2. Include all interactive states (hover, focus, active, disabled)
3. Ensure WCAG AA color contrast
4. Make it distinctively art-deco - think 1920s luxury
5. Add geometric patterns as decorative elements
</design_system_context>

Components to style:
[Your component code here]
```

---

### Template: Apply Style to Specific Component

```
Style the following {COMPONENT_TYPE} using {STYLE_NAME} design tokens.

Component: {COMPONENT_TYPE}
Style: {STYLE_NAME}
Token File: src/design-system/tokens/styles/{style-name}.json

Requirements:
- Use tokens: colors, typography, spacing, borders, shadows
- Define states: default, hover, focus, active, disabled
- Ensure accessibility: WCAG AA contrast, 44x44px touch targets
- Match aesthetic: {STYLE_DESCRIPTION}
- Avoid AI slop: no generic patterns, commit to style fully

Current component code:
{COMPONENT_CODE}

Please:
1. Refactor to use design tokens
2. Add all interactive states
3. Ensure it's distinctively {STYLE_NAME}
4. Include usage example
```

---

## Component Generation Templates

### Template: Generate New Component

```
Generate a new {COMPONENT_NAME} component using the {STYLE_NAME} design system.

Component Requirements:
- Type: {COMPONENT_TYPE} (e.g., button, card, input, modal)
- Purpose: {COMPONENT_PURPOSE}
- Variants: {LIST_VARIANTS} (e.g., primary, secondary, danger)
- Props/API: {EXPECTED_PROPS}

Style Requirements:
- Active Style: {STYLE_NAME}
- Token Reference: src/design-system/tokens/styles/{style-name}.json
- Must include: all interactive states, accessibility features
- Must avoid: generic AI patterns, hardcoded values

Design System Rules:
1. Use design tokens exclusively (no magic numbers)
2. Define hover, focus, active, disabled states
3. Ensure WCAG AA accessibility
4. Match {STYLE_NAME} aesthetic fully
5. Provide clear API/props documentation

Additional Context:
{ANY_SPECIFIC_REQUIREMENTS}

Output should include:
- Component code (React/Vue/vanilla)
- Usage examples
- Props/API documentation
- Style tokens used
```

**Example: Generate Cyberpunk Button**

```
Generate a new Button component using the cyberpunk design system.

Component Requirements:
- Type: Button
- Purpose: Primary action buttons with futuristic feel
- Variants: primary, secondary, danger, ghost
- Props/API:
  - label (string)
  - variant (primary | secondary | danger | ghost)
  - size (sm | md | lg)
  - disabled (boolean)
  - onClick (function)

Style Requirements:
- Active Style: cyberpunk
- Token Reference: src/design-system/tokens/styles/cyberpunk.json
- Must include: neon glow effects, angular shapes, scan line animations
- Must avoid: rounded corners, soft shadows, pastel colors

Design System Rules:
1. Use cyberpunk tokens (neon-cyan, neon-magenta, tech fonts)
2. Add glow effect on hover, intensify on active
3. Use angular clip-path for futuristic edges
4. Monospace font for tech aesthetic
5. High contrast for accessibility (neon on dark)

Additional Context:
- Add subtle scan line animation on hover
- Include glitch effect on click (optional)
- Sharp corners only (border-radius: 0 or 2px max)

Output should include:
- React component code
- Usage examples (all variants)
- TypeScript interface
- CSS with design tokens
```

---

### Template: Generate Component Set

```
Generate a cohesive set of {COMPONENT_SET} components using {STYLE_NAME}.

Component Set: {COMPONENT_SET}
(e.g., "form components" = input, textarea, select, checkbox, radio, button)

Components Needed:
1. {COMPONENT_1}
2. {COMPONENT_2}
3. {COMPONENT_3}
4. ...

Shared Requirements:
- Visual cohesion: all components must feel like a family
- Active Style: {STYLE_NAME}
- Consistent spacing, colors, typography, interactions
- All states: hover, focus, active, disabled for each

Per-Component Requirements:
{SPECIFIC_REQUIREMENTS_FOR_EACH}

Output Structure:
- Component code for each
- Shared style tokens
- Usage example showing all components together
- Documentation for the set
```

---

## Style Blending Templates

### Template: Blend Two Styles

```
<style_blending_context>
Blend the following two design styles with a {RATIO} ratio.

Dominant Style ({PERCENTAGE_A}%): {STYLE_A}
Accent Style ({PERCENTAGE_B}%): {STYLE_B}

Blending Rules:
- Dominant style provides: core colors, primary typography, main spacing
- Accent style provides: secondary colors, accent fonts, decorative elements
- Result must feel cohesive, not disjointed

Token Blending Strategy:
1. Colors: {PERCENTAGE_A}% from {STYLE_A}, {PERCENTAGE_B}% from {STYLE_B}
2. Typography: Primary from {STYLE_A}, accents from {STYLE_B}
3. Spacing: Use {STYLE_A} scale
4. Decorative elements: Cherry-pick from both styles

Avoid:
- Style clash (incompatible aesthetics)
- Muddy middle ground (commit to blend decisively)
- Losing identity of both styles
</style_blending_context>

Apply this blended style to:
{COMPONENT_OR_LAYOUT}

Expected outcome: {DESCRIPTION_OF_DESIRED_AESTHETIC}
```

**Example: Art Deco + Cyberpunk Blend**

```
<style_blending_context>
Blend the following two design styles with a 70/30 ratio.

Dominant Style (70%): art-deco
Accent Style (30%): cyberpunk

Blending Rules:
- Art-deco provides: geometric patterns, luxury color base, elegant typography
- Cyberpunk provides: neon accent colors, tech elements, glow effects
- Result: Retro-futuristic luxury aesthetic (think Blade Runner meets Gatsby)

Token Blending Strategy:
1. Colors: Gold/bronze base from art-deco, neon cyan/magenta accents from cyberpunk
2. Typography: Art-deco serifs for headings, cyberpunk monospace for code/tech elements
3. Spacing: Use art-deco's generous spacing
4. Decorative: Art-deco geometric patterns with cyberpunk neon glow overlays

Avoid:
- Making it too busy (keep art-deco elegance)
- Losing cyberpunk edge (don't make neons too subtle)
- Clashing (gold + neon must harmonize)
</style_blending_context>

Apply this blended style to:
- Dashboard interface
- Data visualization cards
- Navigation with holographic accents

Expected outcome: Sophisticated, futuristic dashboard that feels like a luxury tech command center from a sci-fi film.
```

---

## Negative Prompting

### Template: What NOT to Do

Use this template to explicitly avoid "AI slop" patterns:

```
<negative_prompting>
When styling {COMPONENT_OR_LAYOUT}, explicitly AVOID these overused patterns:

Typography Avoid List:
- ❌ Inter font family
- ❌ Roboto font family
- ❌ Arial or Helvetica (except as fallbacks)
- ❌ Default system fonts without customization

Color Avoid List:
- ❌ Purple gradient (#667eea → #764ba2)
- ❌ Generic blue (#007bff, #0d6efd)
- ❌ Untweaked gray-50 through gray-900 scale
- ❌ Pure black (#000000) for backgrounds

Layout Avoid List:
- ❌ border-radius: 8px on everything
- ❌ Generic box-shadow: 0 4px 6px rgba(0,0,0,0.1)
- ❌ Max-width: 1200px centered container (unless intentional)
- ❌ gap: 1rem everywhere without rhythm

Component Avoid List:
- ❌ Gradient buttons with subtle shine
- ❌ Card grids with identical spacing
- ❌ Hero section with image + gradient overlay
- ❌ Navbar with logo left, links right (unless purposeful)

Content Avoid List:
- ❌ Overused emoji: 🚀 ✨ 🎉 💡 🔥 ⚡
- ❌ "Supercharge your workflow" type copy
- ❌ Generic stock photos

Instead, Use:
- {STYLE_SPECIFIC_FONTS}
- {STYLE_SPECIFIC_COLORS}
- {STYLE_SPECIFIC_LAYOUTS}
- {STYLE_SPECIFIC_PATTERNS}
- Commit FULLY to {STYLE_NAME} aesthetic
</negative_prompting>

Now style {COMPONENT_OR_LAYOUT} following these negative constraints.
```

---

## Code Review Templates

### Template: Review Component Styling

```
<design_system_review>
Review the following component against the {STYLE_NAME} design system standards.

Component Code:
{COMPONENT_CODE}

Review Checklist:

✅ Design Token Usage
- [ ] All colors use design tokens (no hardcoded hex/rgb)
- [ ] Typography uses token font families and sizes
- [ ] Spacing uses token scale (no arbitrary values)
- [ ] Borders use token radius and width
- [ ] Shadows use token definitions

✅ Interactive States
- [ ] Default state defined
- [ ] Hover state defined (if interactive)
- [ ] Focus state defined with visible indicator
- [ ] Active/pressed state defined
- [ ] Disabled state defined (if applicable)
- [ ] Loading state defined (if async)

✅ Accessibility
- [ ] Color contrast meets WCAG AA (4.5:1 text, 3:1 UI)
- [ ] Touch targets ≥ 44x44px
- [ ] Focus indicators visible and distinctive
- [ ] Semantic HTML elements used
- [ ] ARIA labels present where needed

✅ Style Adherence
- [ ] Matches {STYLE_NAME} aesthetic
- [ ] No generic "AI slop" patterns
- [ ] Distinctive and intentional design
- [ ] Cohesive with other components
- [ ] Appropriate for style category

✅ Responsive Design
- [ ] Works on mobile viewports
- [ ] Scales appropriately for tablet
- [ ] Optimized for desktop
- [ ] Uses fluid typography if needed
- [ ] Respects container constraints

✅ Motion & Animation
- [ ] Transition duration appropriate (100-500ms)
- [ ] Easing function matches style
- [ ] Respects prefers-reduced-motion
- [ ] Animations enhance, not distract

Provide:
1. Pass/fail for each checklist item
2. Specific issues found (with line numbers)
3. Recommendations for improvement
4. Refactored code (if needed)
</design_system_review>
```

---

## Migration Templates

### Template: Migrate from One Style to Another

```
<style_migration>
Migrate the following components from {OLD_STYLE} to {NEW_STYLE}.

Current Style: {OLD_STYLE}
Target Style: {NEW_STYLE}

Migration Strategy:
1. Identify all components using {OLD_STYLE} tokens
2. Map {OLD_STYLE} tokens to {NEW_STYLE} equivalents
3. Refactor components to use {NEW_STYLE} tokens
4. Update aesthetic details (shapes, patterns, etc.)
5. Test all interactive states
6. Verify accessibility maintained/improved

Token Mapping:
{OLD_STYLE} → {NEW_STYLE}
- colors-primary → colors-primary (likely different value)
- colors-secondary → colors-secondary
- font-heading → font-display
- space-md → space-md (may need adjustment)
- ... (complete mapping)

Components to Migrate:
{LIST_OF_COMPONENTS}

Requirements:
- Maintain functionality (don't break behavior)
- Improve consistency (align with {NEW_STYLE})
- Update documentation (note style change)
- Test thoroughly (all states, viewports)

Provide:
- Migration plan (step-by-step)
- Refactored component code
- Before/after comparison
- Testing checklist
</style_migration>
```

---

## Quick Reference Prompts

### One-Liner Prompts

**Apply Style:**

```
Apply {style-name} design system to {component-name}
```

**Generate Component:**

```
Generate a {component-type} in {style-name} style with {requirements}
```

**Blend Styles:**

```
Blend {style-a} with {style-b} at {ratio} and apply to {target}
```

**Review Component:**

```
Review {component-name} against {style-name} design system standards
```

**Fix AI Slop:**

```
Remove generic AI patterns from {component} and apply {style-name} properly
```

**Create Dark Mode:**

```
Create dark mode variant of {component} following {style-name} tokens
```

---

## Context-Aware Prompts

### For Coder Agent

```
Hey Coder, I need you to implement a {COMPONENT_NAME} following our {STYLE_NAME} design system.

Style Reference: src/design-system/tokens/styles/{style-name}.json

Requirements:
- Use design tokens exclusively
- Include all interactive states
- Ensure WCAG AA accessibility
- Match {STYLE_NAME} aesthetic perfectly
- No generic patterns (follow anti-AI-slop rules)

Here's the component spec:
{COMPONENT_SPEC}

Deliver:
1. Component code (with types if TS/React)
2. Styling (CSS-in-JS, styled-components, or CSS modules)
3. Usage example
4. Quick accessibility note
```

### For Reviewer Agent

```
Reviewer, please audit this component against our {STYLE_NAME} design system.

Component: {COMPONENT_NAME}
Style Guide: .claude/skills/design-system/references/style-guide.md

Check for:
1. Proper design token usage (no hardcoded values)
2. All interactive states present
3. Accessibility compliance (WCAG AA)
4. Style aesthetic adherence
5. No generic AI slop patterns

Component code:
{COMPONENT_CODE}

Flag any issues and suggest fixes.
```

### For Planner Agent

```
Planner, create a strategy for migrating our component library from {OLD_STYLE} to {NEW_STYLE}.

Current Components: {COMPONENT_LIST}
Old Style: {OLD_STYLE}
New Style: {NEW_STYLE}

Plan should include:
1. Token mapping ({OLD_STYLE} → {NEW_STYLE})
2. Component priority order (which to migrate first)
3. Breaking changes identification
4. Testing strategy
5. Rollout phases
6. Timeline estimate

Consider:
- Dependencies between components
- User-facing impact
- Development effort
- Risk mitigation
```

---

## Advanced Prompts

### Multi-Style Dashboard

```
<complex_styling_task>
Create a dashboard interface using THREE blended styles:

Base Style (50%): {STYLE_A}
Accent Style (30%): {STYLE_B}
Detail Style (20%): {STYLE_C}

Distribution:
- {STYLE_A}: Overall layout, primary navigation, main content areas
- {STYLE_B}: Data visualization, interactive elements, CTAs
- {STYLE_C}: Icons, micro-interactions, decorative accents

Dashboard Components:
1. Top navigation bar
2. Sidebar navigation
3. Main content area with cards
4. Data charts (bar, line, pie)
5. Alert notifications
6. User profile dropdown
7. Footer

Requirements:
- Cohesive despite three styles
- Distinctive zones using style variations
- Smooth transitions between styled areas
- Maintains accessibility across all components
- Responsive for mobile, tablet, desktop

Token Usage:
- Create blended token file: styles/dashboard-blend.json
- Document which tokens come from which style
- Ensure no token conflicts

Deliver:
- Complete dashboard layout code
- Blended token file
- Visual hierarchy explanation
- Usage guide for maintaining consistency
</complex_styling_task>
```

### Style System Creation

```
<create_new_style>
Create a new style for the design system: {NEW_STYLE_NAME}

Style Inspiration: {INSPIRATION_DESCRIPTION}
Category: {CATEGORY} (e.g., futuristic, nature-inspired, etc.)

Define:
1. Color Palette
   - Background colors
   - Surface colors
   - Text colors (primary, secondary, tertiary)
   - Accent colors (1-3)
   - Semantic colors (success, warning, error, info)

2. Typography
   - Font families (display, body, mono)
   - Font sizes (xs, sm, base, lg, xl, 2xl, 3xl, 4xl)
   - Font weights (normal, medium, bold)
   - Line heights (tight, normal, relaxed)
   - Letter spacing

3. Spacing Scale
   - Base unit (typically 4px or 8px)
   - Scale values (0, xs, sm, md, lg, xl, 2xl, 3xl, 4xl)

4. Border Styles
   - Radius values (none, sm, md, lg, full)
   - Border widths (thin, normal, thick)

5. Shadow Definitions
   - Elevation levels (none, sm, md, lg, xl)
   - Focus glow effects

6. Animation Tokens
   - Transition durations (fast, normal, slow)
   - Easing functions

7. Style-Specific Patterns
   - Decorative elements
   - Unique visual treatments
   - Signature design details

Output Format: JSON token file following design-system structure
Plus: Style guide entry, usage examples, component showcases
</create_new_style>
```

---

## Testing Prompts

### Accessibility Test

```
Test the following {COMPONENT_NAME} for accessibility compliance:

Component: {COMPONENT_CODE}
Style: {STYLE_NAME}

Run these checks:

1. Color Contrast
   - Test text on all backgrounds (aim for WCAG AA: 4.5:1)
   - Test UI elements (aim for 3:1)
   - Use tools: contrast-ratio.com or Chrome DevTools

2. Keyboard Navigation
   - Tab through all interactive elements
   - Verify focus indicators visible
   - Check tab order is logical
   - Ensure no keyboard traps

3. Screen Reader
   - Verify semantic HTML used
   - Check ARIA labels present where needed
   - Ensure alt text on images
   - Test with NVDA or JAWS

4. Touch Targets
   - Measure interactive element sizes
   - Ensure ≥ 44x44px touch targets
   - Verify adequate spacing between targets

5. Motion & Animation
   - Test with prefers-reduced-motion
   - Ensure animations can be disabled
   - Check for seizure triggers (no rapid flashing)

Report:
- Pass/fail for each category
- Specific issues found
- Recommended fixes
- WCAG level achieved (A, AA, or AAA)
```

---

## Documentation Prompts

### Generate Style Documentation

```
Generate comprehensive documentation for the {STYLE_NAME} design system.

Style: {STYLE_NAME}
Token File: src/design-system/tokens/styles/{style-name}.json

Documentation should include:

1. Style Overview
   - Name and description
   - Aesthetic characteristics
   - Use cases (when to use this style)
   - Inspiration sources

2. Token Reference
   - Color palette with hex values
   - Typography scale
   - Spacing system
   - Border and shadow definitions

3. Component Examples
   - Button variants
   - Form inputs
   - Cards
   - Navigation elements
   - At least 8-10 common components

4. Usage Guidelines
   - Do's and don'ts
   - Accessibility considerations
   - Responsive behavior
   - Animation recommendations

5. Code Examples
   - HTML/CSS snippets
   - React component examples
   - Usage in different frameworks

6. Visual Gallery
   - Screenshot examples
   - Before/after comparisons
   - Full page layouts

Output Format: Markdown file, structured, with code blocks and examples
```

---

## Conclusion

These prompt templates provide a comprehensive toolkit for working with the AI design system. Customize them based on your specific needs, and always reference the style guide and token files for accurate implementation.

### Quick Prompt Selection Guide

**Need to...**

- Apply a style → Use "Style Application Template"
- Create new component → Use "Component Generation Template"
- Mix styles → Use "Style Blending Template"
- Fix generic design → Use "Negative Prompting Template"
- Check quality → Use "Code Review Template"
- Change styles → Use "Migration Template"

### Best Practices for Prompting

1. **Be specific**: Name the exact style, component, and requirements
2. **Include context**: Reference token files and style guides
3. **Set constraints**: Use negative prompting to avoid AI slop
4. **Request states**: Always ask for hover, focus, active, disabled
5. **Demand accessibility**: Specify WCAG level and requirements
6. **Show examples**: Provide code or visual references when possible

---

_Keep these templates updated as the design system evolves. Add new templates for emerging patterns and use cases._
