/**
 * Express to Fastify Codemod
 *
 * Transforms Express.js routes and middleware to Fastify equivalents.
 * Handles: route handlers, middleware, request/response objects, error handling.
 *
 * Usage:
 *   jscodeshift -t express-to-fastify.ts path/to/routes.js
 */

import type { API, FileInfo, Options } from 'jscodeshift';

export default function transformer(
  fileInfo: FileInfo,
  api: API,
  options: Options
) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  let hasModifications = false;

  // Transform app.get/post/put/delete to fastify.get/post/put/delete
  root
    .find(j.CallExpression)
    .filter((path) => {
      const callee = path.value.callee;
      if (callee.type !== 'MemberExpression') return false;

      const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'options'];
      return (
        (callee.object.name === 'app' || callee.object.name === 'router') &&
        httpMethods.includes(callee.property.name)
      );
    })
    .forEach((path) => {
      transformRoute(j, path);
      hasModifications = true;
    });

  // Transform middleware: app.use()
  root
    .find(j.CallExpression)
    .filter((path) => {
      const callee = path.value.callee;
      return (
        callee.type === 'MemberExpression' &&
        callee.object.name === 'app' &&
        callee.property.name === 'use'
      );
    })
    .forEach((path) => {
      transformMiddleware(j, path);
      hasModifications = true;
    });

  // Transform req/res parameters in route handlers
  if (hasModifications) {
    transformReqResParams(j, root);
    updateImports(j, root);
  }

  return hasModifications ? root.toSource({ quote: 'single' }) : null;
}

// ============================================================================
// Route Transformation
// ============================================================================

function transformRoute(j: any, path: any): void {
  const args = path.value.arguments;

  if (args.length < 2) return;

  const routePath = args[0]; // Path string
  const handlers = args.slice(1); // Handler functions

  // Transform each handler
  const transformedHandlers = handlers.map((handler: any) => {
    if (handler.type === 'ArrowFunctionExpression' ||
        handler.type === 'FunctionExpression') {
      return transformHandler(j, handler);
    }
    return handler;
  });

  // For Fastify, we need to wrap route in options object if middleware present
  if (transformedHandlers.length > 1) {
    // Multiple handlers = middleware + handler
    const middleware = transformedHandlers.slice(0, -1);
    const mainHandler = transformedHandlers[transformedHandlers.length - 1];

    // fastify.get('/path', { preHandler: [middleware] }, handler)
    path.value.arguments = [
      routePath,
      j.objectExpression([
        j.property(
          'init',
          j.identifier('preHandler'),
          j.arrayExpression(middleware)
        ),
      ]),
      mainHandler,
    ];
  } else {
    // Single handler
    path.value.arguments = [routePath, transformedHandlers[0]];
  }

  // Change app/router to fastify
  const callee = path.value.callee;
  if (callee.type === 'MemberExpression') {
    callee.object.name = 'fastify';
  }
}

// ============================================================================
// Handler Transformation
// ============================================================================

function transformHandler(j: any, handler: any): any {
  const params = handler.params;

  // Express: (req, res, next) => {}
  // Fastify: async (request, reply) => {}

  if (params.length === 0) return handler;

  // Rename parameters
  const newParams = [];

  if (params[0]) {
    params[0].name = 'request';
    newParams.push(params[0]);
  }

  if (params[1]) {
    params[1].name = 'reply';
    newParams.push(params[1]);
  }

  // Note: 'next' is not needed in Fastify (handled via async/await)

  handler.params = newParams;

  // Make handler async if not already
  if (!handler.async) {
    handler.async = true;
  }

  // Transform handler body
  if (handler.body.type === 'BlockStatement') {
    transformHandlerBody(j, handler.body);
  }

  return handler;
}

// ============================================================================
// Handler Body Transformation
// ============================================================================

function transformHandlerBody(j: any, body: any): void {
  // Transform common Express patterns to Fastify equivalents

  const statements = body.body;

  statements.forEach((stmt: any, index: number) => {
    // res.send() -> reply.send()
    transformResSend(j, stmt);

    // res.json() -> reply.send() (Fastify auto-detects JSON)
    transformResJson(j, stmt);

    // res.status() -> reply.code()
    transformResStatus(j, stmt);

    // req.params -> request.params (already handled by param rename)
    // req.query -> request.query
    // req.body -> request.body

    // res.redirect() -> reply.redirect()
    transformResRedirect(j, stmt);

    // next(error) -> throw error
    transformNextError(j, stmt, statements, index);

    // req.headers -> request.headers
    // Already handled by param rename
  });
}

function transformResSend(j: any, stmt: any): void {
  j(stmt)
    .find(j.CallExpression)
    .filter((path: any) => {
      const callee = path.value.callee;
      return (
        callee.type === 'MemberExpression' &&
        callee.object.name === 'res' &&
        callee.property.name === 'send'
      );
    })
    .forEach((path: any) => {
      path.value.callee.object.name = 'reply';
    });
}

function transformResJson(j: any, stmt: any): void {
  j(stmt)
    .find(j.CallExpression)
    .filter((path: any) => {
      const callee = path.value.callee;
      return (
        callee.type === 'MemberExpression' &&
        callee.object.name === 'res' &&
        callee.property.name === 'json'
      );
    })
    .forEach((path: any) => {
      path.value.callee.object.name = 'reply';
      path.value.callee.property.name = 'send'; // Fastify auto-detects JSON
    });
}

