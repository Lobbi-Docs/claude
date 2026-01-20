"use strict";
/**
 * MCP Circuit Breaker Implementation
 *
 * Provides circuit breaker pattern for MCP services to prevent cascading failures.
 * Implements three states: CLOSED (normal), OPEN (failing), HALF_OPEN (testing recovery)
 *
 * Features:
 * - Per-MCP-server state tracking
 * - Configurable failure thresholds and timeouts
 * - Automatic recovery testing
 * - Event emission for observability
 * - Graceful degradation support
 *
 * @version 1.0.0
 * @author jira-orchestrator
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPCircuitBreaker = void 0;
exports.getCircuitBreaker = getCircuitBreaker;
exports.resetGlobalCircuitBreaker = resetGlobalCircuitBreaker;
const events_1 = require("events");
// ============================================
// CIRCUIT BREAKER IMPLEMENTATION
// ============================================
class MCPCircuitBreaker extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.stateChangeListener = null;
        this.isDisposed = false;
        // Set default options
        this.options = {
            failureThreshold: options?.failureThreshold ?? 5,
            failureWindowMs: options?.failureWindowMs ?? 60000,
            cooldownMs: options?.cooldownMs ?? 30000,
            halfOpenMaxAttempts: options?.halfOpenMaxAttempts ?? 3,
            onStateChange: options?.onStateChange,
        };
        this.circuits = new Map();
        this.cooldownTimers = new Map();
        // Set up event listener for state changes
        if (this.options.onStateChange) {
            this.stateChangeListener = (event) => {
                this.options.onStateChange(event.server, event.oldState, event.state);
            };
            this.on('state-change', this.stateChangeListener);
        }
    }
    /**
     * Initialize circuit for a server if it doesn't exist
     */
    initCircuit(server) {
        if (!this.circuits.has(server)) {
            this.circuits.set(server, {
                server,
                state: 'CLOSED',
                failureCount: 0,
                consecutiveSuccesses: 0,
                failureWindow: [],
            });
        }
    }
    /**
     * Check if a request should be allowed for the given server
     */
    canRequest(server) {
        if (this.isDisposed) {
            throw new Error('Circuit breaker has been disposed');
        }
        this.initCircuit(server);
        const circuit = this.circuits.get(server);
        switch (circuit.state) {
            case 'CLOSED':
                return true;
            case 'HALF_OPEN':
                // Allow limited requests to test recovery
                return circuit.consecutiveSuccesses < this.options.halfOpenMaxAttempts;
            case 'OPEN':
                // Check if cooldown period has elapsed
                if (circuit.openedAt && Date.now() - circuit.openedAt >= this.options.cooldownMs) {
                    this.transitionTo(server, 'HALF_OPEN');
                    return true;
                }
                return false;
            default:
                return false;
        }
    }
    /**
     * Record a successful operation
     */
    recordSuccess(server) {
        this.initCircuit(server);
        const circuit = this.circuits.get(server);
        circuit.lastSuccess = Date.now();
        circuit.consecutiveSuccesses++;
        if (circuit.state === 'HALF_OPEN') {
            // If we've had enough consecutive successes, close the circuit
            if (circuit.consecutiveSuccesses >= this.options.halfOpenMaxAttempts) {
                this.transitionTo(server, 'CLOSED');
                // Emit recovery event
                this.emit('circuit-closed', {
                    server,
                    state: 'CLOSED',
                    recoveryTime: circuit.openedAt ? Date.now() - circuit.openedAt : 0,
                });
            }
        }
        else if (circuit.state === 'CLOSED') {
            // Reset failure tracking on success
            circuit.failureCount = 0;
            circuit.failureWindow = [];
        }
    }
    /**
     * Record a failed operation
     */
    recordFailure(server, error) {
        this.initCircuit(server);
        const circuit = this.circuits.get(server);
        const now = Date.now();
        circuit.lastFailure = now;
        circuit.consecutiveSuccesses = 0;
        // Add failure to window
        circuit.failureWindow.push(now);
        // Clean up old failures outside the window
        circuit.failureWindow = circuit.failureWindow.filter(timestamp => now - timestamp < this.options.failureWindowMs);
        // Update failure count based on window
        circuit.failureCount = circuit.failureWindow.length;
        if (circuit.state === 'HALF_OPEN') {
            // Any failure in HALF_OPEN state reopens the circuit
            this.transitionTo(server, 'OPEN');
            this.scheduleCooldown(server);
            this.emit('circuit-opened', {
                server,
                state: 'OPEN',
                reason: 'Failure during recovery testing',
                failureCount: circuit.failureCount,
                error,
            });
        }
        else if (circuit.state === 'CLOSED') {
            // Check if we've exceeded the failure threshold
            if (circuit.failureCount >= this.options.failureThreshold) {
                this.transitionTo(server, 'OPEN');
                this.scheduleCooldown(server);
                this.emit('circuit-opened', {
                    server,
                    state: 'OPEN',
                    reason: `${circuit.failureCount} failures in ${this.options.failureWindowMs}ms`,
                    failureCount: circuit.failureCount,
                    error,
                });
            }
        }
    }
    /**
     * Get current status for a specific server
     */
    getStatus(server) {
        this.initCircuit(server);
        return { ...this.circuits.get(server) };
    }
    /**
     * Get all circuit statuses
     */
    getAllStatuses() {
        return Array.from(this.circuits.values()).map(circuit => ({ ...circuit }));
    }
    /**
     * Force reset a circuit to CLOSED state
     */
    reset(server) {
        this.initCircuit(server);
        const circuit = this.circuits.get(server);
        const oldState = circuit.state;
        circuit.state = 'CLOSED';
        circuit.failureCount = 0;
        circuit.failureWindow = [];
        circuit.consecutiveSuccesses = 0;
        delete circuit.openedAt;
        // Clear any pending cooldown timer
        if (this.cooldownTimers.has(server)) {
            clearTimeout(this.cooldownTimers.get(server));
            this.cooldownTimers.delete(server);
        }
        if (oldState !== 'CLOSED') {
            this.emitStateChange(server, oldState, 'CLOSED');
        }
    }
    /**
     * Reset all circuits to CLOSED state
     */
    resetAll() {
        for (const server of this.circuits.keys()) {
            this.reset(server);
        }
    }
    /**
     * Execute an operation with circuit breaker protection
     */
    async execute(server, operation, fallback) {
        if (!this.canRequest(server)) {
            if (fallback) {
                return fallback();
            }
            throw new Error(`Circuit breaker is OPEN for server: ${server}`);
        }
        try {
            const result = await operation();
            this.recordSuccess(server);
            return result;
        }
        catch (error) {
            this.recordFailure(server, error);
            if (fallback) {
                return fallback();
            }
            throw error;
        }
    }
    /**
     * Transition circuit to a new state
     */
    transitionTo(server, newState) {
        const circuit = this.circuits.get(server);
        const oldState = circuit.state;
        if (oldState === newState) {
            return;
        }
        circuit.state = newState;
        if (newState === 'OPEN') {
            circuit.openedAt = Date.now();
        }
        else if (newState === 'CLOSED') {
            delete circuit.openedAt;
            circuit.failureCount = 0;
            circuit.failureWindow = [];
        }
        else if (newState === 'HALF_OPEN') {
            circuit.consecutiveSuccesses = 0;
        }
        this.emitStateChange(server, oldState, newState);
    }
    /**
     * Schedule a cooldown timer to transition from OPEN to HALF_OPEN
     */
    scheduleCooldown(server) {
        // Clear any existing timer
        if (this.cooldownTimers.has(server)) {
            clearTimeout(this.cooldownTimers.get(server));
        }
        const timer = setTimeout(() => {
            const circuit = this.circuits.get(server);
            if (circuit && circuit.state === 'OPEN') {
                this.transitionTo(server, 'HALF_OPEN');
                this.emit('circuit-half-open', {
                    server,
                    state: 'HALF_OPEN',
                });
            }
            this.cooldownTimers.delete(server);
        }, this.options.cooldownMs);
        this.cooldownTimers.set(server, timer);
    }
    /**
     * Emit state change event
     */
    emitStateChange(server, oldState, newState) {
        this.emit('state-change', {
            server,
            state: newState,
            oldState,
        });
    }
    /**
     * Clean up resources
     */
    dispose() {
        if (this.isDisposed) {
            return;
        }
        // Mark as disposed to prevent further operations
        this.isDisposed = true;
        // Clear all cooldown timers
        for (const timer of this.cooldownTimers.values()) {
            clearTimeout(timer);
        }
        this.cooldownTimers.clear();
        // Remove the state change listener explicitly if it exists
        if (this.stateChangeListener) {
            this.off('state-change', this.stateChangeListener);
            this.stateChangeListener = null;
        }
        // Clear all remaining event listeners
        this.removeAllListeners();
        // Clear circuit state
        this.circuits.clear();
    }
    /**
     * Alias for dispose() for consistency with other patterns
     */
    destroy() {
        this.dispose();
    }
}
exports.MCPCircuitBreaker = MCPCircuitBreaker;
// ============================================
// CONVENIENCE FUNCTIONS
// ============================================
/**
 * Singleton instance for global circuit breaker
 */
let globalCircuitBreaker = null;
/**
 * Get or create the global circuit breaker instance
 */
function getCircuitBreaker(options) {
    if (!globalCircuitBreaker) {
        globalCircuitBreaker = new MCPCircuitBreaker(options);
    }
    return globalCircuitBreaker;
}
/**
 * Reset the global circuit breaker instance
 */
function resetGlobalCircuitBreaker() {
    if (globalCircuitBreaker) {
        globalCircuitBreaker.dispose();
        globalCircuitBreaker = null;
    }
}
// ============================================
// EXPORTS
// ============================================
exports.default = MCPCircuitBreaker;
