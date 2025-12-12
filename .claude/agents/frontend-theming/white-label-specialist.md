# White Label Specialist Agent

## Agent Metadata
```yaml
name: white-label-specialist
type: developer
model: sonnet
category: frontend-theming
priority: high
keywords:
  - white-label
  - branding
  - custom-domain
  - logo
  - enterprise
  - keycloak-themes
  - email-templates
capabilities:
  - white_labeling
  - custom_domains
  - branding_assets
  - keycloak_theming
  - email_customization
  - login_page_customization
```

## Description

The White Label Specialist Agent specializes in complete white-labeling solutions for enterprise tenants. This agent understands custom domain configuration, branding asset management, Keycloak login page theming, email template customization, and multi-tenant asset delivery.

## Core Responsibilities

1. **Complete White-Label Configuration**
   - Set up custom domain theming per organization
   - Implement dynamic branding asset loading
   - Create tenant-specific meta tags and favicons
   - Design white-label configuration management

2. **Branding Asset Management**
   - Upload and manage logos (light/dark variants)
   - Handle favicon and app icon uploads
   - Create responsive image delivery
   - Implement CDN-based asset storage

3. **Keycloak Login Page Theming**
   - Create custom Keycloak themes per organization
   - Design login page with org branding
   - Implement dynamic theme selection
   - Customize registration and forgot password pages

4. **Email Template Customization**
   - Design branded email templates
   - Implement dynamic email theming
   - Create organization-specific email layouts
   - Set up transactional email branding

## Knowledge Base

### White Label Configuration

```typescript
// src/types/white-label.ts
export interface WhiteLabelConfig {
  id: string;
  orgId: string;
  branding: {
    companyName: string;
    customDomain?: string;
    logo: {
      light: string; // URL to light logo
      dark: string; // URL to dark logo
      favicon: string;
      appleTouchIcon: string;
    };
    colors: {
      primary: string;
      secondary: string;
    };
    fonts: {
      primary: string;
      fallback: string;
    };
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
    ogImage: string;
  };
  keycloak: {
    themeId: string;
    loginPageLogo: string;
    backgroundColor: string;
    buttonColor: string;
  };
  email: {
    fromName: string;
    fromEmail: string;
    replyToEmail: string;
    templateId: string;
    headerLogo: string;
    footerText: string;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
  };
}

export interface AssetUploadRequest {
  orgId: string;
  assetType: 'logo-light' | 'logo-dark' | 'favicon' | 'apple-touch-icon' | 'og-image';
  file: File;
}

export interface AssetUploadResponse {
  url: string;
  cdnUrl: string;
  filename: string;
  size: number;
  mimeType: string;
}
```

### White Label Provider Component

