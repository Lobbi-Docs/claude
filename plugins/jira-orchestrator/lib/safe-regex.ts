/**
 * Safe Regex Utilities for ReDoS Prevention
 * 
 * Provides validation and execution wrappers to prevent Regular Expression
 * Denial of Service (ReDoS) attacks from user-provided regex patterns.
 * 
 * Security Features:
 * - Pattern complexity validation
 * - Detection of dangerous constructs (nested quantifiers, lookaheads)
 * - Pattern length limits
 * - Execution timeouts
 * - Input truncation for long strings
 * 
 * @module safe-regex
 * @version 1.0.0
 */

// Constants
const MAX_PATTERN_LENGTH = 200;
const MAX_INPUT_LENGTH = 10000;
const DEFAULT_TIMEOUT_MS = 100;

const DANGEROUS_PATTERNS = [
  /(+|*|{[0-9]+,})(+|*|{[0-9]+,})/,
  /(?[=!<]/,
  /([^)]*+[^)]*|[^)]*)*/,
  /(([^)]*+)[^)]*+)/,
  /([^)]*+[^)]*+)+/,
];

const SAFE_PATTERN_CHARACTERISTICS = {
  maxQuantifierNesting: 2,
  maxGroupNesting: 3,
  maxAlternationBranches: 5,
};

// Error Types
export class RegexValidationError extends Error {
  constructor(message, pattern, reason) {
    super(message);
    this.name = 'RegexValidationError';
    this.pattern = pattern;
    this.reason = reason;
  }
}

export class RegexTimeoutError extends Error {
  constructor(message, pattern, timeoutMs) {
    super(message);
    this.name = 'RegexTimeoutError';
    this.pattern = pattern;
    this.timeoutMs = timeoutMs;
  }
}

// Validation Functions
export function isRegexSafe(pattern) {
  if (pattern.length > MAX_PATTERN_LENGTH) {
    return {
      safe: false,
      reason: `Pattern too long (max ${MAX_PATTERN_LENGTH} chars)`,
    };
  }

  for (const dangerous of DANGEROUS_PATTERNS) {
    if (dangerous.test(pattern)) {
      return {
        safe: false,
        reason: 'Dangerous pattern detected (nested quantifiers or lookaheads)',
      };
    }
  }

  const quantifierNesting = getQuantifierNestingDepth(pattern);
  if (quantifierNesting > SAFE_PATTERN_CHARACTERISTICS.maxQuantifierNesting) {
    return {
      safe: false,
      reason: `Quantifier nesting depth ${quantifierNesting} exceeds max ${SAFE_PATTERN_CHARACTERISTICS.maxQuantifierNesting}`,
    };
  }

  const groupNesting = getGroupNestingDepth(pattern);
  if (groupNesting > SAFE_PATTERN_CHARACTERISTICS.maxGroupNesting) {
    return {
      safe: false,
      reason: `Group nesting depth ${groupNesting} exceeds max ${SAFE_PATTERN_CHARACTERISTICS.maxGroupNesting}`,
    };
  }

  const alternationBranches = countAlternationBranches(pattern);
  if (alternationBranches > SAFE_PATTERN_CHARACTERISTICS.maxAlternationBranches) {
    return {
      safe: false,
      reason: `Alternation branches ${alternationBranches} exceeds max ${SAFE_PATTERN_CHARACTERISTICS.maxAlternationBranches}`,
    };
  }

  try {
    new RegExp(pattern);
  } catch (error) {
    return {
      safe: false,
      reason: `Invalid regex syntax: ${error}`,
    };
  }

  return { safe: true };
}

export function validateRegexPattern(pattern) {
  const result = isRegexSafe(pattern);
  if (!result.safe) {
    throw new RegexValidationError(
      `Unsafe regex pattern: ${result.reason}`,
      pattern,
      result.reason
    );
  }
}

export function safeRegexTest(pattern, input, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  const safeInput = input.length > MAX_INPUT_LENGTH ? input.slice(0, MAX_INPUT_LENGTH) : input;
  const start = Date.now();
  
  try {
    const result = regex.test(safeInput);
    const elapsed = Date.now() - start;
    if (elapsed > timeoutMs) {
      console.warn(`Regex test exceeded timeout (${elapsed}ms > ${timeoutMs}ms): ${regex.source}`);
      return false;
    }
    return result;
  } catch (error) {
    console.error('Regex execution error:', error);
    return false;
  }
}

export function safeRegexMatch(pattern, input, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  const safeInput = input.length > MAX_INPUT_LENGTH ? input.slice(0, MAX_INPUT_LENGTH) : input;
  const start = Date.now();
  
  try {
    const result = safeInput.match(regex);
    const elapsed = Date.now() - start;
    if (elapsed > timeoutMs) {
      console.warn(`Regex match exceeded timeout (${elapsed}ms > ${timeoutMs}ms): ${regex.source}`);
      return null;
    }
    return result;
  } catch (error) {
    console.error('Regex match error:', error);
    return null;
  }
}

export function safeRegexExec(pattern, input, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  const safeInput = input.length > MAX_INPUT_LENGTH ? input.slice(0, MAX_INPUT_LENGTH) : input;
  const start = Date.now();
  
  try {
    const result = regex.exec(safeInput);
    const elapsed = Date.now() - start;
    if (elapsed > timeoutMs) {
      console.warn(`Regex exec exceeded timeout (${elapsed}ms > ${timeoutMs}ms): ${regex.source}`);
      return null;
    }
    return result;
  } catch (error) {
    console.error('Regex exec error:', error);
    return null;
  }
}

// Helper Functions
function getQuantifierNestingDepth(pattern) {
  let maxDepth = 0;
  let currentDepth = 0;
  
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    
    if (char === '(' && pattern[i - 1] !== '\') {
      // Start of group, reset depth
      currentDepth = 0;
    }
    
    if ((char === '+' || char === '*' || char === '?') && pattern[i - 1] === ')') {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    }
  }
  
  return maxDepth;
}

function getGroupNestingDepth(pattern) {
  let maxDepth = 0;
  let currentDepth = 0;
  
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    
    if (char === '(' && pattern[i - 1] !== '\') {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    } else if (char === ')' && pattern[i - 1] !== '\') {
      currentDepth--;
    }
  }
  
  return maxDepth;
}

function countAlternationBranches(pattern) {
  let branches = 1;
  let depth = 0;
  
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    
    if (char === '(' && pattern[i - 1] !== '\') {
      depth++;
    } else if (char === ')' && pattern[i - 1] !== '\') {
      depth--;
    } else if (char === '|' && pattern[i - 1] !== '\' && depth === 0) {
      branches++;
    }
  }
  
  return branches;
}

// Safe RegExp Wrapper Class
export class SafeRegExp {
  constructor(pattern, flags, timeoutMs = DEFAULT_TIMEOUT_MS) {
    validateRegexPattern(pattern);
    this.pattern = pattern;
    this.regex = new RegExp(pattern, flags);
    this.timeoutMs = timeoutMs;
  }

  test(input) {
    return safeRegexTest(this.regex, input, this.timeoutMs);
  }

  match(input) {
    return safeRegexMatch(this.regex, input, this.timeoutMs);
  }

  exec(input) {
    return safeRegexExec(this.regex, input, this.timeoutMs);
  }

  get source() {
    return this.regex.source;
  }

  get flags() {
    return this.regex.flags;
  }

  getPattern() {
    return this.pattern;
  }

  getTimeout() {
    return this.timeoutMs;
  }
}
