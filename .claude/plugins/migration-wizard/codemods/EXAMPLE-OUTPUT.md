# Codemod Example Output

This file demonstrates a complete migration example showing exactly what Migration Wizard produces.

## Migration Request

```bash
/migrate:file src/components/ShoppingCart.jsx \
  --from=react-class \
  --to=react-hooks \
  --dry-run
```

## Original File (Before Migration)

**File:** `src/components/ShoppingCart.jsx`

```jsx
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { CartItem } from './CartItem';
import { api } from '../services/api';

/**
 * Shopping cart component
 * Manages cart state and checkout process
 */
class ShoppingCart extends Component {
  static propTypes = {
    userId: PropTypes.string.isRequired,
    onCheckout: PropTypes.func,
    currency: PropTypes.string
  };

  static defaultProps = {
    currency: 'USD',
    onCheckout: () => {}
  };

  constructor(props) {
    super(props);

    this.state = {
      items: [],
      loading: true,
      error: null,
      total: 0,
      isCheckingOut: false
    };

    this.checkoutButtonRef = React.createRef();
    this.abortController = null;
  }

  componentDidMount() {
    this.loadCartItems();
    document.addEventListener('storage', this.handleStorageChange);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.userId !== this.props.userId) {
      this.loadCartItems();
    }

    if (prevProps.currency !== this.props.currency) {
      this.recalculateTotal();
    }
  }

  componentWillUnmount() {
    if (this.abortController) {
      this.abortController.abort();
    }
    document.removeEventListener('storage', this.handleStorageChange);
  }

  handleStorageChange = (event) => {
    if (event.key === 'cart') {
      this.loadCartItems();
    }
  };

  loadCartItems = async () => {
    this.setState({ loading: true, error: null });

    try {
      this.abortController = new AbortController();

      const response = await api.getCart(this.props.userId, {
        signal: this.abortController.signal
      });

      const items = response.data;
      const total = this.calculateTotal(items);

      this.setState({
        items,
        total,
        loading: false
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        this.setState({
          error: error.message,
          loading: false
        });
      }
    }
  };

  calculateTotal = (items) => {
    return items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
  };

  recalculateTotal = () => {
    const total = this.calculateTotal(this.state.items);
    this.setState({ total });
  };

  handleQuantityChange = (itemId, newQuantity) => {
    const updatedItems = this.state.items.map(item => {
      if (item.id === itemId) {
        return { ...item, quantity: newQuantity };
      }
      return item;
    });

    const total = this.calculateTotal(updatedItems);

    this.setState({
      items: updatedItems,
      total
    });

    // Debounced API update
    this.debouncedUpdateCart(updatedItems);
  };

  handleRemoveItem = (itemId) => {
    const updatedItems = this.state.items.filter(item => item.id !== itemId);
    const total = this.calculateTotal(updatedItems);

    this.setState({
      items: updatedItems,
      total
    });

    api.updateCart(this.props.userId, updatedItems);
  };

  handleCheckout = async () => {
    this.setState({ isCheckingOut: true });

    try {
      await api.checkout(this.props.userId, this.state.items);

      this.props.onCheckout({
        items: this.state.items,
        total: this.state.total
      });

      this.setState({
        items: [],
        total: 0,
        isCheckingOut: false
      });
    } catch (error) {
      this.setState({
        error: error.message,
        isCheckingOut: false
      });
    }
  };

  // Utility method for debouncing
  debouncedUpdateCart = (() => {
    let timeoutId;
    return (items) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        api.updateCart(this.props.userId, items);
      }, 500);
    };
  })();

  render() {
    const { items, loading, error, total, isCheckingOut } = this.state;
    const { currency } = this.props;

    if (loading) {
      return <div className="cart-loading">Loading cart...</div>;
    }

    if (error) {
      return (
        <div className="cart-error">
          <p>Error: {error}</p>
          <button onClick={this.loadCartItems}>Retry</button>
        </div>
      );
    }

    if (items.length === 0) {
      return <div className="cart-empty">Your cart is empty</div>;
    }

    return (
      <div className="shopping-cart">
        <h2>Shopping Cart</h2>

        <div className="cart-items">
          {items.map(item => (
            <CartItem
              key={item.id}
              item={item}
              currency={currency}
              onQuantityChange={this.handleQuantityChange}
              onRemove={this.handleRemoveItem}
            />
          ))}
        </div>

        <div className="cart-total">
          <strong>Total:</strong> {currency} {total.toFixed(2)}
        </div>

        <button
          ref={this.checkoutButtonRef}
          className="checkout-button"
          onClick={this.handleCheckout}
          disabled={isCheckingOut}
        >
          {isCheckingOut ? 'Processing...' : 'Checkout'}
        </button>
      </div>
    );
  }
}

export default ShoppingCart;
```

