/**
 * React Class Component to Hooks Codemod
 *
 * Transforms React class components to functional components with hooks.
 * Handles: state, lifecycle methods, refs, context, and instance methods.
 *
 * Usage:
 *   jscodeshift -t react-class-to-hooks.ts path/to/file.jsx
 */

import type {
  API,
  FileInfo,
  Options,
  Collection,
  JSXElement,
  ClassDeclaration,
} from 'jscodeshift';

export default function transformer(
  fileInfo: FileInfo,
  api: API,
  options: Options
) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  let hasModifications = false;

  // Find all React class components
  root
    .find(j.ClassDeclaration)
    .filter((path) => {
      const superClass = path.value.superClass;
      if (!superClass) return false;

      // Check if extends React.Component or Component
      if (superClass.type === 'MemberExpression') {
        return (
          superClass.object.name === 'React' &&
          (superClass.property.name === 'Component' ||
            superClass.property.name === 'PureComponent')
        );
      }

      return (
        superClass.name === 'Component' || superClass.name === 'PureComponent'
      );
    })
    .forEach((classPath) => {
      const component = transformClassToFunction(j, classPath);
      if (component) {
        j(classPath).replaceWith(component);
        hasModifications = true;
      }
    });

  // Update imports if needed
  if (hasModifications) {
    updateImports(j, root);
  }

  return hasModifications ? root.toSource({ quote: 'single' }) : null;
}

// ============================================================================
// Core Transformation Functions
// ============================================================================

function transformClassToFunction(
  j: any,
  classPath: any
): any {
  const className = classPath.value.id.name;
  const classBody = classPath.value.body.body;

  // Extract class elements
  const stateProperties = extractState(j, classBody);
  const lifecycleMethods = extractLifecycleMethods(j, classBody);
  const instanceMethods = extractInstanceMethods(j, classBody);
  const refs = extractRefs(j, classBody);
  const contextUsage = extractContext(j, classBody);

  // Build hooks
  const hooks: any[] = [];

  // useState hooks
  if (stateProperties.length > 0) {
    hooks.push(...generateUseStateHooks(j, stateProperties));
  }

  // useRef hooks
  if (refs.length > 0) {
    hooks.push(...generateUseRefHooks(j, refs));
  }

  // useContext hooks
  if (contextUsage) {
    hooks.push(generateUseContextHook(j, contextUsage));
  }

  // useEffect hooks for lifecycle methods
  if (lifecycleMethods.length > 0) {
    hooks.push(...generateUseEffectHooks(j, lifecycleMethods));
  }

  // Transform render method
  const renderMethod = classBody.find(
    (node: any) =>
      node.type === 'ClassMethod' && node.key.name === 'render'
  );

  if (!renderMethod) {
    console.warn(`No render method found in ${className}`);
    return null;
  }

  const renderBody = renderMethod.value.body;

  // Build functional component body
  const functionBody: any[] = [
    ...hooks,
    ...transformInstanceMethods(j, instanceMethods),
  ];

  // Extract return statement from render
  const returnStatement = renderBody.body.find(
    (stmt: any) => stmt.type === 'ReturnStatement'
  );

  if (returnStatement) {
    functionBody.push(returnStatement);
  }

  // Build functional component
  const functionalComponent = j.functionDeclaration(
    j.identifier(className),
    [j.identifier('props')],
    j.blockStatement(functionBody)
  );

  // Add export if original was exported
  if (classPath.parent.value.type === 'ExportDefaultDeclaration') {
    return j.exportDefaultDeclaration(functionalComponent);
  }

  if (classPath.parent.value.type === 'ExportNamedDeclaration') {
    return j.exportNamedDeclaration(functionalComponent);
  }

  return functionalComponent;
}

// ============================================================================
// State Extraction
// ============================================================================

function extractState(j: any, classBody: any[]): any[] {
  const stateProperties: any[] = [];

  // Find constructor with state initialization
  const constructor = classBody.find(
    (node) =>
      node.type === 'ClassMethod' && node.kind === 'constructor'
  );

  if (constructor) {
    const constructorBody = constructor.value.body.body;

    // Find this.state = { ... }
    constructorBody.forEach((stmt: any) => {
      if (
        stmt.type === 'ExpressionStatement' &&
        stmt.expression.type === 'AssignmentExpression' &&
        stmt.expression.left.type === 'MemberExpression' &&
        stmt.expression.left.property.name === 'state'
      ) {
        const stateObject = stmt.expression.right;

        if (stateObject.type === 'ObjectExpression') {
          stateObject.properties.forEach((prop: any) => {
            stateProperties.push({
              name: prop.key.name,
              value: prop.value,
            });
          });
        }
      }
    });
  }

  // Also check for class property syntax: state = { ... }
  classBody.forEach((node) => {
    if (
      node.type === 'ClassProperty' &&
      node.key.name === 'state' &&
      node.value.type === 'ObjectExpression'
    ) {
      node.value.properties.forEach((prop: any) => {
        stateProperties.push({
          name: prop.key.name,
          value: prop.value,
        });
      });
    }
  });

  return stateProperties;
}

// ============================================================================
// Lifecycle Methods Extraction
// ============================================================================

function extractLifecycleMethods(j: any, classBody: any[]): any[] {
  const lifecycleMethods: any[] = [];

  const lifecycleNames = [
    'componentDidMount',
    'componentDidUpdate',
    'componentWillUnmount',
    'componentDidCatch',
  ];

  classBody.forEach((node) => {
    if (
      node.type === 'ClassMethod' &&
      lifecycleNames.includes(node.key.name)
    ) {
      lifecycleMethods.push({
        name: node.key.name,
        body: node.value.body,
        params: node.value.params,
      });
    }
  });

  return lifecycleMethods;
}

