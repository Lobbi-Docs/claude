# Directory Manager Agent

## Agent Metadata
```yaml
name: directory-manager
type: specialist
model: sonnet
category: membership-domain
priority: high
keywords:
  - directory
  - member-directory
  - public-profile
  - search
  - privacy
  - export
  - categories
  - listing
capabilities:
  - directory_management
  - privacy_controls
  - member_search
  - category_filtering
  - export_functionality
```

## Description

The Directory Manager Agent specializes in managing public member directories with privacy-aware data access. This agent handles member profile visibility, directory search and filtering, categorization, export functionality, and ensures compliance with privacy preferences in the Lobbi multi-tenant platform.

## Core Responsibilities

1. **Public Member Directories**
   - Manage member profile visibility settings
   - Build searchable member directories
   - Display member contact information based on privacy
   - Handle directory layout and organization

2. **Privacy Controls**
   - Enforce member privacy preferences
   - Control field-level visibility
   - Manage public vs private profiles
   - Handle opt-in/opt-out for directory inclusion

3. **Search Functionality**
   - Full-text search across member profiles
   - Filter by categories, tags, and attributes
   - Location-based search
   - Advanced search with multiple criteria

4. **Directory Categories**
   - Organize members by business type, industry, interests
   - Manage category hierarchies
   - Tag members with multiple categories
   - Display category-based directories

## Prisma Schema for Directory

```typescript
// prisma/schema.prisma
model DirectoryProfile {
  id              String    @id @default(uuid())
  memberId        String    @unique @map("member_id")
  orgId           String    @map("org_id")
  isPublic        Boolean   @default(true) @map("is_public")
  displayName     String    @map("display_name")
  title           String?
  company         String?
  bio             String?
  location        String?
  website         String?
  phonePublic     Boolean   @default(false) @map("phone_public")
  emailPublic     Boolean   @default(true) @map("email_public")
  addressPublic   Boolean   @default(false) @map("address_public")
  socialLinks     Json?     @map("social_links")
  profileImage    String?   @map("profile_image")
  categories      String[]
  tags            String[]
  customFields    Json?     @map("custom_fields")
  searchableText  String?   @map("searchable_text") // Computed field for search
  featured        Boolean   @default(false)
  displayOrder    Int       @default(0) @map("display_order")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  member          Member    @relation(fields: [memberId], references: [id], onDelete: Cascade)
  organization    Organization @relation(fields: [orgId], references: [id])

  @@index([orgId, isPublic])
  @@index([orgId, featured])
  @@index([orgId, categories])
  @@map("directory_profiles")
}

model DirectoryCategory {
  id              String    @id @default(uuid())
  orgId           String    @map("org_id")
  name            String
  slug            String
  description     String?
  icon            String?
  parentId        String?   @map("parent_id")
  displayOrder    Int       @default(0) @map("display_order")
  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  organization    Organization @relation(fields: [orgId], references: [id])
  parent          DirectoryCategory? @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children        DirectoryCategory[] @relation("CategoryHierarchy")

  @@unique([orgId, slug])
  @@index([orgId, isActive])
  @@map("directory_categories")
}

model DirectoryExport {
  id              String    @id @default(uuid())
  orgId           String    @map("org_id")
  userId          String    @map("user_id")
  exportType      String    @map("export_type") // CSV, PDF, VCARD
  filters         Json?
  recordCount     Int       @default(0) @map("record_count")
  fileUrl         String?   @map("file_url")
  status          ExportStatus @default(PENDING)
  expiresAt       DateTime  @map("expires_at")
  createdAt       DateTime  @default(now()) @map("created_at")

  organization    Organization @relation(fields: [orgId], references: [id])

  @@index([orgId, userId])
  @@index([orgId, status])
  @@map("directory_exports")
}

enum ExportStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  EXPIRED
}
```

## Directory Repository with Privacy Filtering

