# React Animation Studio

> Beautiful, performant web animations for React and TypeScript applications

React Animation Studio is a comprehensive Claude Code plugin that helps you create stunning animations for your React applications. It provides specialized agents, expert skills, and powerful commands to streamline your animation workflow.

## Features

- **6 Specialized Agents** - Expert AI agents for different animation domains
- **11 Domain Skills** - Deep knowledge of animation libraries and creative techniques
- **12 Powerful Commands** - Quick actions for common animation tasks
- **Creative Effects** - Backgrounds, text animations, 3D transforms, and more
- **Performance-First** - All animations optimized for 60fps
- **Accessibility Built-In** - Reduced motion support included
- **TypeScript Native** - Full type safety and IntelliSense

## Quick Start

### Installation

The plugin will be available in the Claude Code marketplace. Once published:

```bash
# Install via Claude Code CLI
claude plugin install react-animation-studio
```

### Basic Usage

```bash
# Generate an animation from description
/animate fade in from below with a bounce

# Create stunning backgrounds
/animate-background aurora --interactive

# Add typewriter text effect
/animate-text typewriter --text "Welcome" --speed 80

# Create 3D flip cards
/animate-3d flip-card --trigger hover

# Add creative effects
/animate-effects sparkle --count 5
```

## Agents

| Agent | Purpose |
|-------|---------|
| **animation-architect** | Design animation systems and choreography |
| **motion-designer** | Creative effects and physics-based motion |
| **performance-optimizer** | Optimize for 60fps and accessibility |
| **interaction-specialist** | Micro-interactions and gesture animations |
| **transition-engineer** | Page transitions and layout animations |
| **creative-effects-artist** | Backgrounds, text, 3D effects, and artistic treatments |

## Skills

### Core Animation Skills

| Skill | Library/Technique |
|-------|-------------------|
| **framer-motion** | Declarative React animations |
| **gsap** | Professional timeline animations |
| **css-animations** | Lightweight CSS keyframes |
| **spring-physics** | Natural, physics-based motion |
| **scroll-animations** | Scroll-triggered effects |
| **svg-animations** | Vector graphics and path animations |

### Creative Animation Skills

| Skill | Effects |
|-------|---------|
| **background-animations** | Gradients, particles, aurora, waves, blobs, mesh gradients |
| **accent-animations** | Floating shapes, glows, sparkles, animated borders, shimmer |
| **creative-effects** | Glitch, morph, liquid fills, magnetic, distortion, loaders |
| **text-animations** | Typewriter, character reveals, gradient text, scramble |
| **3d-animations** | Flip cards, tilt effects, cubes, parallax depth, carousels |

## Commands

### Core Commands

| Command | Description |
|---------|-------------|
| `/animate` | Generate animation from natural language |
| `/animate-component` | Add animations to existing components |
| `/animate-preset` | Apply pre-built animation presets |
| `/animate-sequence` | Create choreographed sequences |
| `/animate-scroll` | Add scroll-triggered animations |
| `/animate-transition` | Create page transitions |
| `/animate-audit` | Audit for performance and accessibility |
| `/animate-export` | Export as reusable components |

### Creative Commands

| Command | Description |
|---------|-------------|
| `/animate-background` | Generate animated backgrounds (gradients, particles, aurora) |
| `/animate-text` | Create text animations (typewriter, stagger, gradient) |
| `/animate-3d` | Create 3D effects (flip cards, tilt, cubes, parallax) |
| `/animate-effects` | Creative effects (glitch, morph, sparkle, glow) |

## Creative Animation Examples

### Aurora Background
```tsx
import { motion } from 'framer-motion';

export function AuroraBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-950">
      {['#00ff87', '#60efff', '#0061ff'].map((color, i) => (
        <motion.div
          key={i}
          className="absolute w-[150%] h-[50%] opacity-30 blur-3xl"
          style={{
            background: `linear-gradient(180deg, transparent, ${color}, transparent)`,
          }}
          animate={{
            y: ['0%', '100%', '0%'],
            x: ['-10%', '10%', '-10%'],
          }}
          transition={{
            duration: 10 + i * 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
```

