# Theme Builder Agent

## Agent Metadata
```yaml
name: theme-builder
type: developer
model: sonnet
category: frontend-theming
priority: high
keywords:
  - theme
  - customization
  - color-palette
  - typography
  - theme-builder-ui
  - design-tokens
  - theme-editor
capabilities:
  - theme_creation
  - color_palette_generation
  - typography_selection
  - component_styling
  - theme_preview
```

## Description

The Theme Builder Agent specializes in creating and customizing organization themes through a visual theme builder interface. This agent understands color theory, typography systems, accessibility requirements, and provides real-time theme preview capabilities.

## Core Responsibilities

1. **Theme Creation and Customization**
   - Build visual theme builder UI with live preview
   - Create color palette generators and selectors
   - Implement typography selection and pairing
   - Design spacing and layout customization tools

2. **Color Palette Management**
   - Generate harmonious color palettes from base colors
   - Create accessible color combinations (WCAG compliance)
   - Implement color contrast checking
   - Design color token mapping (semantic colors)

3. **Typography System Configuration**
   - Select and pair font families
   - Configure font size scales
   - Set up font weight systems
   - Design line height and letter spacing

4. **Component Styling Customization**
   - Customize button styles and variants
   - Configure form input appearances
   - Design card and container styles
   - Set up component-specific tokens

## Knowledge Base

### Theme Builder UI Component

```typescript
// src/components/ThemeBuilder/ThemeBuilder.tsx
import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { ThemeConfig, ThemeTokens } from '../../theme/types';
import { ColorPaletteEditor } from './ColorPaletteEditor';
import { TypographyEditor } from './TypographyEditor';
import { SpacingEditor } from './SpacingEditor';
import { ComponentPreview } from './ComponentPreview';
import { defaultThemeTokens } from '../../theme/default-theme';

interface ThemeBuilderProps {
  orgId: string;
  existingTheme?: ThemeConfig;
  onSave: (theme: ThemeConfig) => Promise<void>;
  onCancel: () => void;
}

export const ThemeBuilder: React.FC<ThemeBuilderProps> = ({
  orgId,
  existingTheme,
  onSave,
  onCancel
}) => {
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'spacing' | 'preview'>('colors');
  const [themeTokens, setThemeTokens] = useState<ThemeTokens>(
    existingTheme?.tokens || defaultThemeTokens
  );
  const [themeName, setThemeName] = useState(existingTheme?.name || 'New Theme');
  const [isSaving, setIsSaving] = useState(false);

  const handleColorChange = useCallback((colorPath: string, value: string) => {
    setThemeTokens(prev => {
      const newTokens = { ...prev };
      const pathParts = colorPath.split('.');

      // Navigate to the correct nested property
      let current: any = newTokens.colors;
      for (let i = 0; i < pathParts.length - 1; i++) {
        current = current[pathParts[i]];
      }
      current[pathParts[pathParts.length - 1]] = value;

      return newTokens;
    });
  }, []);

  const handleTypographyChange = useCallback((key: string, value: any) => {
    setThemeTokens(prev => ({
      ...prev,
      typography: {
        ...prev.typography,
        [key]: value
      }
    }));
  }, []);

  const handleSpacingChange = useCallback((key: string, value: string) => {
    setThemeTokens(prev => ({
      ...prev,
      spacing: {
        ...prev.spacing,
        [key]: value
      }
    }));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const themeConfig: ThemeConfig = {
        id: existingTheme?.id || `theme_${Date.now()}`,
        orgId,
        name: themeName,
        version: existingTheme?.version || '1.0.0',
        tokens: themeTokens,
        metadata: {
          createdAt: existingTheme?.metadata.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: existingTheme?.metadata.createdBy || 'current-user',
          isDefault: existingTheme?.metadata.isDefault || false,
        },
      };

      await onSave(themeConfig);
    } catch (error) {
      console.error('Failed to save theme:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ThemeBuilderContainer>
      <Header>
        <Title>Theme Builder</Title>
        <ThemeNameInput
          type="text"
          value={themeName}
          onChange={(e) => setThemeName(e.target.value)}
          placeholder="Theme Name"
        />
      </Header>

      <TabBar>
        <Tab
          active={activeTab === 'colors'}
          onClick={() => setActiveTab('colors')}
        >
          Colors
        </Tab>
        <Tab
          active={activeTab === 'typography'}
          onClick={() => setActiveTab('typography')}
        >
          Typography
        </Tab>
        <Tab
          active={activeTab === 'spacing'}
          onClick={() => setActiveTab('spacing')}
        >
          Spacing
        </Tab>
        <Tab
          active={activeTab === 'preview'}
          onClick={() => setActiveTab('preview')}
        >
          Preview
        </Tab>
      </TabBar>

      <Content>
        <EditorPanel>
          {activeTab === 'colors' && (
            <ColorPaletteEditor
              colors={themeTokens.colors}
              onChange={handleColorChange}
            />
          )}
          {activeTab === 'typography' && (
            <TypographyEditor
              typography={themeTokens.typography}
              onChange={handleTypographyChange}
            />
          )}
          {activeTab === 'spacing' && (
            <SpacingEditor
              spacing={themeTokens.spacing}
              onChange={handleSpacingChange}
            />
          )}
          {activeTab === 'preview' && (
            <ComponentPreview theme={themeTokens} />
          )}
        </EditorPanel>

        <PreviewPanel>
          <PreviewTitle>Live Preview</PreviewTitle>
          <ComponentPreview theme={themeTokens} compact />
        </PreviewPanel>
      </Content>

      <Footer>
        <CancelButton onClick={onCancel}>Cancel</CancelButton>
        <SaveButton onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Theme'}
        </SaveButton>
      </Footer>
    </ThemeBuilderContainer>
  );
};

const ThemeBuilderContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: ${props => props.theme.colors.background.default};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${props => props.theme.spacing[6]};
  border-bottom: 1px solid ${props => props.theme.colors.border.default};
`;