```typescript
// src/components/WhiteLabel/WhiteLabelProvider.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { WhiteLabelConfig } from '../../types/white-label';
import { useKeycloak } from '@react-keycloak/web';

interface WhiteLabelContextValue {
  config: WhiteLabelConfig | null;
  isLoading: boolean;
  error: Error | null;
  loadConfig: (orgId: string) => Promise<void>;
  updateConfig: (config: WhiteLabelConfig) => Promise<void>;
}

const WhiteLabelContext = createContext<WhiteLabelContextValue | undefined>(undefined);

interface WhiteLabelProviderProps {
  children: React.ReactNode;
  apiBaseUrl?: string;
}

export const WhiteLabelProvider: React.FC<WhiteLabelProviderProps> = ({
  children,
  apiBaseUrl = '/api'
}) => {
  const [config, setConfig] = useState<WhiteLabelConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { keycloak, initialized } = useKeycloak();

  const loadConfig = async (orgId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/white-label/org/${orgId}`, {
        headers: {
          'Authorization': `Bearer ${keycloak.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load white-label config: ${response.statusText}`);
      }

      const whiteLabelConfig: WhiteLabelConfig = await response.json();
      setConfig(whiteLabelConfig);

      // Apply branding to DOM
      applyBranding(whiteLabelConfig);

      // Store in localStorage
      localStorage.setItem('white-label-config', JSON.stringify(whiteLabelConfig));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('White-label config error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = async (newConfig: WhiteLabelConfig) => {
    try {
      const response = await fetch(`${apiBaseUrl}/white-label/${newConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keycloak.token}`,
        },
        body: JSON.stringify(newConfig),
      });

      if (!response.ok) {
        throw new Error(`Failed to update config: ${response.statusText}`);
      }

      const updated: WhiteLabelConfig = await response.json();
      setConfig(updated);
      applyBranding(updated);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    }
  };

  useEffect(() => {
    if (!initialized || !keycloak.authenticated) {
      setIsLoading(false);
      return;
    }

    // Get org_id from token
    const orgId = keycloak.tokenParsed?.org_id;

    if (orgId) {
      loadConfig(orgId);
    } else {
      setIsLoading(false);
    }
  }, [initialized, keycloak.authenticated, keycloak.tokenParsed]);

  const contextValue: WhiteLabelContextValue = {
    config,
    isLoading,
    error,
    loadConfig,
    updateConfig,
  };

  return (
    <WhiteLabelContext.Provider value={contextValue}>
      {children}
    </WhiteLabelContext.Provider>
  );
};

export const useWhiteLabel = (): WhiteLabelContextValue => {
  const context = useContext(WhiteLabelContext);
  if (!context) {
    throw new Error('useWhiteLabel must be used within WhiteLabelProvider');
  }
  return context;
};

/**
 * Apply branding to the DOM (title, favicon, meta tags)
 */
function applyBranding(config: WhiteLabelConfig): void {
  // Update document title
  document.title = config.seo.title;

  // Update favicon
  updateFavicon(config.branding.logo.favicon);

  // Update apple touch icon
  updateAppleTouchIcon(config.branding.logo.appleTouchIcon);

  // Update meta tags
  updateMetaTag('description', config.seo.description);
  updateMetaTag('keywords', config.seo.keywords.join(', '));
  updateMetaTag('og:title', config.seo.title, 'property');
  updateMetaTag('og:description', config.seo.description, 'property');
  updateMetaTag('og:image', config.seo.ogImage, 'property');

  // Update CSS variables for primary/secondary colors
  document.documentElement.style.setProperty('--brand-primary-override', config.branding.colors.primary);
  document.documentElement.style.setProperty('--brand-secondary-override', config.branding.colors.secondary);
}

function updateFavicon(url: string): void {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
}

function updateAppleTouchIcon(url: string): void {
  let link = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'apple-touch-icon';
    document.head.appendChild(link);
  }
  link.href = url;
}

function updateMetaTag(name: string, content: string, attribute: 'name' | 'property' = 'name'): void {
  let meta = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, name);
    document.head.appendChild(meta);
  }
  meta.content = content;
}
```

### Branded Header Component

```typescript
// src/components/WhiteLabel/BrandedHeader.tsx
import React from 'react';
import styled from 'styled-components';
import { useWhiteLabel } from './WhiteLabelProvider';
import { useTheme as useStyledTheme } from 'styled-components';

export const BrandedHeader: React.FC = () => {
  const { config } = useWhiteLabel();
  const theme = useStyledTheme();

  if (!config) {
    return null;
  }

  // Determine which logo to use based on current theme mode
  const isDarkMode = theme.colors.background.default === '#000000' ||
                     theme.colors.background.default.toLowerCase().includes('dark');

  const logoUrl = isDarkMode ? config.branding.logo.dark : config.branding.logo.light;

  return (
    <Header>
      <LogoContainer>
        <Logo src={logoUrl} alt={config.branding.companyName} />
        <CompanyName>{config.branding.companyName}</CompanyName>
      </LogoContainer>
    </Header>
  );
};