## Transformed File (After Migration)

**File:** `src/components/ShoppingCart.jsx`

```jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { CartItem } from './CartItem';
import { api } from '../services/api';

/**
 * Shopping cart component
 * Manages cart state and checkout process
 */
function ShoppingCart(props) {
  const { userId, onCheckout = () => {}, currency = 'USD' } = props;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const checkoutButtonRef = useRef(null);
  const abortControllerRef = useRef(null);
  const updateCartTimeoutRef = useRef(null);

  const calculateTotal = useCallback((items) => {
    return items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
  }, []);

  const recalculateTotal = useCallback(() => {
    const newTotal = calculateTotal(items);
    setTotal(newTotal);
  }, [items, calculateTotal]);

  const debouncedUpdateCart = useCallback((items) => {
    clearTimeout(updateCartTimeoutRef.current);
    updateCartTimeoutRef.current = setTimeout(() => {
      api.updateCart(userId, items);
    }, 500);
  }, [userId]);

  const loadCartItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      abortControllerRef.current = new AbortController();

      const response = await api.getCart(userId, {
        signal: abortControllerRef.current.signal
      });

      const cartItems = response.data;
      const cartTotal = calculateTotal(cartItems);

      setItems(cartItems);
      setTotal(cartTotal);
      setLoading(false);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        setLoading(false);
      }
    }
  }, [userId, calculateTotal]);

  const handleStorageChange = useCallback((event) => {
    if (event.key === 'cart') {
      loadCartItems();
    }
  }, [loadCartItems]);

  const handleQuantityChange = useCallback((itemId, newQuantity) => {
    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        return { ...item, quantity: newQuantity };
      }
      return item;
    });

    const newTotal = calculateTotal(updatedItems);

    setItems(updatedItems);
    setTotal(newTotal);

    // Debounced API update
    debouncedUpdateCart(updatedItems);
  }, [items, calculateTotal, debouncedUpdateCart]);

  const handleRemoveItem = useCallback((itemId) => {
    const updatedItems = items.filter(item => item.id !== itemId);
    const newTotal = calculateTotal(updatedItems);

    setItems(updatedItems);
    setTotal(newTotal);

    api.updateCart(userId, updatedItems);
  }, [items, userId, calculateTotal]);

  const handleCheckout = useCallback(async () => {
    setIsCheckingOut(true);

    try {
      await api.checkout(userId, items);

      onCheckout({
        items,
        total
      });

      setItems([]);
      setTotal(0);
      setIsCheckingOut(false);
    } catch (err) {
      setError(err.message);
      setIsCheckingOut(false);
    }
  }, [userId, items, total, onCheckout]);

  // Mount: load cart items and setup event listener
  useEffect(() => {
    loadCartItems();
    document.addEventListener('storage', handleStorageChange);
  }, [loadCartItems, handleStorageChange]);

  // Unmount: cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      document.removeEventListener('storage', handleStorageChange);
      clearTimeout(updateCartTimeoutRef.current);
    };
  }, [handleStorageChange]);

  // Update on userId change
  useEffect(() => {
    loadCartItems();
  }, [userId, loadCartItems]);

  // Update on currency change
  useEffect(() => {
    recalculateTotal();
  }, [currency, recalculateTotal]);

  if (loading) {
    return <div className="cart-loading">Loading cart...</div>;
  }

  if (error) {
    return (
      <div className="cart-error">
        <p>Error: {error}</p>
        <button onClick={loadCartItems}>Retry</button>
      </div>
    );
  }

  if (items.length === 0) {
    return <div className="cart-empty">Your cart is empty</div>;
  }

  return (
    <div className="shopping-cart">
      <h2>Shopping Cart</h2>

      <div className="cart-items">
        {items.map(item => (
          <CartItem
            key={item.id}
            item={item}
            currency={currency}
            onQuantityChange={handleQuantityChange}
            onRemove={handleRemoveItem}
          />
        ))}
      </div>

      <div className="cart-total">
        <strong>Total:</strong> {currency} {total.toFixed(2)}
      </div>

      <button
        ref={checkoutButtonRef}
        className="checkout-button"
        onClick={handleCheckout}
        disabled={isCheckingOut}
      >
        {isCheckingOut ? 'Processing...' : 'Checkout'}
      </button>
    </div>
  );
}

ShoppingCart.propTypes = {
  userId: PropTypes.string.isRequired,
  onCheckout: PropTypes.func,
  currency: PropTypes.string
};

export default ShoppingCart;
```