const Title = styled.h1`
  font-size: ${props => props.theme.typography.fontSize['2xl']};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
`;

const ThemeNameInput = styled.input`
  font-size: ${props => props.theme.typography.fontSize.lg};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  padding: ${props => props.theme.spacing[2]} ${props => props.theme.spacing[4]};
  border: 1px solid ${props => props.theme.colors.border.default};
  border-radius: ${props => props.theme.borderRadius.md};
  max-width: 300px;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.brand.primary};
  }
`;

const TabBar = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing[2]};
  padding: 0 ${props => props.theme.spacing[6]};
  border-bottom: 1px solid ${props => props.theme.colors.border.default};
`;

const Tab = styled.button<{ active: boolean }>`
  padding: ${props => props.theme.spacing[4]} ${props => props.theme.spacing[6]};
  background: transparent;
  border: none;
  border-bottom: 2px solid ${props => props.active ? props.theme.colors.brand.primary : 'transparent'};
  color: ${props => props.active ? props.theme.colors.brand.primary : props.theme.colors.text.secondary};
  font-weight: ${props => props.active ? props.theme.typography.fontWeight.semibold : props.theme.typography.fontWeight.normal};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${props => props.theme.colors.brand.primary};
  }
`;

const Content = styled.div`
  display: grid;
  grid-template-columns: 1fr 400px;
  flex: 1;
  overflow: hidden;
`;

const EditorPanel = styled.div`
  padding: ${props => props.theme.spacing[6]};
  overflow-y: auto;
`;

const PreviewPanel = styled.div`
  padding: ${props => props.theme.spacing[6]};
  background: ${props => props.theme.colors.background.paper};
  border-left: 1px solid ${props => props.theme.colors.border.default};
  overflow-y: auto;
`;

const PreviewTitle = styled.h3`
  font-size: ${props => props.theme.typography.fontSize.lg};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  margin-bottom: ${props => props.theme.spacing[4]};
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${props => props.theme.spacing[4]};
  padding: ${props => props.theme.spacing[6]};
  border-top: 1px solid ${props => props.theme.colors.border.default};