### Typewriter Effect
```tsx
export function Typewriter({ text, speed = 50 }) {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      >
        |
      </motion.span>
    </span>
  );
}
```

### 3D Flip Card
```tsx
export function FlipCard({ front, back }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      style={{ perspective: '1000px' }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring' }}
      >
        <div style={{ backfaceVisibility: 'hidden' }}>{front}</div>
        <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          {back}
        </div>
      </motion.div>
    </div>
  );
}
```

### Sparkle Effect
```tsx
export function SparkleWrapper({ children }) {
  const [sparkles, setSparkles] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSparkles(prev => [...prev.slice(-4), {
        id: Date.now(),
        x: Math.random() * 100,
        y: Math.random() * 100,
      }]);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative inline-block">
      {sparkles.map(sparkle => (
        <motion.span
          key={sparkle.id}
          className="absolute pointer-events-none"
          style={{ left: `${sparkle.x}%`, top: `${sparkle.y}%` }}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1, 0], rotate: [0, 180] }}
          transition={{ duration: 0.8 }}
        >
          ✦
        </motion.span>
      ))}
      {children}
    </span>
  );
}
```

### Glitch Text
```tsx
export function GlitchText({ children }) {
  return (
    <motion.span
      className="relative inline-block"
      whileHover="glitch"
    >
      <span>{children}</span>
      <motion.span
        className="absolute inset-0 text-cyan-500"
        variants={{
          glitch: {
            x: [-2, 2, -2],
            transition: { duration: 0.1, repeat: Infinity },
          },
        }}
        style={{ clipPath: 'inset(0 0 50% 0)' }}
      >
        {children}
      </motion.span>
      <motion.span
        className="absolute inset-0 text-red-500"
        variants={{
          glitch: {
            x: [2, -2, 2],
            transition: { duration: 0.1, repeat: Infinity },
          },
        }}
        style={{ clipPath: 'inset(50% 0 0 0)' }}
      >
        {children}
      </motion.span>
    </motion.span>
  );
}
```

## Animation Presets

### Entrance Animations
- `fade-in`, `fade-in-up`, `fade-in-down`
- `slide-in-left`, `slide-in-right`
- `scale-in`, `bounce-in`, `zoom-in`

### Hover Effects
- `hover-lift`, `hover-scale`, `hover-glow`
- `hover-tilt`, `hover-underline`

### Attention Seekers
- `pulse`, `bounce`, `shake`
- `wobble`, `heartbeat`, `rubber-band`

### Creative Effects
- `aurora`, `gradient-flow`, `particles`
- `typewriter`, `scramble`, `wave-text`
- `flip-card`, `tilt`, `parallax`
- `glitch`, `morph`, `sparkle`

## Performance Best Practices

The plugin enforces these best practices:

1. **GPU-Accelerated Properties** - Only animate `transform` and `opacity`
2. **Proper Cleanup** - All animations cleaned up on unmount
3. **Reduced Motion** - Automatic support for accessibility
4. **Spring Physics** - Natural, interruptible animations
5. **Consistent Timing** - Animation tokens for consistency

## Accessibility

All generated animations include:

- `prefers-reduced-motion` media query support
- `useReducedMotion` hook integration
- Alternative animations for vestibular disorders
- WCAG 2.1 compliance checks

## Requirements

- React 18+
- TypeScript 5+
- One of: Framer Motion, GSAP, or React Spring

## Configuration

Create `animation.config.ts` in your project root:

```typescript
export default {
  defaultLibrary: 'framer-motion',
  preferReducedMotion: true,
  performanceMode: 'balanced',
  tokens: {
    duration: {
      fast: 0.15,
      normal: 0.3,
      slow: 0.5,
    },
    easing: {
      default: [0.25, 0.1, 0.25, 1],
    },
  },
};
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see LICENSE file for details.

## Author

Created by **Brookside BI** - Establishing scalable solutions that drive measurable outcomes.

---

**React Animation Studio** - Transform your React apps with beautiful, performant animations.
