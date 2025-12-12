/**
 * @claude-sdk/tools - DataFakerTool
 * Generate realistic fake data for testing purposes
 */

import { z } from 'zod';
import { wrapExecution, generateUUID } from '../../utils/index.js';
import { ValidationError } from '../../types/errors.js';
import type { ToolResult, ToolContext } from '../../types/index.js';

// ============================================================================
// Schemas
// ============================================================================

export const DataFakerSchema = z.object({
  type: z.enum([
    'name',
    'email',
    'phone',
    'address',
    'uuid',
    'number',
    'string',
    'date',
    'lorem',
    'boolean',
    'url',
    'username',
    'password',
    'creditCard',
    'ipAddress',
    'company',
  ]),
  count: z.number().min(1).max(1000).default(1),
  options: z
    .object({
      // String options
      length: z.number().min(1).max(1000).optional(),
      prefix: z.string().optional(),
      suffix: z.string().optional(),

      // Number options
      min: z.number().optional(),
      max: z.number().optional(),
      decimals: z.number().min(0).max(10).optional(),

      // Date options
      start: z.string().optional(),
      end: z.string().optional(),
      format: z.enum(['iso', 'timestamp', 'date', 'time']).optional(),

      // Lorem options
      paragraphs: z.number().min(1).max(100).optional(),
      sentences: z.number().min(1).max(50).optional(),
      words: z.number().min(1).max(500).optional(),

      // Locale
      locale: z.enum(['en', 'es', 'fr', 'de', 'ja', 'zh']).default('en'),

      // Seed for reproducibility
      seed: z.number().optional(),
    })
    .optional(),
});

// ============================================================================
// Types
// ============================================================================

export type DataFakerInput = z.infer<typeof DataFakerSchema>;

interface RandomGenerator {
  seed: number;
  next(): number;
}

// ============================================================================
// Data Templates
// ============================================================================

const FIRST_NAMES = {
  en: ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth'],
  es: ['José', 'María', 'Juan', 'Ana', 'Pedro', 'Carmen', 'Luis', 'Isabel', 'Carlos', 'Dolores'],
  fr: ['Jean', 'Marie', 'Pierre', 'Nathalie', 'Michel', 'Isabelle', 'Philippe', 'Sylvie', 'Alain', 'Catherine'],
  de: ['Hans', 'Anna', 'Peter', 'Maria', 'Wolfgang', 'Elisabeth', 'Klaus', 'Ursula', 'Jürgen', 'Monika'],
  ja: ['太郎', '花子', '健一', '由美', '修', '美咲', '誠', '愛', '拓也', '恵'],
  zh: ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军'],
};

const LAST_NAMES = {
  en: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'],
  es: ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín'],
  fr: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau'],
  de: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann'],
  ja: ['佐藤', '鈴木', '高橋', '田中', '渡辺', '伊藤', '山本', '中村', '小林', '加藤'],
  zh: ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '吴', '周'],
};

const STREETS = {
  en: ['Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Park Blvd', 'Washington St', 'Lake Rd', 'Hill Ave', 'River Dr', 'Forest Ln'],
  es: ['Calle Mayor', 'Avenida Principal', 'Paseo del Prado', 'Calle Real', 'Plaza Central', 'Camino Largo', 'Calle del Sol', 'Avenida del Mar', 'Paseo Marítimo', 'Calle Luna'],
  fr: ['Rue de la Paix', 'Avenue des Champs', 'Boulevard Voltaire', 'Rue Victor Hugo', 'Place de la République', 'Rue Nationale', 'Avenue de la Liberté', 'Rue du Commerce', 'Boulevard Pasteur', 'Rue Gambetta'],
  de: ['Hauptstraße', 'Bahnhofstraße', 'Gartenstraße', 'Schulstraße', 'Dorfstraße', 'Lindenstraße', 'Bergstraße', 'Waldweg', 'Parkstraße', 'Kirchstraße'],
  ja: ['中央通り', '駅前通り', '本町', '大通り', '銀座通り', '並木通り', '桜通り', '緑町', '新町', '栄町'],
  zh: ['中山路', '解放路', '人民路', '建设路', '和平路', '胜利路', '文化路', '友谊路', '团结路', '光明路'],
};

const CITIES = {
  en: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'],
  es: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Las Palmas', 'Bilbao'],
  fr: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille'],
  de: ['Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig'],
  ja: ['東京', '横浜', '大阪', '名古屋', '札幌', '神戸', '京都', '福岡', '川崎', '埼玉'],
  zh: ['北京', '上海', '广州', '深圳', '成都', '杭州', '重庆', '武汉', '西安', '苏州'],
};