`;

const CancelButton = styled.button`
  padding: ${props => props.theme.spacing[3]} ${props => props.theme.spacing[6]};
  background: transparent;
  border: 1px solid ${props => props.theme.colors.border.default};
  border-radius: ${props => props.theme.borderRadius.md};
  color: ${props => props.theme.colors.text.primary};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  cursor: pointer;

  &:hover {
    background: ${props => props.theme.colors.background.paper};
  }
`;

const SaveButton = styled.button`
  padding: ${props => props.theme.spacing[3]} ${props => props.theme.spacing[6]};
  background: ${props => props.theme.colors.brand.primary};
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  color: white;
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
```

### Color Palette Editor

```typescript
// src/components/ThemeBuilder/ColorPaletteEditor.tsx
import React from 'react';
import styled from 'styled-components';
import { ThemeTokens } from '../../theme/types';
import { generateColorShades, checkContrast } from '../../utils/color-utils';

interface ColorPaletteEditorProps {
  colors: ThemeTokens['colors'];
  onChange: (colorPath: string, value: string) => void;
}

export const ColorPaletteEditor: React.FC<ColorPaletteEditorProps> = ({
  colors,
  onChange
}) => {
  const handleBrandColorChange = (key: string, value: string) => {
    onChange(`brand.${key}`, value);
  };

  const handleGenerateShades = (baseColor: string) => {
    const shades = generateColorShades(baseColor);
    Object.entries(shades).forEach(([key, value]) => {
      onChange(`neutral.${key}`, value);
    });
  };

  return (
    <EditorContainer>
      <Section>
        <SectionTitle>Brand Colors</SectionTitle>
        <ColorGrid>
          <ColorInput
            label="Primary"
            value={colors.brand.primary}
            onChange={(value) => handleBrandColorChange('primary', value)}
          />
          <ColorInput
            label="Secondary"
            value={colors.brand.secondary}
            onChange={(value) => handleBrandColorChange('secondary', value)}
          />
          <ColorInput
            label="Accent"
            value={colors.brand.accent}
            onChange={(value) => handleBrandColorChange('accent', value)}
          />
        </ColorGrid>
      </Section>

      <Section>
        <SectionTitle>Semantic Colors</SectionTitle>
        <ColorGrid>
          <ColorInput
            label="Success"
            value={colors.semantic.success}
            onChange={(value) => onChange('semantic.success', value)}
          />
          <ColorInput
            label="Warning"
            value={colors.semantic.warning}
            onChange={(value) => onChange('semantic.warning', value)}
          />
          <ColorInput
            label="Error"
            value={colors.semantic.error}
            onChange={(value) => onChange('semantic.error', value)}
          />
          <ColorInput
            label="Info"
            value={colors.semantic.info}
            onChange={(value) => onChange('semantic.info', value)}
          />
        </ColorGrid>
      </Section>

      <Section>
        <SectionTitleRow>
          <SectionTitle>Neutral Palette</SectionTitle>
          <GenerateButton onClick={() => handleGenerateShades(colors.neutral[500])}>
            Generate from 500
          </GenerateButton>
        </SectionTitleRow>
        <NeutralGrid>
          {Object.entries(colors.neutral).map(([shade, color]) => (
            <ColorInput
              key={shade}
              label={shade}
              value={color}
              onChange={(value) => onChange(`neutral.${shade}`, value)}
            />
          ))}
        </NeutralGrid>
      </Section>

      <Section>
        <SectionTitle>Contrast Checker</SectionTitle>
        <ContrastChecker colors={colors} />
      </Section>
    </EditorContainer>
  );
};

const ColorInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => {
  return (
    <ColorInputContainer>
      <ColorLabel>{label}</ColorLabel>
      <ColorInputRow>
        <ColorSwatch color={value} />
        <ColorTextInput
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          pattern="^#[0-9A-Fa-f]{6}$"
        />
        <ColorPicker
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </ColorInputRow>
    </ColorInputContainer>
  );
};

