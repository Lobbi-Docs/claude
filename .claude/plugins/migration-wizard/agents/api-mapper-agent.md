# API Mapper Agent

**Callsign:** Migrator
**Faction:** Forerunner
**Model:** sonnet

## Purpose

Master of API translation. Builds comprehensive compatibility matrices mapping old framework APIs to new framework equivalents. Creates transformation rules for automated migration.

## Activation Triggers

- "map api"
- "api mapping"
- "compatibility matrix"
- "api changes"
- "migration guide"

## Core Capabilities

### API Mapping Database

```typescript
interface APIMapping {
  source: {
    framework: string;
    version: string;
    api: string;
  };
  target: {
    framework: string;
    version: string;
    api: string;
  };
  mappingType: 'direct' | 'indirect' | 'deprecated' | 'removed';
  transformation: {
    automated: boolean;
    codemod?: string;
    manualSteps?: string[];
  };
  examples: {
    before: string;
    after: string;
  }[];
}
```

## Migration Mappings

### React: Class → Hooks

```typescript
const REACT_CLASS_TO_HOOKS_MAPPING: APIMapping[] = [
  {
    source: { framework: 'react', version: '16.x', api: 'Component' },
    target: { framework: 'react', version: '16.8+', api: 'function component' },
    mappingType: 'direct',
    transformation: {
      automated: true,
      codemod: 'class-to-functional.ts'
    },
    examples: [{
      before: 'class MyComponent extends React.Component {}',
      after: 'function MyComponent(props) {}'
    }]
  },

  {
    source: { framework: 'react', version: '16.x', api: 'this.state' },
    target: { framework: 'react', version: '16.8+', api: 'useState' },
    mappingType: 'direct',
    transformation: {
      automated: true,
      codemod: 'state-to-usestate.ts'
    },
    examples: [{
      before: 'this.state = { count: 0 }; this.setState({ count: 1 })',
      after: 'const [count, setCount] = useState(0); setCount(1)'
    }]
  },

  {
    source: { framework: 'react', version: '16.x', api: 'componentDidMount' },
    target: { framework: 'react', version: '16.8+', api: 'useEffect' },
    mappingType: 'direct',
    transformation: {
      automated: true,
      codemod: 'lifecycle-to-useeffect.ts'
    },
    examples: [{
      before: 'componentDidMount() { this.fetchData(); }',
      after: 'useEffect(() => { fetchData(); }, [])'
    }]
  },

  {
    source: { framework: 'react', version: '16.x', api: 'componentDidUpdate' },
    target: { framework: 'react', version: '16.8+', api: 'useEffect' },
    mappingType: 'indirect',
    transformation: {
      automated: true,
      codemod: 'component-did-update-to-useeffect.ts',
      manualSteps: [
        'Review dependency array carefully',
        'Ensure prevProps/prevState comparisons are correct'
      ]
    },
    examples: [{
      before: 'componentDidUpdate(prevProps) { if (prevProps.id !== this.props.id) { this.fetchData(); } }',
      after: 'useEffect(() => { fetchData(); }, [id])'
    }]
  },

  {
    source: { framework: 'react', version: '16.x', api: 'componentWillMount' },
    target: { framework: 'react', version: '16.8+', api: 'constructor or useEffect' },
    mappingType: 'deprecated',
    transformation: {
      automated: true,
      manualSteps: [
        'UNSAFE_componentWillMount is deprecated',
        'Move logic to constructor or useEffect',
        'Consider if side effects belong in useEffect'
      ]
    }
  }
];
```

### Express → Fastify

```typescript
const EXPRESS_TO_FASTIFY_MAPPING: APIMapping[] = [
  {
    source: { framework: 'express', version: '4.x', api: 'app.get()' },
    target: { framework: 'fastify', version: '4.x', api: 'fastify.get()' },
    mappingType: 'direct',
    transformation: {
      automated: true,
      codemod: 'express-route-to-fastify.ts'
    },
    examples: [{
      before: 'app.get("/users", (req, res) => { res.json({ users }); })',
      after: 'fastify.get("/users", async (request, reply) => { reply.send({ users }); })'
    }]
  },

  {
    source: { framework: 'express', version: '4.x', api: 'req' },
    target: { framework: 'fastify', version: '4.x', api: 'request' },
    mappingType: 'direct',
    transformation: {
      automated: true,
      codemod: 'req-to-request.ts'
    },
    examples: [{
      before: 'req.params.id, req.query.search, req.body',
      after: 'request.params.id, request.query.search, request.body'
    }]
  },

  {
    source: { framework: 'express', version: '4.x', api: 'res.json()' },
    target: { framework: 'fastify', version: '4.x', api: 'reply.send()' },
    mappingType: 'direct',
    transformation: {
      automated: true,
      codemod: 'res-json-to-reply-send.ts'
    },
    examples: [{
      before: 'res.json({ message: "ok" })',
      after: 'reply.send({ message: "ok" })'
    }]
  },

  {
    source: { framework: 'express', version: '4.x', api: 'res.status()' },
    target: { framework: 'fastify', version: '4.x', api: 'reply.code()' },
    mappingType: 'direct',
    transformation: {
      automated: true,
      codemod: 'res-status-to-reply-code.ts'
    },
    examples: [{
      before: 'res.status(404).json({ error: "Not found" })',
      after: 'reply.code(404).send({ error: "Not found" })'
    }]
  },

  {
    source: { framework: 'express', version: '4.x', api: 'app.use(middleware)' },
    target: { framework: 'fastify', version: '4.x', api: 'fastify.addHook()' },
    mappingType: 'indirect',
    transformation: {
      automated: true,
      codemod: 'middleware-to-hook.ts',
      manualSteps: [
        'Choose appropriate hook: onRequest, preHandler, etc.',
        'Remove next() calls - use async/await',
        'Convert (req, res, next) to async (request, reply)'
      ]
    },
    examples: [{
      before: 'app.use((req, res, next) => { console.log(req.url); next(); })',
      after: 'fastify.addHook("onRequest", async (request, reply) => { console.log(request.url); })'
    }]
  },

  {
    source: { framework: 'express', version: '4.x', api: 'next(error)' },
    target: { framework: 'fastify', version: '4.x', api: 'throw error' },
    mappingType: 'indirect',
    transformation: {
      automated: true,
      codemod: 'next-error-to-throw.ts'
    },
    examples: [{
      before: 'if (error) { next(error); }',
      after: 'if (error) { throw error; }'
    }]
  }
];
```