function transformResStatus(j: any, stmt: any): void {
  j(stmt)
    .find(j.CallExpression)
    .filter((path: any) => {
      const callee = path.value.callee;
      return (
        callee.type === 'MemberExpression' &&
        callee.object.name === 'res' &&
        callee.property.name === 'status'
      );
    })
    .forEach((path: any) => {
      path.value.callee.object.name = 'reply';
      path.value.callee.property.name = 'code';
    });
}

function transformResRedirect(j: any, stmt: any): void {
  j(stmt)
    .find(j.CallExpression)
    .filter((path: any) => {
      const callee = path.value.callee;
      return (
        callee.type === 'MemberExpression' &&
        callee.object.name === 'res' &&
        callee.property.name === 'redirect'
      );
    })
    .forEach((path: any) => {
      path.value.callee.object.name = 'reply';
    });
}

function transformNextError(
  j: any,
  stmt: any,
  statements: any[],
  index: number
): void {
  // Transform next(error) to throw error
  j(stmt)
    .find(j.CallExpression)
    .filter((path: any) => {
      const callee = path.value.callee;
      return callee.type === 'Identifier' && callee.name === 'next';
    })
    .forEach((path: any) => {
      const args = path.value.arguments;

      if (args.length > 0) {
        // next(error) -> throw error
        const throwStmt = j.throwStatement(args[0]);
        statements[index] = throwStmt;
      } else {
        // next() with no args -> return (continue to next handler)
        statements[index] = j.returnStatement();
      }
    });
}

// ============================================================================
// Middleware Transformation
// ============================================================================

function transformMiddleware(j: any, path: any): void {
  const args = path.value.arguments;

  // app.use(middleware) -> fastify.addHook('onRequest', middleware)
  if (args.length === 1) {
    const middleware = args[0];

    path.value.callee.object.name = 'fastify';
    path.value.callee.property.name = 'addHook';

    path.value.arguments = [
      j.literal('onRequest'),
      transformMiddlewareHandler(j, middleware),
    ];
  }

  // app.use('/path', middleware) -> fastify.register with prefix
  if (args.length === 2 && args[0].type === 'Literal') {
    const routePath = args[0];
    const middleware = args[1];

    // More complex transformation needed - create plugin
    // This is a simplified version
    path.value.callee.object.name = 'fastify';
    path.value.callee.property.name = 'register';

    const plugin = j.arrowFunctionExpression(
      [j.identifier('fastify'), j.identifier('opts')],
      j.blockStatement([
        j.expressionStatement(
          j.callExpression(
            j.memberExpression(
              j.identifier('fastify'),
              j.identifier('addHook')
            ),
            [
              j.literal('onRequest'),
              transformMiddlewareHandler(j, middleware),
            ]
          )
        ),
      ])
    );

    path.value.arguments = [
      plugin,
      j.objectExpression([
        j.property('init', j.identifier('prefix'), routePath),
      ]),
    ];
  }
}

function transformMiddlewareHandler(j: any, middleware: any): any {
  if (
    middleware.type === 'ArrowFunctionExpression' ||
    middleware.type === 'FunctionExpression'
  ) {
    // Transform (req, res, next) to async (request, reply)
    const params = middleware.params;

    if (params.length >= 2) {
      params[0].name = 'request';
      params[1].name = 'reply';
      params.splice(2); // Remove 'next' parameter
    }

    middleware.async = true;

    // Transform body to remove next() calls
    if (middleware.body.type === 'BlockStatement') {
      removeNextCalls(j, middleware.body);
    }

    return middleware;
  }

  return middleware;
}

function removeNextCalls(j: any, body: any): void {
  j(body)
    .find(j.CallExpression)
    .filter((path: any) => {
      return path.value.callee.name === 'next';
    })
    .forEach((path: any) => {
      // Replace next() with return
      j(path).replaceWith(j.returnStatement());
    });
}

// ============================================================================
// Request/Response Parameter Transformation
// ============================================================================

function transformReqResParams(j: any, root: any): void {
  // Global replace of 'req' with 'request' in identifiers
  root
    .find(j.Identifier)
    .filter((path: any) => path.value.name === 'req')
    .forEach((path: any) => {
      path.value.name = 'request';
    });

  // Global replace of 'res' with 'reply' in identifiers
  root
    .find(j.Identifier)
    .filter((path: any) => path.value.name === 'res')
    .forEach((path: any) => {
      path.value.name = 'reply';
    });
}

// ============================================================================
// Import Updates
// ============================================================================

function updateImports(j: any, root: any): void {
  // Find express imports
  const expressImports = root.find(j.VariableDeclaration).filter((path: any) => {
    const declarations = path.value.declarations;
    return declarations.some((decl: any) => {
      return (
        decl.init?.type === 'CallExpression' &&
        decl.init.callee.name === 'require' &&
        decl.init.arguments[0]?.value === 'express'
      );
    });
  });

  if (expressImports.length === 0) return;

  // Replace with Fastify import
  expressImports.forEach((path: any) => {
    const declarations = path.value.declarations;

    declarations.forEach((decl: any) => {
      if (
        decl.init?.callee.name === 'require' &&
        decl.init.arguments[0]?.value === 'express'
      ) {
        decl.init.arguments[0].value = 'fastify';

        // Change: const app = express() -> const app = fastify()
        // Actually needs: const fastify = require('fastify')({ logger: true })
        // This is simplified
      }
    });
  });

  // Handle ES6 imports
  root
    .find(j.ImportDeclaration)
    .filter((path: any) => path.value.source.value === 'express')
    .forEach((path: any) => {
      path.value.source.value = 'fastify';
    });
}