const ContrastChecker: React.FC<{ colors: ThemeTokens['colors'] }> = ({ colors }) => {
  const primaryOnWhite = checkContrast(colors.brand.primary, '#FFFFFF');
  const primaryOnDark = checkContrast(colors.brand.primary, colors.neutral[900]);
  const textOnBackground = checkContrast(colors.text.primary, colors.background.default);

  return (
    <ContrastGrid>
      <ContrastItem>
        <ContrastLabel>Primary on White</ContrastLabel>
        <ContrastRatio pass={primaryOnWhite >= 4.5}>
          {primaryOnWhite.toFixed(2)}:1
        </ContrastRatio>
      </ContrastItem>
      <ContrastItem>
        <ContrastLabel>Primary on Dark</ContrastLabel>
        <ContrastRatio pass={primaryOnDark >= 4.5}>
          {primaryOnDark.toFixed(2)}:1
        </ContrastRatio>
      </ContrastItem>
      <ContrastItem>
        <ContrastLabel>Text on Background</ContrastLabel>
        <ContrastRatio pass={textOnBackground >= 4.5}>
          {textOnBackground.toFixed(2)}:1
        </ContrastRatio>
      </ContrastItem>
    </ContrastGrid>
  );
};

const EditorContainer = styled.div`
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

const SectionTitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${props => props.theme.spacing[4]};
`;

const GenerateButton = styled.button`
  padding: ${props => props.theme.spacing[2]} ${props => props.theme.spacing[4]};
  background: ${props => props.theme.colors.brand.primary};
  color: white;
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.fontSize.sm};
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
`;

const ColorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${props => props.theme.spacing[4]};
`;

const NeutralGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: ${props => props.theme.spacing[3]};
`;

const ColorInputContainer = styled.div``;

const ColorLabel = styled.label`
  display: block;
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  margin-bottom: ${props => props.theme.spacing[2]};
  color: ${props => props.theme.colors.text.secondary};
`;

const ColorInputRow = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing[2]};
  align-items: center;
`;

const ColorSwatch = styled.div<{ color: string }>`
  width: 40px;
  height: 40px;
  background-color: ${props => props.color};
  border: 1px solid ${props => props.theme.colors.border.default};
  border-radius: ${props => props.theme.borderRadius.md};
`;

const ColorTextInput = styled.input`
  flex: 1;
  padding: ${props => props.theme.spacing[2]} ${props => props.theme.spacing[3]};
  border: 1px solid ${props => props.theme.colors.border.default};
  border-radius: ${props => props.theme.borderRadius.md};
  font-family: ${props => props.theme.typography.fontFamily.mono};
  font-size: ${props => props.theme.typography.fontSize.sm};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.brand.primary};
  }
`;

const ColorPicker = styled.input`
  width: 40px;
  height: 40px;
  border: none;
  cursor: pointer;
`;

const ContrastGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${props => props.theme.spacing[4]};
`;

const ContrastItem = styled.div`
  padding: ${props => props.theme.spacing[4]};
  background: ${props => props.theme.colors.background.paper};
  border: 1px solid ${props => props.theme.colors.border.default};
  border-radius: ${props => props.theme.borderRadius.md};
`;

const ContrastLabel = styled.div`
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: ${props => props.theme.spacing[2]};
`;

const ContrastRatio = styled.div<{ pass: boolean }>`
  font-size: ${props => props.theme.typography.fontSize.xl};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
  color: ${props => props.pass ? props.theme.colors.semantic.success : props.theme.colors.semantic.error};
`;
```

### Color Utilities

```typescript
// src/utils/color-utils.ts

/**
 * Generates a neutral color palette from a base color
 */