```typescript
// repositories/directoryRepository.ts
import { PrismaClient, DirectoryProfile, Prisma } from '@prisma/client';

export interface DirectoryFilters {
  search?: string;
  categories?: string[];
  tags?: string[];
  location?: string;
  featured?: boolean;
}

export interface DirectoryMember {
  id: string;
  displayName: string;
  title?: string;
  company?: string;
  bio?: string;
  location?: string;
  website?: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  categories: string[];
  tags: string[];
  socialLinks?: any;
  customFields?: any;
}

export class DirectoryRepository {
  constructor(
    private prisma: PrismaClient,
    private orgId: string
  ) {}

  /**
   * Get all public directory profiles with filters
   */
  async getPublicProfiles(filters?: DirectoryFilters): Promise<DirectoryProfile[]> {
    const where: Prisma.DirectoryProfileWhereInput = {
      orgId: this.orgId,
      isPublic: true,
      member: {
        status: 'ACTIVE'
      }
    };

    if (filters?.search) {
      where.OR = [
        { displayName: { contains: filters.search, mode: 'insensitive' } },
        { company: { contains: filters.search, mode: 'insensitive' } },
        { bio: { contains: filters.search, mode: 'insensitive' } },
        { searchableText: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    if (filters?.categories && filters.categories.length > 0) {
      where.categories = {
        hasSome: filters.categories
      };
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags
      };
    }

    if (filters?.location) {
      where.location = {
        contains: filters.location,
        mode: 'insensitive'
      };
    }

    if (filters?.featured !== undefined) {
      where.featured = filters.featured;
    }

    return this.prisma.directoryProfile.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            email: true,
            phone: true,
            tier: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { featured: 'desc' },
        { displayOrder: 'asc' },
        { displayName: 'asc' }
      ]
    });
  }

  /**
   * Get directory member with privacy-aware data
   */
  async getPublicMember(memberId: string): Promise<DirectoryMember | null> {
    const profile = await this.prisma.directoryProfile.findFirst({
      where: {
        memberId,
        orgId: this.orgId,
        isPublic: true
      },
      include: {
        member: {
          select: {
            email: true,
            phone: true,
            status: true
          }
        }
      }
    });

    if (!profile || profile.member.status !== 'ACTIVE') {
      return null;
    }

    // Return only publicly visible fields
    return {
      id: profile.memberId,
      displayName: profile.displayName,
      title: profile.title || undefined,
      company: profile.company || undefined,
      bio: profile.bio || undefined,
      location: profile.location || undefined,
      website: profile.website || undefined,
      email: profile.emailPublic ? profile.member.email : undefined,
      phone: profile.phonePublic ? profile.member.phone || undefined : undefined,
      profileImage: profile.profileImage || undefined,
      categories: profile.categories,
      tags: profile.tags,
      socialLinks: profile.socialLinks,
      customFields: profile.customFields
    };
  }

  /**
   * Get or create directory profile for member
   */
  async getOrCreateProfile(memberId: string): Promise<DirectoryProfile> {
    const existing = await this.prisma.directoryProfile.findUnique({
      where: { memberId }
    });

    if (existing) {
      return existing;
    }

    // Get member details to create profile
    const member = await this.prisma.member.findFirst({
      where: {
        id: memberId,
        orgId: this.orgId
      }
    });

    if (!member) {
      throw new Error('Member not found');
    }

    return this.prisma.directoryProfile.create({
      data: {
        memberId,
        orgId: this.orgId,
        displayName: `${member.firstName} ${member.lastName}`,
        isPublic: true,
        emailPublic: true,
        phonePublic: false,
        addressPublic: false,
        categories: [],
        tags: []
      }
    });
  }

  /**
   * Update directory profile
   */
  async updateProfile(
    memberId: string,
    data: Partial<DirectoryProfile>
  ): Promise<DirectoryProfile> {
    // Verify member belongs to org
    const member = await this.prisma.member.findFirst({
      where: {
        id: memberId,
        orgId: this.orgId
      }
    });

    if (!member) {
      throw new Error('Member not found or access denied');
    }

    // Update searchable text if relevant fields changed
    if (data.displayName || data.company || data.bio || data.title) {
      data.searchableText = [
        data.displayName,
        data.company,
        data.bio,
        data.title
      ].filter(Boolean).join(' ').toLowerCase();
    }

    return this.prisma.directoryProfile.upsert({
      where: { memberId },
      update: data,
      create: {
        memberId,
        orgId: this.orgId,
        displayName: data.displayName || 'Unknown',
        ...data
      }
    });
  }

  /**
   * Toggle profile visibility
   */
  async toggleVisibility(memberId: string, isPublic: boolean): Promise<DirectoryProfile> {
    return this.updateProfile(memberId, { isPublic });
  }

  /**
   * Add category to profile
   */
  async addCategory(memberId: string, category: string): Promise<DirectoryProfile> {
    const profile = await this.getOrCreateProfile(memberId);

    if (!profile.categories.includes(category)) {
      return this.prisma.directoryProfile.update({
        where: { memberId },
        data: {
          categories: {
            push: category
          }
        }
      });
    }

    return profile;
  }

  /**
   * Remove category from profile
   */
  async removeCategory(memberId: string, category: string): Promise<DirectoryProfile> {
    const profile = await this.getOrCreateProfile(memberId);
    const categories = profile.categories.filter(c => c !== category);

    return this.prisma.directoryProfile.update({
      where: { memberId },
      data: { categories }
    });
  }

  /**
   * Get featured members
   */
  async getFeaturedMembers(limit: number = 10): Promise<DirectoryProfile[]> {
    return this.prisma.directoryProfile.findMany({
      where: {
        orgId: this.orgId,
        isPublic: true,
        featured: true,
        member: {
          status: 'ACTIVE'
        }
      },
      include: {
        member: {
          select: {
            id: true,
            tier: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { displayOrder: 'asc' },
      take: limit
    });
  }

  /**
   * Search directory with autocomplete
   */
  async searchAutocomplete(query: string, limit: number = 10): Promise<Array<{
    id: string;
    displayName: string;
    company?: string;
    profileImage?: string;
  }>> {
    const profiles = await this.prisma.directoryProfile.findMany({
      where: {
        orgId: this.orgId,
        isPublic: true,
        OR: [
          { displayName: { contains: query, mode: 'insensitive' } },
          { company: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        memberId: true,
        displayName: true,
        company: true,
        profileImage: true
      },
      take: limit
    });

    return profiles.map(p => ({
      id: p.memberId,
      displayName: p.displayName,
      company: p.company || undefined,
      profileImage: p.profileImage || undefined
    }));
  }
}
```