const COMPANIES = {
  en: ['Tech Corp', 'Global Industries', 'Innovation Labs', 'Digital Solutions', 'Future Systems', 'Advanced Tech', 'Smart Solutions', 'Prime Services', 'Elite Group', 'Dynamic Corp'],
  es: ['Tecnología SA', 'Industrias Globales', 'Innovación Labs', 'Soluciones Digitales', 'Sistemas Futuros', 'Tech Avanzada', 'Soluciones Smart', 'Servicios Prime', 'Grupo Elite', 'Corporación Dinámica'],
  fr: ['Tech SARL', 'Industries Mondiales', 'Laboratoires Innovation', 'Solutions Numériques', 'Systèmes Futurs', 'Tech Avancée', 'Solutions Intelligentes', 'Services Premium', 'Groupe Elite', 'Corp Dynamique'],
  de: ['Tech GmbH', 'Global Industries', 'Innovation Labs', 'Digital Solutions', 'Zukunft Systeme', 'Fortgeschritten Tech', 'Smart Lösungen', 'Prime Services', 'Elite Gruppe', 'Dynamik Corp'],
  ja: ['テック株式会社', 'グローバル産業', 'イノベーションラボ', 'デジタルソリューション', '未来システム', '先進技術', 'スマートソリューション', 'プライムサービス', 'エリートグループ', 'ダイナミック'],
  zh: ['科技公司', '全球工业', '创新实验室', '数字解决方案', '未来系统', '先进科技', '智能解决方案', '优质服务', '精英集团', '动态公司'],
};

const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation',
  'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo', 'consequat',
];

// ============================================================================
// Seeded Random Generator
// ============================================================================

class SeededRandom implements RandomGenerator {
  seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
  }

  next(): number {
    // Linear congruential generator
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }
}

// ============================================================================
// DataFakerTool Implementation
// ============================================================================

export class DataFakerTool {
  /**
   * Generate fake data
   */
  private static generate(
    type: string,
    count: number,
    options: Record<string, unknown> = {}
  ): unknown[] {
    const locale = (options.locale as string) || 'en';
    const rng = new SeededRandom(options.seed as number | undefined);
    const results: unknown[] = [];

    for (let i = 0; i < count; i++) {
      let value: unknown;

      switch (type) {
        case 'name':
          value = this.generateName(locale, rng);
          break;
        case 'email':
          value = this.generateEmail(locale, rng, options);
          break;
        case 'phone':
          value = this.generatePhone(locale, rng);
          break;
        case 'address':
          value = this.generateAddress(locale, rng);
          break;
        case 'uuid':
          value = generateUUID();
          break;
        case 'number':
          value = this.generateNumber(rng, options);
          break;
        case 'string':
          value = this.generateString(rng, options);
          break;
        case 'date':
          value = this.generateDate(rng, options);
          break;
        case 'lorem':
          value = this.generateLorem(rng, options);
          break;
        case 'boolean':
          value = rng.next() > 0.5;
          break;
        case 'url':
          value = this.generateUrl(rng, options);
          break;
        case 'username':
          value = this.generateUsername(locale, rng, options);
          break;
        case 'password':
          value = this.generatePassword(rng, options);
          break;
        case 'creditCard':
          value = this.generateCreditCard(rng);
          break;
        case 'ipAddress':
          value = this.generateIpAddress(rng);
          break;
        case 'company':
          value = this.generateCompany(locale, rng);
          break;
        default:
          value = null;
      }

      results.push(value);
    }

    return results;
  }

  private static generateName(locale: string, rng: SeededRandom): string {
    const firstName = rng.choice(FIRST_NAMES[locale as keyof typeof FIRST_NAMES] || FIRST_NAMES.en);
    const lastName = rng.choice(LAST_NAMES[locale as keyof typeof LAST_NAMES] || LAST_NAMES.en);
    return `${firstName} ${lastName}`;
  }

  private static generateEmail(locale: string, rng: SeededRandom, options: Record<string, unknown>): string {
    const name = this.generateName(locale, rng);
    const username = name.toLowerCase().replace(/\s+/g, '.');
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com'];
    const domain = rng.choice(domains);

    const prefix = options.prefix ? `${options.prefix}.` : '';
    const suffix = options.suffix ? `.${options.suffix}` : '';

    return `${prefix}${username}${suffix}@${domain}`;
  }

  private static generatePhone(locale: string, rng: SeededRandom): string {
    const formats: Record<string, string> = {
      en: '+1-XXX-XXX-XXXX',
      es: '+34-XXX-XXX-XXX',
      fr: '+33-X-XX-XX-XX-XX',
      de: '+49-XXX-XXXXXXX',
      ja: '+81-XX-XXXX-XXXX',
      zh: '+86-XXX-XXXX-XXXX',
    };

    const format = formats[locale] || formats.en;
    return format.replace(/X/g, () => rng.nextInt(0, 9).toString());
  }

  private static generateAddress(locale: string, rng: SeededRandom): object {
    const street = rng.choice(STREETS[locale as keyof typeof STREETS] || STREETS.en);
    const city = rng.choice(CITIES[locale as keyof typeof CITIES] || CITIES.en);
    const number = rng.nextInt(1, 9999);

    return {
      street: `${number} ${street}`,
      city,
      zipCode: `${rng.nextInt(10000, 99999)}`,
      country: locale.toUpperCase(),
    };
  }