## Transformation Summary

```yaml
migration_report:
  file: src/components/ShoppingCart.jsx
  status: SUCCESS
  duration: 9_minutes_32_seconds

  transformations:
    - type: class_to_function
      description: Converted class component to functional component

    - type: state_to_useState
      count: 5
      state_variables:
        - items
        - loading
        - error
        - total
        - isCheckingOut

    - type: refs_to_useRef
      count: 3
      refs:
        - checkoutButtonRef
        - abortControllerRef (converted from instance variable)
        - updateCartTimeoutRef (for debouncing)

    - type: lifecycle_to_useEffect
      count: 5
      conversions:
        - componentDidMount → useEffect (mount + event listener)
        - componentWillUnmount → useEffect cleanup
        - componentDidUpdate (userId) → useEffect with [userId]
        - componentDidUpdate (currency) → useEffect with [currency]

    - type: methods_to_useCallback
      count: 7
      methods:
        - calculateTotal
        - loadCartItems
        - handleStorageChange
        - handleQuantityChange
        - handleRemoveItem
        - handleCheckout
        - recalculateTotal

    - type: iife_to_useRef
      description: Converted IIFE debounce to useRef pattern

  code_metrics:
    before:
      lines: 187
      functions: 10
      complexity: 28

    after:
      lines: 192
      functions: 10
      complexity: 24

    changes:
      lines: +5 (+2.7%)
      complexity: -4 (-14.3%, BETTER!)

  validation:
    syntax: PASSED
    typescript: PASSED (0 errors)
    eslint: PASSED (0 errors, 1 warning)
    prettier: PASSED (formatted)

  tests:
    unit_tests: 12/12 PASSED
    integration_tests: 3/3 PASSED
    coverage:
      before: 92%
      after: 93%
      delta: +1%

  improvements:
    - ✅ Better hook dependency management
    - ✅ useCallback prevents unnecessary re-renders
    - ✅ Cleaner event listener cleanup
    - ✅ Improved code readability
    - ✅ More testable (hooks can be tested independently)

  warnings:
    - ⚠️  ESLint: react-hooks/exhaustive-deps suggests adding
         'handleStorageChange' to dependency array (line 115)
         Note: This is intentional to avoid infinite loops

  manual_actions_required:
    - None (fully automated!)

  next_steps:
    - Review ESLint warning and add comment if intentional
    - Consider extracting cart logic into custom hook (useCart)
    - Run full E2E tests to verify checkout flow
    - Commit changes: git add . && git commit -m "Migrate ShoppingCart to hooks"
```

## Generated Codemod

The transformation above was generated by this codemod:

**File:** `.migration/codemods/ShoppingCart-class-to-hooks.ts`

```typescript
// Auto-generated codemod for ShoppingCart.jsx migration
// Based on: react-class-to-hooks template
// Generated: 2024-01-15T10:23:45Z

import type { API, FileInfo, Options } from 'jscodeshift';

export default function transformer(
  fileInfo: FileInfo,
  api: API,
  options: Options
) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  // ... transformation logic (see codemods/react-class-to-hooks.ts)

  return root.toSource({ quote: 'single' });
}

// Test cases
export const testCases = [
  {
    name: 'transforms state to useState',
    input: `
      this.state = { items: [] };
      this.setState({ items: newItems });
    `,
    expected: `
      const [items, setItems] = useState([]);
      setItems(newItems);
    `
  },
  {
    name: 'transforms componentDidMount to useEffect',
    input: `
      componentDidMount() {
        this.loadData();
      }
    `,
    expected: `
      useEffect(() => {
        loadData();
      }, [loadData]);
    `
  },
  // ... more test cases
];
```

## Before/After Diff (Abbreviated)

```diff
--- a/src/components/ShoppingCart.jsx
+++ b/src/components/ShoppingCart.jsx
@@ -1,25 +1,13 @@
-import React, { Component } from 'react';
+import React, { useState, useEffect, useRef, useCallback } from 'react';
 import PropTypes from 'prop-types';

-class ShoppingCart extends Component {
-  static propTypes = {
-    userId: PropTypes.string.isRequired,
-    onCheckout: PropTypes.func,
-    currency: PropTypes.string
-  };
-
-  static defaultProps = {
-    currency: 'USD',
-    onCheckout: () => {}
-  };
-
-  constructor(props) {
-    super(props);
-    this.state = {
-      items: [],
-      loading: true,
-      error: null,
-      total: 0,
-      isCheckingOut: false
-    };
+function ShoppingCart(props) {
+  const { userId, onCheckout = () => {}, currency = 'USD' } = props;
+
+  const [items, setItems] = useState([]);
+  const [loading, setLoading] = useState(true);
+  const [error, setError] = useState(null);
+  const [total, setTotal] = useState(0);
+  const [isCheckingOut, setIsCheckingOut] = useState(false);

-    this.checkoutButtonRef = React.createRef();
-    this.abortController = null;
-  }
+  const checkoutButtonRef = useRef(null);
+  const abortControllerRef = useRef(null);
+  const updateCartTimeoutRef = useRef(null);

-  componentDidMount() {
-    this.loadCartItems();
-    document.addEventListener('storage', this.handleStorageChange);
-  }
+  useEffect(() => {
+    loadCartItems();
+    document.addEventListener('storage', handleStorageChange);
+  }, [loadCartItems, handleStorageChange]);

... (187 more lines of changes)
```

## Execution Log

```
[10:23:45] Starting migration...
[10:23:46] ✓ Pattern analysis complete (1.2s)
[10:23:49] ✓ Codemod generated (2.8s)
[10:23:50] ✓ Dry-run complete - preview generated (0.9s)
[10:23:52] ✓ Syntax validation passed (1.8s)
[10:23:53] ✓ TypeScript compilation passed (0.7s)
[10:23:54] ✓ ESLint passed (1 warning) (1.1s)
[10:23:55] ✓ Prettier formatting applied (0.4s)
[10:23:57] ✓ Unit tests passed (12/12) (1.9s)
[10:23:59] ✓ Integration tests passed (3/3) (2.3s)
[10:23:59] ✓ Coverage maintained: 92% → 93% (0.2s)

[10:24:00] Migration complete! ✅

Summary:
  Duration: 9 minutes 32 seconds
  Files: 1
  Transformations: 21
  Tests: 15/15 passed
  Coverage: +1%
  Status: SUCCESS
```

This demonstrates the **real value** of Migration Wizard: not just finding/replacing code, but **actually transforming it correctly** with comprehensive validation and testing.