// ============================================================================
// Instance Methods Extraction
// ============================================================================

function extractInstanceMethods(j: any, classBody: any[]): any[] {
  const instanceMethods: any[] = [];

  const ignoredMethods = [
    'constructor',
    'render',
    'componentDidMount',
    'componentDidUpdate',
    'componentWillUnmount',
    'componentDidCatch',
  ];

  classBody.forEach((node) => {
    if (
      node.type === 'ClassMethod' &&
      !ignoredMethods.includes(node.key.name)
    ) {
      instanceMethods.push({
        name: node.key.name,
        params: node.value.params,
        body: node.value.body,
        async: node.value.async,
      });
    }
  });

  return instanceMethods;
}

// ============================================================================
// Refs Extraction
// ============================================================================

function extractRefs(j: any, classBody: any[]): string[] {
  const refs: string[] = [];

  // Find React.createRef() calls
  classBody.forEach((node) => {
    if (node.type === 'ClassProperty') {
      if (
        node.value?.type === 'CallExpression' &&
        node.value.callee.type === 'MemberExpression' &&
        node.value.callee.property.name === 'createRef'
      ) {
        refs.push(node.key.name);
      }
    }
  });

  return refs;
}

// ============================================================================
// Context Extraction
// ============================================================================

function extractContext(j: any, classBody: any[]): any | null {
  // Find contextType usage
  const contextType = classBody.find(
    (node) =>
      node.type === 'ClassProperty' && node.key.name === 'contextType'
  );

  return contextType ? contextType.value : null;
}

// ============================================================================
// Hook Generators
// ============================================================================

function generateUseStateHooks(j: any, stateProperties: any[]): any[] {
  return stateProperties.map((prop) => {
    const capitalizedName =
      prop.name.charAt(0).toUpperCase() + prop.name.slice(1);

    // const [name, setName] = useState(initialValue);
    return j.variableDeclaration('const', [
      j.variableDeclarator(
        j.arrayPattern([
          j.identifier(prop.name),
          j.identifier(`set${capitalizedName}`),
        ]),
        j.callExpression(j.identifier('useState'), [prop.value])
      ),
    ]);
  });
}

function generateUseRefHooks(j: any, refs: string[]): any[] {
  return refs.map((refName) => {
    // const refName = useRef(null);
    return j.variableDeclaration('const', [
      j.variableDeclarator(
        j.identifier(refName),
        j.callExpression(j.identifier('useRef'), [j.literal(null)])
      ),
    ]);
  });
}

function generateUseContextHook(j: any, contextValue: any): any {
  // const context = useContext(ContextValue);
  return j.variableDeclaration('const', [
    j.variableDeclarator(
      j.identifier('context'),
      j.callExpression(j.identifier('useContext'), [contextValue])
    ),
  ]);
}

function generateUseEffectHooks(j: any, lifecycleMethods: any[]): any[] {
  const hooks: any[] = [];

  lifecycleMethods.forEach((method) => {
    switch (method.name) {
      case 'componentDidMount':
        // useEffect(() => { ... }, []);
        hooks.push(
          j.expressionStatement(
            j.callExpression(j.identifier('useEffect'), [
              j.arrowFunctionExpression([], method.body),
              j.arrayExpression([]), // Empty deps = mount only
            ])
          )
        );
        break;

      case 'componentWillUnmount':
        // useEffect(() => { return () => { ... } }, []);
        hooks.push(
          j.expressionStatement(
            j.callExpression(j.identifier('useEffect'), [
              j.arrowFunctionExpression(
                [],
                j.blockStatement([
                  j.returnStatement(
                    j.arrowFunctionExpression([], method.body)
                  ),
                ])
              ),
              j.arrayExpression([]),
            ])
          )
        );
        break;

      case 'componentDidUpdate':
        // useEffect(() => { ... }); // No deps array
        // NOTE: This is a simplified version. Real implementation needs
        // to analyze prevProps/prevState usage
        hooks.push(
          j.expressionStatement(
            j.callExpression(j.identifier('useEffect'), [
              j.arrowFunctionExpression([], method.body),
            ])
          )
        );
        break;
    }
  });

  return hooks;
}

// ============================================================================
// Instance Method Transformation
// ============================================================================

function transformInstanceMethods(j: any, instanceMethods: any[]): any[] {
  return instanceMethods.map((method) => {
    // Transform to const handleClick = async () => { ... };
    return j.variableDeclaration('const', [
      j.variableDeclarator(
        j.identifier(method.name),
        j.arrowFunctionExpression(
          method.params,
          method.body,
          method.async
        )
      ),
    ]);
  });
}

// ============================================================================
// Import Updates
// ============================================================================

function updateImports(j: any, root: Collection): void {
  // Find React imports
  const reactImports = root.find(j.ImportDeclaration, {
    source: { value: 'react' },
  });

  if (reactImports.length === 0) return;

  reactImports.forEach((path) => {
    const specifiers = path.value.specifiers || [];

    // Remove Component/PureComponent imports
    const filteredSpecifiers = specifiers.filter(
      (spec: any) =>
        spec.imported?.name !== 'Component' &&
        spec.imported?.name !== 'PureComponent'
    );

    // Add hooks if not present
    const hooks = ['useState', 'useEffect', 'useRef', 'useContext'];
    hooks.forEach((hook) => {
      const exists = filteredSpecifiers.some(
        (spec: any) => spec.imported?.name === hook
      );

      if (!exists) {
        filteredSpecifiers.push(
          j.importSpecifier(j.identifier(hook))
        );
      }
    });

    path.value.specifiers = filteredSpecifiers;
  });
}
