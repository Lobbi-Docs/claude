/**
 * @claude-sdk/tools - UuidGeneratorTool
 * UUID generation, validation, and parsing
 */

import { z } from 'zod';
import { randomBytes, createHash } from 'crypto';
import { wrapExecution } from '../../utils/index.js';
import type { ToolResult, ToolContext } from '../../types/index.js';

// ============================================================================
// Schema Definitions
// ============================================================================

const UuidOperationEnum = z.enum(['generate', 'validate', 'parse']);

const UuidVersionEnum = z.enum(['v4', 'v5']);

export const UuidGeneratorSchema = z.object({
  operation: UuidOperationEnum,

  // Generate options
  version: UuidVersionEnum.optional(),
  namespace: z.string().uuid().optional(), // For v5
  name: z.string().optional(), // For v5

  // Validate/Parse options
  uuid: z.string().optional(),
});

export type UuidGeneratorInput = z.infer<typeof UuidGeneratorSchema>;

export interface UuidGeneratorOutput {
  result: string | boolean | UuidComponents | null;
  operation: string;
  metadata?: {
    version?: string;
    variant?: string;
    namespace?: string;
  };
}

export interface UuidComponents {
  uuid: string;
  version: number;
  variant: string;
  timeLow: string;
  timeMid: string;
  timeHiAndVersion: string;
  clockSeqHiAndReserved: string;
  clockSeqLow: string;
  node: string;
}

// ============================================================================
// UuidGeneratorTool Implementation
// ============================================================================

export class UuidGeneratorTool {
  static readonly name = 'uuid_generator';
  static readonly description = 'Generate UUIDs (v4 random, v5 namespace-based), validate UUID format, and parse UUID components';
  static readonly schema = UuidGeneratorSchema;

  // Predefined namespaces (RFC 4122)
  static readonly NAMESPACE_DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  static readonly NAMESPACE_URL = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
  static readonly NAMESPACE_OID = '6ba7b812-9dad-11d1-80b4-00c04fd430c8';
  static readonly NAMESPACE_X500 = '6ba7b814-9dad-11d1-80b4-00c04fd430c8';

  static async execute(
    input: UuidGeneratorInput,
    context?: ToolContext
  ): Promise<ToolResult<UuidGeneratorOutput>> {
    return wrapExecution(this.name, async (input, _ctx) => {
      const { operation } = input;

      switch (operation) {
        case 'generate':
          return this.handleGenerate(input);
        case 'validate':
          return this.handleValidate(input);
        case 'parse':
          return this.handleParse(input);
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    }, input, context);
  }

  // ============================================================================
  // Operation Handlers
  // ============================================================================

  private static handleGenerate(input: UuidGeneratorInput): UuidGeneratorOutput {
    const version = input.version ?? 'v4';

    let uuid: string;
    const metadata: UuidGeneratorOutput['metadata'] = { version };

    switch (version) {
      case 'v4':
        uuid = this.generateV4();
        break;
      case 'v5':
        if (!input.namespace || !input.name) {
          throw new Error('UUID v5 requires namespace and name parameters');
        }
        uuid = this.generateV5(input.namespace, input.name);
        metadata.namespace = input.namespace;
        break;
      default:
        throw new Error(`Unsupported UUID version: ${version}`);
    }

    return {
      result: uuid,
      operation: 'generate',
      metadata,
    };
  }

  private static handleValidate(input: UuidGeneratorInput): UuidGeneratorOutput {
    if (!input.uuid) {
      throw new Error('Validate operation requires uuid parameter');
    }

    const isValid = this.validateUuid(input.uuid);

    let metadata: UuidGeneratorOutput['metadata'] | undefined;
    if (isValid) {
      const version = this.getVersion(input.uuid);
      const variant = this.getVariant(input.uuid);
      metadata = { version: String(version), variant };
    }

    return {
      result: isValid,
      operation: 'validate',
      metadata,
    };
  }

  private static handleParse(input: UuidGeneratorInput): UuidGeneratorOutput {
    if (!input.uuid) {
      throw new Error('Parse operation requires uuid parameter');
    }

    if (!this.validateUuid(input.uuid)) {
      throw new Error(`Invalid UUID format: ${input.uuid}`);
    }

    const components = this.parseUuid(input.uuid);

    return {
      result: components,
      operation: 'parse',
      metadata: {
        version: String(components.version),
        variant: components.variant,
      },
    };
  }

  // ============================================================================
  // UUID Generation Methods
  // ============================================================================

  private static generateV4(): string {
    // Generate 16 random bytes
    const bytes = randomBytes(16);

    // Set version (4) and variant (RFC 4122)
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

    // Format as UUID string
    return this.bytesToUuid(bytes);
  }

  private static generateV5(namespace: string, name: string): string {
    // Parse namespace UUID to bytes
    const namespaceBytes = this.uuidToBytes(namespace);

    // Create SHA-1 hash of namespace + name
    const hash = createHash('sha1');
    hash.update(Buffer.from(namespaceBytes));
    hash.update(name, 'utf8');
    const hashBytes = hash.digest();

    // Take first 16 bytes
    const bytes = Buffer.from(hashBytes.slice(0, 16));

    // Set version (5) and variant (RFC 4122)
    bytes[6] = (bytes[6] & 0x0f) | 0x50; // Version 5
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

    // Format as UUID string
    return this.bytesToUuid(bytes);
  }

  // ============================================================================
  // UUID Validation Methods
  // ============================================================================

  private static validateUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  private static getVersion(uuid: string): number {
    const versionHex = uuid.charAt(14);
    return parseInt(versionHex, 16);
  }

  private static getVariant(uuid: string): string {
    const variantHex = uuid.charAt(19);
    const variantBits = parseInt(variantHex, 16);

    if ((variantBits & 0x8) === 0) {
      return 'NCS'; // Reserved for NCS backward compatibility
    } else if ((variantBits & 0xc) === 0x8) {
      return 'RFC4122'; // RFC 4122 variant
    } else if ((variantBits & 0xe) === 0xc) {
      return 'Microsoft'; // Reserved for Microsoft backward compatibility
    } else {
      return 'Future'; // Reserved for future definition
    }
  }

  // ============================================================================
  // UUID Parsing Methods
  // ============================================================================

  private static parseUuid(uuid: string): UuidComponents {
    const parts = uuid.split('-');

    return {
      uuid,
      version: this.getVersion(uuid),
      variant: this.getVariant(uuid),
      timeLow: parts[0],
      timeMid: parts[1],
      timeHiAndVersion: parts[2],
      clockSeqHiAndReserved: parts[3].slice(0, 2),
      clockSeqLow: parts[3].slice(2),
      node: parts[4],
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private static bytesToUuid(bytes: Buffer): string {
    const hex = bytes.toString('hex');
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32),
    ].join('-');
  }

  private static uuidToBytes(uuid: string): Buffer {
    const hex = uuid.replace(/-/g, '');
    return Buffer.from(hex, 'hex');
  }
}