export function generateColorShades(baseColor: string): Record<string, string> {
  // Convert hex to HSL
  const hsl = hexToHSL(baseColor);

  const shades: Record<string, string> = {
    50: hslToHex({ ...hsl, l: 98 }),
    100: hslToHex({ ...hsl, l: 95 }),
    200: hslToHex({ ...hsl, l: 88 }),
    300: hslToHex({ ...hsl, l: 77 }),
    400: hslToHex({ ...hsl, l: 62 }),
    500: baseColor,
    600: hslToHex({ ...hsl, l: 45 }),
    700: hslToHex({ ...hsl, l: 35 }),
    800: hslToHex({ ...hsl, l: 25 }),
    900: hslToHex({ ...hsl, l: 15 }),
  };

  return shades;
}

/**
 * Calculate contrast ratio between two colors (WCAG)
 */
export function checkContrast(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(hex: string): number {
  const rgb = hexToRGB(hex);
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRGB(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRGB(hex);
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break;
      case gNorm: h = ((bNorm - rNorm) / d + 2) / 6; break;
      case bNorm: h = ((rNorm - gNorm) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function hslToHex(hsl: { h: number; s: number; l: number }): string {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
```

### Theme API Service

```typescript
// src/services/theme-api.ts
import { ThemeConfig } from '../theme/types';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export class ThemeAPIService {
  /**
   * Fetch theme for an organization
   */
  static async getOrgTheme(orgId: string): Promise<ThemeConfig> {
    const response = await fetch(`${API_BASE_URL}/themes/org/${orgId}`, {
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch theme: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a new theme
   */
  static async createTheme(theme: ThemeConfig): Promise<ThemeConfig> {
    const response = await fetch(`${API_BASE_URL}/themes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
      body: JSON.stringify(theme),
    });

    if (!response.ok) {
      throw new Error(`Failed to create theme: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update existing theme
   */
  static async updateTheme(themeId: string, theme: ThemeConfig): Promise<ThemeConfig> {
    const response = await fetch(`${API_BASE_URL}/themes/${themeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
      body: JSON.stringify(theme),
    });

    if (!response.ok) {
      throw new Error(`Failed to update theme: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Delete theme
   */
  static async deleteTheme(themeId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/themes/${themeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete theme: ${response.statusText}`);
    }
  }

  /**
   * Get default theme
   */
  static async getDefaultTheme(): Promise<ThemeConfig> {
    const response = await fetch(`${API_BASE_URL}/themes/default`);

    if (!response.ok) {
      throw new Error(`Failed to fetch default theme: ${response.statusText}`);
    }

    return response.json();
  }

  private static getAuthToken(): string {
    // Get token from localStorage or Keycloak
    return localStorage.getItem('auth-token') || '';
  }
}
```

## API Endpoints Reference

### Theme Management
- `GET /api/themes/org/:orgId` - Get organization theme
- `POST /api/themes` - Create new theme
- `PUT /api/themes/:themeId` - Update theme
- `DELETE /api/themes/:themeId` - Delete theme
- `GET /api/themes/default` - Get default theme

### Theme Storage in MongoDB
```typescript
{
  _id: ObjectId,
  id: "theme_abc123",
  orgId: "org_xyz789",
  name: "Company Brand Theme",
  version: "1.0.0",
  tokens: { /* ThemeTokens */ },
  metadata: {
    createdAt: ISODate,
    updatedAt: ISODate,
    createdBy: "user_id",
    isDefault: false
  }
}
```

## Best Practices

1. **Always validate color formats** (hex, rgb, hsl) before saving
2. **Check WCAG contrast ratios** for all color combinations
3. **Provide real-time preview** for all theme changes
4. **Implement undo/redo** for theme editing
5. **Save drafts automatically** to prevent data loss
6. **Export themes as JSON** for backup and migration
7. **Generate accessible color palettes** with proper contrast
8. **Test themes with color-blind simulation** tools

## Project Context

This project uses:
- React 18 with TypeScript
- styled-components for styling
- Color utilities for palette generation
- MongoDB for theme storage
- Theme builder UI: `/src/components/ThemeBuilder/`

## Collaboration Points

- Works with **theme-system-architect** for theme architecture
- Coordinates with **white-label-specialist** for enterprise customization
- Supports **react-component-architect** for component previews
- Integrates with **mongodb-atlas-admin** for theme storage
