"use strict";
/**
 * Claude Code Plugin Validation Engine
 *
 * Comprehensive JSON Schema validation for plugin manifests, agents, skills,
 * commands, workflows, and registry indexes using Ajv.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginValidator = void 0;
exports.validatePlugin = validatePlugin;
exports.validateAgent = validateAgent;
exports.validateSkill = validateSkill;
exports.validateCommand = validateCommand;
exports.validateWorkflow = validateWorkflow;
exports.validateRegistry = validateRegistry;
exports.validateFile = validateFile;
exports.validateDirectory = validateDirectory;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const fs_1 = require("fs");
const path_1 = require("path");
const yaml_1 = require("yaml");
// Schema imports
const plugin_schema_json_1 = __importDefault(require("../schemas/plugin.schema.json"));
const agent_schema_json_1 = __importDefault(require("../schemas/agent.schema.json"));
const skill_schema_json_1 = __importDefault(require("../schemas/skill.schema.json"));
const command_schema_json_1 = __importDefault(require("../schemas/command.schema.json"));
const workflow_schema_json_1 = __importDefault(require("../schemas/workflow.schema.json"));
const registry_schema_json_1 = __importDefault(require("../schemas/registry.schema.json"));
/**
 * Claude Code Plugin Validator
 */
class PluginValidator {
    constructor(options = {}) {
        this.options = {
            verbose: false,
            strict: true,
            allowUnknownFormats: false,
            ...options,
        };
        // Initialize Ajv with configuration
        this.ajv = new ajv_1.default({
            allErrors: true,
            verbose: this.options.verbose,
            strict: this.options.strict,
            allowUnionTypes: true,
            allowMatchingProperties: true,
        });
        // Add format validators (email, uri, date, etc.)
        (0, ajv_formats_1.default)(this.ajv);
        // Add custom formats
        this.addCustomFormats();
        // Add custom keywords
        this.addCustomKeywords(this.options.customKeywords || []);
        // Compile validators
        this.validators = new Map();
        this.compileValidators();
    }
    /**
     * Add custom formats
     */
    addCustomFormats() {
        // Semver format
        this.ajv.addFormat('semver', {
            validate: (data) => /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/.test(data),
        });
        // Kebab-case format
        this.ajv.addFormat('kebab-case', {
            validate: (data) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(data),
        });
        // Memory size format (e.g., "512M", "2G")
        this.ajv.addFormat('memory-size', {
            validate: (data) => /^\d+[KMG]B?$/.test(data),
        });
    }
    /**
     * Add custom keywords
     */
    addCustomKeywords(keywords) {
        keywords.forEach((keyword) => {
            this.ajv.addKeyword({
                keyword: keyword.name,
                type: keyword.type,
                validate: keyword.validate,
                error: keyword.error,
            });
        });
    }
    /**
     * Compile schema validators
     */
    compileValidators() {
        // Add schemas to Ajv
        this.ajv.addSchema(plugin_schema_json_1.default, 'plugin');
        this.ajv.addSchema(agent_schema_json_1.default, 'agent');
        this.ajv.addSchema(skill_schema_json_1.default, 'skill');
        this.ajv.addSchema(command_schema_json_1.default, 'command');
        this.ajv.addSchema(workflow_schema_json_1.default, 'workflow');
        this.ajv.addSchema(registry_schema_json_1.default, 'registry');
        // Compile validators
        this.validators.set('plugin', this.ajv.compile(plugin_schema_json_1.default));
        this.validators.set('agent', this.ajv.compile(agent_schema_json_1.default));
        this.validators.set('skill', this.ajv.compile(skill_schema_json_1.default));
        this.validators.set('command', this.ajv.compile(command_schema_json_1.default));
        this.validators.set('workflow', this.ajv.compile(workflow_schema_json_1.default));
        this.validators.set('registry', this.ajv.compile(registry_schema_json_1.default));
    }
    /**
     * Validate plugin manifest
     */
    validatePlugin(data, file) {
        return this.validate('plugin', data, file);
    }
    /**
     * Validate agent definition
     */
    validateAgent(data, file) {
        return this.validate('agent', data, file);
    }
    /**
     * Validate skill definition
     */
    validateSkill(data, file) {
        return this.validate('skill', data, file);
    }
    /**
     * Validate command definition
     */
    validateCommand(data, file) {
        return this.validate('command', data, file);
    }
    /**
     * Validate workflow definition
     */
    validateWorkflow(data, file) {
        return this.validate('workflow', data, file);
    }
    /**
     * Validate registry index
     */
    validateRegistry(data, file) {
        return this.validate('registry', data, file);
    }
    /**
     * Generic validation method
     */
    validate(type, data, file) {
        const validator = this.validators.get(type);
        if (!validator) {
            throw new Error(`Unknown validation type: ${type}`);
        }
        const valid = validator(data);
        const errors = this.formatErrors(validator.errors || []);
        const warnings = this.generateWarnings(type, data);
        return {
            valid: valid,
            errors,
            warnings,
            file,
            type,
        };
    }
    /**
     * Format Ajv errors into readable format
     */
    formatErrors(ajvErrors) {
        return ajvErrors.map((error) => ({
            message: this.getErrorMessage(error),
            path: error.instancePath,
            keyword: error.keyword,
            params: error.params,
            instancePath: error.instancePath,
            schemaPath: error.schemaPath,
        }));
    }
    /**
     * Get human-readable error message
     */
    getErrorMessage(error) {
        const path = error.instancePath || 'root';
        const keyword = error.keyword;
        switch (keyword) {
            case 'required':
                return `${path}: Missing required property '${error.params.missingProperty}'`;
            case 'type':
                return `${path}: Expected type '${error.params.type}'`;
            case 'pattern':
                return `${path}: Value does not match pattern '${error.params.pattern}'`;
            case 'enum':
                return `${path}: Value must be one of: ${error.params.allowedValues.join(', ')}`;
            case 'minLength':
                return `${path}: String is too short (minimum: ${error.params.limit})`;
            case 'maxLength':
                return `${path}: String is too long (maximum: ${error.params.limit})`;
            case 'minimum':
                return `${path}: Value is too small (minimum: ${error.params.limit})`;
            case 'maximum':
                return `${path}: Value is too large (maximum: ${error.params.limit})`;
            case 'additionalProperties':
                return `${path}: Unexpected property '${error.params.additionalProperty}'`;
            default:
                return `${path}: ${error.message || 'Validation failed'}`;
        }
    }
    /**
     * Generate warnings based on best practices
     */
    generateWarnings(type, data) {
        const warnings = [];
        // Plugin-specific warnings
        if (type === 'plugin') {
            if (!data.displayName) {
                warnings.push({
                    message: 'Consider adding a displayName for better user experience',
                    severity: 'info',
                });
            }
            if (!data.keywords || data.keywords.length < 3) {
                warnings.push({
                    message: 'Add more keywords (at least 3) for better discoverability',
                    severity: 'warning',
                });
            }
            if (!data.license) {
                warnings.push({
                    message: 'Consider specifying a license',
                    severity: 'info',
                });
            }
        }
        // Agent-specific warnings
        if (type === 'agent') {
            if (!data.examples || data.examples.length === 0) {
                warnings.push({
                    message: 'Add usage examples to help users understand when to use this agent',
                    severity: 'warning',
                });
            }
            if (!data.systemPrompt || data.systemPrompt.length < 100) {
                warnings.push({
                    message: 'System prompt should be more detailed (at least 100 characters)',
                    severity: 'warning',
                });
            }
        }
        // Skill-specific warnings
        if (type === 'skill') {
            if (!data.triggers || data.triggers.length === 0) {
                warnings.push({
                    message: 'Add triggers to enable automatic skill activation',
                    severity: 'warning',
                });
            }
        }
        return warnings;
    }
    /**
     * Validate file by reading and parsing it
     */
    validateFile(filePath) {
        try {
            const content = (0, fs_1.readFileSync)(filePath, 'utf-8');
            const ext = (0, path_1.extname)(filePath).toLowerCase();
            let data;
            let type;
            // Parse based on file extension
            if (ext === '.json') {
                data = JSON.parse(content);
            }
            else if (ext === '.yaml' || ext === '.yml') {
                data = (0, yaml_1.parse)(content);
            }
            else if (ext === '.md') {
                // Parse markdown frontmatter
                data = this.parseMarkdownFrontmatter(content);
            }
            else {
                return {
                    valid: false,
                    errors: [{ message: `Unsupported file type: ${ext}` }],
                    warnings: [],
                    file: filePath,
                };
            }
            // Detect type from filename or data
            type = this.detectType(filePath, data);
            if (!type) {
                return {
                    valid: false,
                    errors: [{ message: 'Could not determine validation type' }],
                    warnings: [],
                    file: filePath,
                };
            }
            const result = this.validate(type, data, filePath);
            return result;
        }
        catch (error) {
            return {
                valid: false,
                errors: [{ message: `Failed to parse file: ${error.message}` }],
                warnings: [],
                file: filePath,
            };
        }
    }
    /**
     * Parse markdown frontmatter (YAML between --- markers)
     */
    parseMarkdownFrontmatter(content) {
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (frontmatterMatch) {
            return (0, yaml_1.parse)(frontmatterMatch[1]);
        }
        return {};
    }
    /**
     * Detect validation type from filename or data
     */
    detectType(filePath, data) {
        const filename = (0, path_1.basename)(filePath).toLowerCase();
        // Check filename patterns
        if (filename === 'plugin.json')
            return 'plugin';
        if (filename === 'manifest.json')
            return 'plugin';
        if (filename.includes('.agent.'))
            return 'agent';
        if (filename.includes('.skill.'))
            return 'skill';
        if (filename.includes('.command.'))
            return 'command';
        if (filename.includes('.workflow.'))
            return 'workflow';
        if (filename.includes('.index.json'))
            return 'registry';
        if (filename === 'skill.md')
            return 'skill';
        // Check data for type hints
        if (data.$schema) {
            if (data.$schema.includes('plugin'))
                return 'plugin';
            if (data.$schema.includes('agent'))
                return 'agent';
            if (data.$schema.includes('skill'))
                return 'skill';
            if (data.$schema.includes('command'))
                return 'command';
            if (data.$schema.includes('workflow'))
                return 'workflow';
            if (data.$schema.includes('registry'))
                return 'registry';
        }
        // Check data structure
        if (data.type && data.items && data.categories)
            return 'registry';
        if (data.steps && data.type)
            return 'workflow';
        if (data.model && data.when_to_use)
            return 'agent';
        if (data.triggers && data.capabilities)
            return 'skill';
        if (data.argumentHint || data.allowedTools)
            return 'command';
        return undefined;
    }
    /**
     * Validate all files in a directory
     */
    validateDirectory(dirPath, options = {}) {
        const { recursive = true, pattern = /\.(json|yaml|yml|md)$/ } = options;
        const results = [];
        const processDirectory = (dir) => {
            const entries = (0, fs_1.readdirSync)(dir);
            for (const entry of entries) {
                const fullPath = (0, path_1.join)(dir, entry);
                const stat = (0, fs_1.statSync)(fullPath);
                if (stat.isDirectory() && recursive) {
                    processDirectory(fullPath);
                }
                else if (stat.isFile() && pattern.test(entry)) {
                    const result = this.validateFile(fullPath);
                    results.push(result);
                }
            }
        };
        processDirectory(dirPath);
        // Calculate summary
        const validFiles = results.filter((r) => r.valid).length;
        const invalidFiles = results.length - validFiles;
        const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
        const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
        return {
            totalFiles: results.length,
            validFiles,
            invalidFiles,
            results,
            summary: {
                errors: totalErrors,
                warnings: totalWarnings,
            },
        };
    }
    /**
     * Format validation result for console output
     */
    formatResult(result) {
        const lines = [];
        if (result.file) {
            lines.push(`File: ${result.file}`);
            lines.push(`Type: ${result.type || 'unknown'}`);
        }
        lines.push(`Status: ${result.valid ? '✓ VALID' : '✗ INVALID'}`);
        if (result.errors.length > 0) {
            lines.push('\nErrors:');
            result.errors.forEach((error, index) => {
                lines.push(`  ${index + 1}. ${error.message}`);
                if (error.path) {
                    lines.push(`     Path: ${error.path}`);
                }
            });
        }
        if (result.warnings.length > 0) {
            lines.push('\nWarnings:');
            result.warnings.forEach((warning, index) => {
                const icon = warning.severity === 'warning' ? '⚠' : 'ℹ';
                lines.push(`  ${icon} ${index + 1}. ${warning.message}`);
            });
        }
        return lines.join('\n');
    }
    /**
     * Format batch validation result for console output
     */
    formatBatchResult(result) {
        const lines = [];
        lines.push('Validation Summary');
        lines.push('='.repeat(50));
        lines.push(`Total Files: ${result.totalFiles}`);
        lines.push(`Valid: ${result.validFiles}`);
        lines.push(`Invalid: ${result.invalidFiles}`);
        lines.push(`Total Errors: ${result.summary.errors}`);
        lines.push(`Total Warnings: ${result.summary.warnings}`);
        lines.push('');
        if (result.invalidFiles > 0) {
            lines.push('Failed Files:');
            result.results
                .filter((r) => !r.valid)
                .forEach((r) => {
                lines.push(`\n${r.file}:`);
                r.errors.forEach((error) => {
                    lines.push(`  ✗ ${error.message}`);
                });
            });
        }
        return lines.join('\n');
    }
}
exports.PluginValidator = PluginValidator;
/**
 * Convenience functions for direct usage
 */
function validatePlugin(data, file) {
    const validator = new PluginValidator();
    return validator.validatePlugin(data, file);
}
function validateAgent(data, file) {
    const validator = new PluginValidator();
    return validator.validateAgent(data, file);
}
function validateSkill(data, file) {
    const validator = new PluginValidator();
    return validator.validateSkill(data, file);
}
function validateCommand(data, file) {
    const validator = new PluginValidator();
    return validator.validateCommand(data, file);
}
function validateWorkflow(data, file) {
    const validator = new PluginValidator();
    return validator.validateWorkflow(data, file);
}
function validateRegistry(data, file) {
    const validator = new PluginValidator();
    return validator.validateRegistry(data, file);
}
function validateFile(filePath) {
    const validator = new PluginValidator();
    return validator.validateFile(filePath);
}
function validateDirectory(dirPath, options) {
    const validator = new PluginValidator();
    return validator.validateDirectory(dirPath, options);
}
// Export validator class as default
exports.default = PluginValidator;