  private static generateNumber(rng: SeededRandom, options: Record<string, unknown>): number {
    const min = (options.min as number) || 0;
    const max = (options.max as number) || 100;
    const decimals = (options.decimals as number) || 0;

    const value = rng.next() * (max - min) + min;
    return decimals > 0 ? parseFloat(value.toFixed(decimals)) : Math.floor(value);
  }

  private static generateString(rng: SeededRandom, options: Record<string, unknown>): string {
    const length = (options.length as number) || 10;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars[rng.nextInt(0, chars.length - 1)];
    }

    const prefix = options.prefix ? `${options.prefix}` : '';
    const suffix = options.suffix ? `${options.suffix}` : '';

    return `${prefix}${result}${suffix}`;
  }

  private static generateDate(rng: SeededRandom, options: Record<string, unknown>): string | number {
    const start = options.start ? new Date(options.start as string).getTime() : Date.now() - 365 * 24 * 60 * 60 * 1000;
    const end = options.end ? new Date(options.end as string).getTime() : Date.now();

    const timestamp = rng.next() * (end - start) + start;
    const date = new Date(timestamp);

    const format = options.format || 'iso';
    switch (format) {
      case 'timestamp':
        return timestamp;
      case 'date':
        return date.toISOString().split('T')[0];
      case 'time':
        return date.toISOString().split('T')[1];
      case 'iso':
      default:
        return date.toISOString();
    }
  }

  private static generateLorem(rng: SeededRandom, options: Record<string, unknown>): string {
    const words = (options.words as number) || undefined;
    const sentences = (options.sentences as number) || undefined;
    const paragraphs = (options.paragraphs as number) || 1;

    const result: string[] = [];

    for (let p = 0; p < paragraphs; p++) {
      const sentenceCount = sentences || rng.nextInt(3, 8);
      const paragraph: string[] = [];

      for (let s = 0; s < sentenceCount; s++) {
        const wordCount = words || rng.nextInt(5, 15);
        const sentence: string[] = [];

        for (let w = 0; w < wordCount; w++) {
          sentence.push(rng.choice(LOREM_WORDS));
        }

        const text = sentence.join(' ');
        paragraph.push(text.charAt(0).toUpperCase() + text.slice(1) + '.');
      }

      result.push(paragraph.join(' '));
    }

    return result.join('\n\n');
  }

  private static generateUrl(rng: SeededRandom, options: Record<string, unknown>): string {
    const protocols = ['http', 'https'];
    const domains = ['example.com', 'test.org', 'demo.net', 'sample.io'];
    const paths = ['api', 'v1', 'users', 'posts', 'data', 'items'];

    const protocol = rng.choice(protocols);
    const domain = rng.choice(domains);
    const path = Array.from({ length: rng.nextInt(1, 3) }, () => rng.choice(paths)).join('/');

    const prefix = options.prefix ? `${options.prefix}/` : '';
    return `${protocol}://${domain}/${prefix}${path}`;
  }

  private static generateUsername(locale: string, rng: SeededRandom, options: Record<string, unknown>): string {
    const name = this.generateName(locale, rng);
    const base = name.toLowerCase().replace(/\s+/g, '_');
    const suffix = rng.nextInt(10, 999);

    const prefix = options.prefix ? `${options.prefix}_` : '';
    return `${prefix}${base}${suffix}`;
  }

  private static generatePassword(rng: SeededRandom, options: Record<string, unknown>): string {
    const length = (options.length as number) || 16;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars[rng.nextInt(0, chars.length - 1)];
    }

    return result;
  }

  private static generateCreditCard(rng: SeededRandom): string {
    const bins = ['4', '5', '6']; // Visa, Mastercard, Discover
    let card = rng.choice(bins);

    for (let i = 0; i < 15; i++) {
      card += rng.nextInt(0, 9);
    }

    return card.match(/.{1,4}/g)?.join('-') || card;
  }

  private static generateIpAddress(rng: SeededRandom): string {
    return `${rng.nextInt(1, 255)}.${rng.nextInt(0, 255)}.${rng.nextInt(0, 255)}.${rng.nextInt(1, 255)}`;
  }

  private static generateCompany(locale: string, rng: SeededRandom): string {
    return rng.choice(COMPANIES[locale as keyof typeof COMPANIES] || COMPANIES.en);
  }

  /**
   * Main execution method
   */
  static async execute(
    input: DataFakerInput,
    context?: ToolContext
  ): Promise<ToolResult<{ data: unknown[]; count: number }>> {
    return wrapExecution(
      'DataFakerTool',
      async (inp: DataFakerInput): Promise<{ data: unknown[]; count: number }> => {
        // Validate input
        const parsed = DataFakerSchema.safeParse(inp);
        if (!parsed.success) {
          throw ValidationError.fromZodError(parsed.error);
        }

        const { type, count, options } = parsed.data;
        const data = this.generate(type, count, options || {});

        return {
          data,
          count: data.length,
        };
      },
      input,
      context
    );
  }
}