## Directory Category Service

```typescript
// services/directoryCategoryService.ts
import { PrismaClient, DirectoryCategory } from '@prisma/client';

export interface CategoryTree extends DirectoryCategory {
  children: CategoryTree[];
  memberCount?: number;
}

export class DirectoryCategoryService {
  constructor(
    private prisma: PrismaClient,
    private orgId: string
  ) {}

  /**
   * Get all categories as a tree
   */
  async getCategoryTree(): Promise<CategoryTree[]> {
    const categories = await this.prisma.directoryCategory.findMany({
      where: {
        orgId: this.orgId,
        isActive: true
      },
      orderBy: { displayOrder: 'asc' }
    });

    // Build tree structure
    const categoryMap = new Map<string, CategoryTree>();
    const rootCategories: CategoryTree[] = [];

    // Initialize all categories
    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Build hierarchy
    categories.forEach(cat => {
      const node = categoryMap.get(cat.id)!;
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        rootCategories.push(node);
      }
    });

    // Add member counts
    for (const category of categoryMap.values()) {
      category.memberCount = await this.getMemberCount(category.slug);
    }

    return rootCategories;
  }

  /**
   * Create new category
   */
  async createCategory(data: {
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    parentId?: string;
  }): Promise<DirectoryCategory> {
    return this.prisma.directoryCategory.create({
      data: {
        orgId: this.orgId,
        name: data.name,
        slug: data.slug,
        description: data.description,
        icon: data.icon,
        parentId: data.parentId
      }
    });
  }

  /**
   * Update category
   */
  async updateCategory(
    categoryId: string,
    data: Partial<DirectoryCategory>
  ): Promise<DirectoryCategory> {
    // Verify category belongs to org
    const existing = await this.prisma.directoryCategory.findFirst({
      where: {
        id: categoryId,
        orgId: this.orgId
      }
    });

    if (!existing) {
      throw new Error('Category not found or access denied');
    }

    return this.prisma.directoryCategory.update({
      where: { id: categoryId },
      data
    });
  }

  /**
   * Delete category
   */
  async deleteCategory(categoryId: string): Promise<void> {
    const existing = await this.prisma.directoryCategory.findFirst({
      where: {
        id: categoryId,
        orgId: this.orgId
      }
    });

    if (!existing) {
      throw new Error('Category not found or access denied');
    }

    await this.prisma.directoryCategory.delete({
      where: { id: categoryId }
    });
  }

  /**
   * Get member count for category
   */
  async getMemberCount(categorySlug: string): Promise<number> {
    return this.prisma.directoryProfile.count({
      where: {
        orgId: this.orgId,
        isPublic: true,
        categories: {
          has: categorySlug
        },
        member: {
          status: 'ACTIVE'
        }
      }
    });
  }

  /**
   * Get members by category
   */
  async getMembersByCategory(categorySlug: string): Promise<DirectoryProfile[]> {
    return this.prisma.directoryProfile.findMany({
      where: {
        orgId: this.orgId,
        isPublic: true,
        categories: {
          has: categorySlug
        },
        member: {
          status: 'ACTIVE'
        }
      },
      include: {
        member: {
          select: {
            email: true,
            phone: true
          }
        }
      },
      orderBy: { displayName: 'asc' }
    });
  }
}
```