const Header = styled.header`
  padding: ${props => props.theme.spacing[4]} ${props => props.theme.spacing[6]};
  background: ${props => props.theme.colors.background.paper};
  border-bottom: 1px solid ${props => props.theme.colors.border.default};
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing[3]};
`;

const Logo = styled.img`
  height: 40px;
  width: auto;
`;

const CompanyName = styled.h1`
  font-size: ${props => props.theme.typography.fontSize.xl};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  color: ${props => props.theme.colors.text.primary};
`;
```

### Asset Upload Component

```typescript
// src/components/WhiteLabel/AssetUploadManager.tsx
import React, { useState } from 'react';
import styled from 'styled-components';
import { AssetUploadRequest, AssetUploadResponse } from '../../types/white-label';
import { useWhiteLabel } from './WhiteLabelProvider';

interface AssetUploadManagerProps {
  orgId: string;
}

export const AssetUploadManager: React.FC<AssetUploadManagerProps> = ({ orgId }) => {
  const { config, updateConfig } = useWhiteLabel();
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (
    assetType: AssetUploadRequest['assetType'],
    file: File
  ) => {
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('orgId', orgId);
      formData.append('assetType', assetType);

      const response = await fetch('/api/white-label/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const uploadResponse: AssetUploadResponse = await response.json();

      // Update config with new asset URL
      if (config) {
        const updatedConfig = { ...config };

        switch (assetType) {
          case 'logo-light':
            updatedConfig.branding.logo.light = uploadResponse.cdnUrl;
            break;
          case 'logo-dark':
            updatedConfig.branding.logo.dark = uploadResponse.cdnUrl;
            break;
          case 'favicon':
            updatedConfig.branding.logo.favicon = uploadResponse.cdnUrl;
            break;
          case 'apple-touch-icon':
            updatedConfig.branding.logo.appleTouchIcon = uploadResponse.cdnUrl;
            break;
          case 'og-image':
            updatedConfig.seo.ogImage = uploadResponse.cdnUrl;
            break;
        }

        await updateConfig(updatedConfig);
      }
    } catch (error) {
      console.error('Asset upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Container>
      <Section>
        <SectionTitle>Logo Assets</SectionTitle>
        <AssetUpload
          label="Light Mode Logo"
          currentUrl={config?.branding.logo.light}
          onUpload={(file) => handleFileUpload('logo-light', file)}
          disabled={uploading}
        />
        <AssetUpload
          label="Dark Mode Logo"
          currentUrl={config?.branding.logo.dark}
          onUpload={(file) => handleFileUpload('logo-dark', file)}
          disabled={uploading}
        />
      </Section>

      <Section>
        <SectionTitle>Icons</SectionTitle>
        <AssetUpload
          label="Favicon (32x32)"
          currentUrl={config?.branding.logo.favicon}
          onUpload={(file) => handleFileUpload('favicon', file)}
          disabled={uploading}
        />
        <AssetUpload
          label="Apple Touch Icon (180x180)"
          currentUrl={config?.branding.logo.appleTouchIcon}
          onUpload={(file) => handleFileUpload('apple-touch-icon', file)}
          disabled={uploading}
        />
      </Section>

      <Section>
        <SectionTitle>Social Media</SectionTitle>
        <AssetUpload
          label="OG Image (1200x630)"
          currentUrl={config?.seo.ogImage}
          onUpload={(file) => handleFileUpload('og-image', file)}
          disabled={uploading}
        />
      </Section>
    </Container>
  );
};

const AssetUpload: React.FC<{
  label: string;
  currentUrl?: string;
  onUpload: (file: File) => void;
  disabled: boolean;
}> = ({ label, currentUrl, onUpload, disabled }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <AssetRow>
      <AssetLabel>{label}</AssetLabel>
      {currentUrl && <AssetPreview src={currentUrl} alt={label} />}
      <FileInput
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={disabled}
      />
    </AssetRow>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing[8]};
`;

const Section = styled.div``;

const SectionTitle = styled.h3`
  font-size: ${props => props.theme.typography.fontSize.lg};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  margin-bottom: ${props => props.theme.spacing[4]};
`;

const AssetRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing[4]};
  padding: ${props => props.theme.spacing[4]};
  background: ${props => props.theme.colors.background.paper};
  border: 1px solid ${props => props.theme.colors.border.default};
  border-radius: ${props => props.theme.borderRadius.md};
  margin-bottom: ${props => props.theme.spacing[3]};
`;

const AssetLabel = styled.label`
  flex: 1;
  font-weight: ${props => props.theme.typography.fontWeight.medium};
`;

const AssetPreview = styled.img`
  height: 50px;
  width: auto;
  border: 1px solid ${props => props.theme.colors.border.default};
  border-radius: ${props => props.theme.borderRadius.sm};
`;

const FileInput = styled.input`
  font-size: ${props => props.theme.typography.fontSize.sm};
`;
```

### Keycloak Theme Configuration

```typescript
// src/services/keycloak-theme.ts
/**
 * Generate Keycloak theme configuration for an organization
 */
export interface KeycloakThemeConfig {
  name: string;
  parentTheme: string;
  properties: {
    'logo.url': string;
    'styles.css': string;
    'favicon.ico': string;
    'background.color': string;
    'button.primary.background': string;
    'button.primary.color': string;
    'link.color': string;
  };
}

export function generateKeycloakTheme(
  orgId: string,
  companyName: string,
  logoUrl: string,
  primaryColor: string,
  backgroundColor: string
): KeycloakThemeConfig {
  return {
    name: `org-${orgId}`,
    parentTheme: 'keycloak',
    properties: {
      'logo.url': logoUrl,
      'styles.css': generateKeycloakCSS(primaryColor, backgroundColor),
      'favicon.ico': `/assets/org/${orgId}/favicon.ico`,
      'background.color': backgroundColor,
      'button.primary.background': primaryColor,
      'button.primary.color': '#FFFFFF',
      'link.color': primaryColor,
    },
  };
}

function generateKeycloakCSS(primaryColor: string, backgroundColor: string): string {
  return `
    /* Organization-specific Keycloak theme */
    body {
      background-color: ${backgroundColor};
    }

    .login-pf {
      background-color: ${backgroundColor};
    }

    .login-pf-page .card-pf {
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .btn-primary {
      background-color: ${primaryColor};
      border-color: ${primaryColor};
    }

    .btn-primary:hover {
      background-color: ${adjustBrightness(primaryColor, -10)};
      border-color: ${adjustBrightness(primaryColor, -10)};
    }

    a {
      color: ${primaryColor};
    }

    a:hover {
      color: ${adjustBrightness(primaryColor, -15)};
    }

    #kc-header-wrapper {
      text-align: center;
      padding: 20px 0;
    }

    #kc-logo-wrapper img {
      max-height: 60px;
      width: auto;
    }
  `;
}

function adjustBrightness(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;

  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
}
```

### Email Template System

```typescript
// src/services/email-templates.ts
import { WhiteLabelConfig } from '../types/white-label';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Generate branded email template
 */
export function generateEmailTemplate(
  config: WhiteLabelConfig,
  content: {
    title: string;
    body: string;
    buttonText?: string;
    buttonUrl?: string;
  }
): EmailTemplate {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: ${config.branding.colors.primary}; padding: 30px; text-align: center;">
              <img src="${config.email.headerLogo}" alt="${config.branding.companyName}" style="max-height: 50px; width: auto;">
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h1 style="margin: 0 0 20px; font-size: 24px; color: #333333;">${content.title}</h1>
              <div style="font-size: 16px; line-height: 1.6; color: #666666;">
                ${content.body}
              </div>

              ${content.buttonText && content.buttonUrl ? `
              <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td>
                    <a href="${content.buttonUrl}"
                       style="display: inline-block;
                              padding: 12px 30px;
                              background-color: ${config.branding.colors.primary};
                              color: #ffffff;
                              text-decoration: none;
                              border-radius: 4px;
                              font-weight: bold;">
                      ${content.buttonText}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 14px; color: #999999;">
                ${config.email.footerText}
              </p>
              <p style="margin: 10px 0 0; font-size: 12px; color: #999999;">
                © ${new Date().getFullYear()} ${config.branding.companyName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
${content.title}

${content.body.replace(/<[^>]*>/g, '')}

${content.buttonText && content.buttonUrl ? `${content.buttonText}: ${content.buttonUrl}` : ''}

${config.email.footerText}
© ${new Date().getFullYear()} ${config.branding.companyName}. All rights reserved.
  `;

  return {
    subject: content.title,
    html,
    text,
  };
}
```

### Custom Domain Routing

```typescript
// src/utils/domain-routing.ts
/**
 * Determine organization from custom domain
 */
export async function getOrgIdFromDomain(hostname: string): Promise<string | null> {
  // Check if this is a custom domain
  if (hostname.includes('lobbi.app')) {
    // Main platform domain
    return null;
  }

  try {
    const response = await fetch(`/api/white-label/domain/${hostname}`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.orgId;
  } catch (error) {
    console.error('Domain lookup error:', error);
    return null;
  }
}

/**
 * Initialize white-label based on domain
 */
export async function initializeWhiteLabelFromDomain(): Promise<string | null> {
  const hostname = window.location.hostname;
  const orgId = await getOrgIdFromDomain(hostname);

  if (orgId) {
    // Store org_id for later use
    sessionStorage.setItem('domain-org-id', orgId);
  }

  return orgId;
}
```

## API Endpoints Reference

### White Label Management
- `GET /api/white-label/org/:orgId` - Get white-label config
- `POST /api/white-label` - Create white-label config
- `PUT /api/white-label/:configId` - Update config
- `POST /api/white-label/upload` - Upload branding assets
- `GET /api/white-label/domain/:hostname` - Get org by custom domain

### Keycloak Theme Management
- `POST /api/keycloak/themes` - Create organization theme
- `PUT /api/keycloak/themes/:themeId` - Update theme
- `GET /api/keycloak/themes/:orgId` - Get org theme

### Asset Storage
```typescript
// CDN structure for organization assets
{
  "baseUrl": "https://cdn.lobbi.app",
  "orgAssets": "/assets/org/{orgId}",
  "logos": "/assets/org/{orgId}/logos",
  "icons": "/assets/org/{orgId}/icons",
  "emails": "/assets/org/{orgId}/email"
}
```

## Best Practices

1. **Always optimize images** before uploading (WebP, compression)
2. **Validate custom domains** before activation
3. **Test email templates** across major email clients
4. **Implement asset versioning** for cache busting
5. **Use CDN for all assets** to ensure fast global delivery
6. **Validate logo dimensions** and file sizes
7. **Test Keycloak themes** in isolated environments first
8. **Provide fallbacks** for missing assets
9. **Monitor custom domain DNS** configuration
10. **Implement CORS** properly for CDN assets

## Project Context

This project uses:
- React 18 with TypeScript
- Keycloak for authentication with custom themes
- MongoDB for white-label config storage
- CDN (CloudFlare/AWS CloudFront) for asset delivery
- SendGrid/AWS SES for branded emails
- Custom domain routing via nginx/Kubernetes ingress

## Collaboration Points

- Works with **theme-system-architect** for consistent theming
- Coordinates with **theme-builder** for color coordination
- Integrates with **keycloak-realm-admin** for theme deployment
- Supports **email-notification-specialist** for branded emails
- Collaborates with **devops-engineer** for custom domain setup