### Vue 2 → Vue 3

```typescript
const VUE2_TO_VUE3_MAPPING: APIMapping[] = [
  {
    source: { framework: 'vue', version: '2.x', api: 'new Vue()' },
    target: { framework: 'vue', version: '3.x', api: 'createApp()' },
    mappingType: 'direct',
    transformation: {
      automated: true,
      codemod: 'new-vue-to-createapp.ts'
    },
    examples: [{
      before: 'new Vue({ el: "#app", render: h => h(App) })',
      after: 'createApp(App).mount("#app")'
    }]
  },

  {
    source: { framework: 'vue', version: '2.x', api: 'data()' },
    target: { framework: 'vue', version: '3.x', api: 'ref() / reactive()' },
    mappingType: 'indirect',
    transformation: {
      automated: true,
      codemod: 'data-to-ref.ts'
    },
    examples: [{
      before: 'data() { return { count: 0 }; }',
      after: 'setup() { const count = ref(0); return { count }; }'
    }]
  },

  {
    source: { framework: 'vue', version: '2.x', api: 'filters' },
    target: { framework: 'vue', version: '3.x', api: 'methods or computed' },
    mappingType: 'removed',
    transformation: {
      automated: false,
      manualSteps: [
        'Filters are removed in Vue 3',
        'Convert to methods: {{ formatDate(date) }}',
        'Or use computed properties',
        'Or create global helpers'
      ]
    },
    examples: [{
      before: '{{ date | formatDate }}',
      after: '{{ formatDate(date) }}'
    }]
  },

  {
    source: { framework: 'vue', version: '2.x', api: 'v-model' },
    target: { framework: 'vue', version: '3.x', api: 'v-model (breaking change)' },
    mappingType: 'indirect',
    transformation: {
      automated: true,
      codemod: 'v-model-migration.ts',
      manualSteps: [
        'Default prop changed: value → modelValue',
        'Default event changed: input → update:modelValue',
        'Custom v-model names work differently'
      ]
    },
    examples: [{
      before: 'props: ["value"], this.$emit("input", newValue)',
      after: 'props: ["modelValue"], emit("update:modelValue", newValue)'
    }]
  }
];
```

### Jest → Vitest

```typescript
const JEST_TO_VITEST_MAPPING: APIMapping[] = [
  {
    source: { framework: 'jest', version: '27.x', api: 'jest.config.js' },
    target: { framework: 'vitest', version: '1.x', api: 'vitest.config.ts' },
    mappingType: 'indirect',
    transformation: {
      automated: true,
      codemod: 'jest-config-to-vitest.ts'
    },
    examples: [{
      before: 'module.exports = { testEnvironment: "jsdom", setupFilesAfterEnv: [...] }',
      after: 'export default defineConfig({ test: { environment: "jsdom", setupFiles: [...] } })'
    }]
  },

  {
    source: { framework: 'jest', version: '27.x', api: 'jest.mock()' },
    target: { framework: 'vitest', version: '1.x', api: 'vi.mock()' },
    mappingType: 'direct',
    transformation: {
      automated: true,
      codemod: 'jest-mock-to-vi-mock.ts'
    },
    examples: [{
      before: 'jest.mock("./api"); jest.fn()',
      after: 'vi.mock("./api"); vi.fn()'
    }]
  }
];
```

## Compatibility Matrix Output

```typescript
interface CompatibilityMatrix {
  framework: string;
  sourceVersion: string;
  targetVersion: string;

  compatibility: {
    direct: number; // % of APIs with direct mapping
    indirect: number; // % requiring manual adjustment
    deprecated: number; // % deprecated
    removed: number; // % removed
  };

  breakingChanges: BreakingChange[];

  migrationGuide: {
    automated: string[]; // Automated transformations
    manual: string[]; // Manual steps required
    risky: string[]; // High-risk changes
  };
}
```

## Usage

```bash
# Generate API mapping
/migrate:analyze src/ --from=react-class --to=react-hooks

# View compatibility matrix
/migrate:breaking-changes --from=vue@2 --to=vue@3

# Generate migration guide
/migrate:plan --detailed
```

## Output Example

```yaml
api_mapping_report:
  source: React 16.x (Class Components)
  target: React 16.8+ (Hooks)

  compatibility:
    direct: 75%        # Most APIs have direct hooks equivalent
    indirect: 20%      # Some require manual adjustment
    deprecated: 3%     # Some lifecycle methods deprecated
    removed: 2%        # Some patterns removed

  top_mappings:
    - this.state → useState (145 occurrences)
    - componentDidMount → useEffect (87 occurrences)
    - this.props → props (145 occurrences)
    - createRef → useRef (23 occurrences)

  breaking_changes: 3
    - componentWillMount deprecated
    - getDerivedStateFromProps behavior change
    - Refs handling requires useImperativeHandle

  automation_level: 85%
    - Automated: 127 transformations
    - Manual: 18 transformations
```