## Directory Export Service

```typescript
// services/directoryExportService.ts
import { PrismaClient, DirectoryExport, ExportStatus } from '@prisma/client';
import { DirectoryRepository } from '../repositories/directoryRepository';
import { createObjectCsvStringifier } from 'csv-writer';
import { addDays } from 'date-fns';

export class DirectoryExportService {
  constructor(
    private prisma: PrismaClient,
    private orgId: string
  ) {}

  /**
   * Request directory export
   */
  async requestExport(
    userId: string,
    exportType: 'CSV' | 'PDF' | 'VCARD',
    filters?: any
  ): Promise<DirectoryExport> {
    const exportRecord = await this.prisma.directoryExport.create({
      data: {
        orgId: this.orgId,
        userId,
        exportType,
        filters,
        status: ExportStatus.PENDING,
        expiresAt: addDays(new Date(), 7) // Expires in 7 days
      }
    });

    // Process export asynchronously
    this.processExport(exportRecord.id).catch(error => {
      console.error('Export processing failed:', error);
    });

    return exportRecord;
  }

  /**
   * Process export (run in background)
   */
  private async processExport(exportId: string): Promise<void> {
    try {
      // Update status to processing
      await this.prisma.directoryExport.update({
        where: { id: exportId },
        data: { status: ExportStatus.PROCESSING }
      });

      const exportRecord = await this.prisma.directoryExport.findUnique({
        where: { id: exportId }
      });

      if (!exportRecord) {
        throw new Error('Export record not found');
      }

      // Get directory data
      const directoryRepo = new DirectoryRepository(this.prisma, this.orgId);
      const profiles = await directoryRepo.getPublicProfiles(exportRecord.filters);

      let fileUrl: string;

      // Generate export based on type
      switch (exportRecord.exportType) {
        case 'CSV':
          fileUrl = await this.generateCSV(profiles);
          break;
        case 'PDF':
          fileUrl = await this.generatePDF(profiles);
          break;
        case 'VCARD':
          fileUrl = await this.generateVCard(profiles);
          break;
        default:
          throw new Error('Unsupported export type');
      }

      // Update export record
      await this.prisma.directoryExport.update({
        where: { id: exportId },
        data: {
          status: ExportStatus.COMPLETED,
          fileUrl,
          recordCount: profiles.length
        }
      });
    } catch (error) {
      await this.prisma.directoryExport.update({
        where: { id: exportId },
        data: { status: ExportStatus.FAILED }
      });
      throw error;
    }
  }

  /**
   * Generate CSV export
   */
  private async generateCSV(profiles: any[]): Promise<string> {
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'displayName', title: 'Name' },
        { id: 'title', title: 'Title' },
        { id: 'company', title: 'Company' },
        { id: 'email', title: 'Email' },
        { id: 'phone', title: 'Phone' },
        { id: 'location', title: 'Location' },
        { id: 'website', title: 'Website' },
        { id: 'categories', title: 'Categories' }
      ]
    });

    const records = profiles.map(p => ({
      displayName: p.displayName,
      title: p.title || '',
      company: p.company || '',
      email: p.emailPublic ? p.member.email : '',
      phone: p.phonePublic ? p.member.phone : '',
      location: p.location || '',
      website: p.website || '',
      categories: p.categories.join(', ')
    }));

    const csvContent = csvStringifier.getHeaderString() +
                      csvStringifier.stringifyRecords(records);

    // In production, upload to S3 or cloud storage
    // For now, return a mock URL
    const fileName = `directory-export-${Date.now()}.csv`;
    return `/exports/${fileName}`;
  }

  /**
   * Generate PDF export
   */
  private async generatePDF(profiles: any[]): Promise<string> {
    // Implement PDF generation using a library like PDFKit
    // For now, return a mock URL
    const fileName = `directory-export-${Date.now()}.pdf`;
    return `/exports/${fileName}`;
  }

  /**
   * Generate VCard export
   */
  private async generateVCard(profiles: any[]): Promise<string> {
    const vcards = profiles.map(p => {
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${p.displayName}`,
        p.title ? `TITLE:${p.title}` : '',
        p.company ? `ORG:${p.company}` : '',
        p.emailPublic && p.member.email ? `EMAIL:${p.member.email}` : '',
        p.phonePublic && p.member.phone ? `TEL:${p.member.phone}` : '',
        p.website ? `URL:${p.website}` : '',
        'END:VCARD'
      ];
      return lines.filter(Boolean).join('\n');
    }).join('\n\n');

    // In production, save to cloud storage
    const fileName = `directory-export-${Date.now()}.vcf`;
    return `/exports/${fileName}`;
  }

  /**
   * Get export status
   */
  async getExportStatus(exportId: string, userId: string): Promise<DirectoryExport | null> {
    return this.prisma.directoryExport.findFirst({
      where: {
        id: exportId,
        orgId: this.orgId,
        userId
      }
    });
  }

  /**
   * Get user's export history
   */
  async getUserExports(userId: string): Promise<DirectoryExport[]> {
    return this.prisma.directoryExport.findMany({
      where: {
        orgId: this.orgId,
        userId,
        status: { in: [ExportStatus.COMPLETED, ExportStatus.PROCESSING, ExportStatus.PENDING] }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
  }
}
```

## API Routes for Directory

```typescript
// routes/directory.ts
import { Router } from 'express';
import { tenantMiddleware } from '../middleware/tenantContext';
import { DirectoryRepository } from '../repositories/directoryRepository';
import { DirectoryCategoryService } from '../services/directoryCategoryService';
import { DirectoryExportService } from '../services/directoryExportService';
import { body, query, validationResult } from 'express-validator';

const router = Router();
router.use(tenantMiddleware);

/**
 * GET /api/directory - Get public member directory
 */
router.get('/', [
  query('search').optional().isString(),
  query('categories').optional(),
  query('tags').optional(),
  query('location').optional().isString(),
  query('featured').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const repo = new DirectoryRepository(prisma, req.tenant.orgId);

    const filters: any = {
      search: req.query.search as string,
      location: req.query.location as string,
      featured: req.query.featured === 'true'
    };

    if (req.query.categories) {
      filters.categories = Array.isArray(req.query.categories)
        ? req.query.categories
        : [req.query.categories];
    }

    if (req.query.tags) {
      filters.tags = Array.isArray(req.query.tags)
        ? req.query.tags
        : [req.query.tags];
    }

    const profiles = await repo.getPublicProfiles(filters);

    // Map to public data only
    const publicData = profiles.map(p => ({
      id: p.memberId,
      displayName: p.displayName,
      title: p.title,
      company: p.company,
      bio: p.bio,
      location: p.location,
      website: p.website,
      email: p.emailPublic ? p.member.email : null,
      phone: p.phonePublic ? p.member.phone : null,
      profileImage: p.profileImage,
      categories: p.categories,
      tags: p.tags,
      socialLinks: p.socialLinks,
      featured: p.featured
    }));

    res.json({
      success: true,
      data: publicData,
      count: publicData.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/directory/:memberId - Get public member profile
 */
router.get('/:memberId', async (req, res) => {
  try {
    const repo = new DirectoryRepository(prisma, req.tenant.orgId);
    const member = await repo.getPublicMember(req.params.memberId);

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found or profile is private'
      });
    }

    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/directory/profile/:memberId - Update directory profile
 */
router.put('/profile/:memberId', [
  body('displayName').optional().isString(),
  body('title').optional().isString(),
  body('company').optional().isString(),
  body('bio').optional().isString(),
  body('location').optional().isString(),
  body('website').optional().isURL(),
  body('isPublic').optional().isBoolean(),
  body('emailPublic').optional().isBoolean(),
  body('phonePublic').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // TODO: Add authorization check - only member or admin can update
    const repo = new DirectoryRepository(prisma, req.tenant.orgId);
    const profile = await repo.updateProfile(req.params.memberId, req.body);

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/directory/categories - Get category tree
 */
router.get('/meta/categories', async (req, res) => {
  try {
    const service = new DirectoryCategoryService(prisma, req.tenant.orgId);
    const categories = await service.getCategoryTree();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/directory/export - Request directory export
 */
router.post('/export', [
  body('exportType').isIn(['CSV', 'PDF', 'VCARD']),
  body('filters').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // TODO: Get userId from authentication
    const userId = req.user?.id || 'anonymous';

    const service = new DirectoryExportService(prisma, req.tenant.orgId);
    const exportRecord = await service.requestExport(
      userId,
      req.body.exportType,
      req.body.filters
    );

    res.json({
      success: true,
      data: exportRecord,
      message: 'Export requested. You will be notified when ready.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/directory/search/autocomplete - Autocomplete search
 */
router.get('/search/autocomplete', [
  query('q').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const repo = new DirectoryRepository(prisma, req.tenant.orgId);
    const results = await repo.searchAutocomplete(req.query.q as string);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

## Best Practices

1. **Respect privacy preferences** - Always check visibility flags before exposing data
2. **Cache search results** - Use Redis for frequently accessed directory listings
3. **Validate member ownership** - Only allow members to edit their own profiles
4. **Sanitize search inputs** - Prevent SQL injection and XSS attacks
5. **Rate limit exports** - Prevent abuse of export functionality
6. **Optimize full-text search** - Use PostgreSQL full-text search or Elasticsearch
7. **Compress profile images** - Optimize images for web display
8. **Expire old exports** - Clean up temporary export files regularly

## Collaboration Points

- Works with **membership-specialist** for member data access
- Coordinates with **member-engagement-agent** for activity-based sorting
- Supports **membership-analytics-agent** for directory usage metrics
- Integrates with **privacy-compliance-agent** for GDPR/privacy controls
- Collaborates with **search-service** for advanced search capabilities
- Works with **notification-service** for export completion alerts
