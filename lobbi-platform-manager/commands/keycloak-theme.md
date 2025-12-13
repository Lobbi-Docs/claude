---
description: Generate and deploy tenant-specific Keycloak themes
argument-hint: "[--org-id ORG] [--primary-color COLOR] [--logo-url URL]"
allowed-tools: ["Bash", "Read", "Write", "Edit", "Glob"]
---

Generate and deploy tenant-specific Keycloak themes with custom branding (colors, logos, CSS) for multi-tenant organizations.

## Your Task

You are creating a custom Keycloak theme for a specific tenant organization. Generate FreeMarker templates, CSS files, and deploy them to the Keycloak themes directory.

## Arguments

- `--org-id` (required): Organization identifier (e.g., "org-alpha", "org-beta")
- `--primary-color` (optional): Primary brand color in hex format (default: "#3b82f6")
- `--logo-url` (optional): URL or path to organization logo (default: none)

## Steps to Execute

1. **Parse and Validate Arguments**
   - Ensure org-id is provided
   - Validate primary-color is valid hex color (e.g., "#RRGGBB")
   - Check if logo-url is accessible (if provided)

2. **Find Keycloak Themes Directory**
   - Check docker-compose.yml for Keycloak volumes
   - Default path: `./keycloak/themes/` (mounted in container)
   - If not found, create the directory structure

3. **Create Theme Directory Structure**
   ```
   keycloak/themes/{{org-id}}/
   ├── login/
   │   ├── theme.properties
   │   ├── resources/
   │   │   ├── css/
   │   │   │   └── styles.css
   │   │   └── img/
   │   │       └── logo.png (if provided)
   │   └── login.ftl
   └── account/
       └── theme.properties
   ```

4. **Generate theme.properties for Login Theme**
   ```properties
   parent=keycloak
   import=common/keycloak

   styles=css/styles.css

   # Theme metadata
   org_id={{org-id}}
   primary_color={{primary-color}}
   ```

5. **Generate Custom CSS (resources/css/styles.css)**
   ```css
   :root {
     --primary-color: {{primary-color}};
     --primary-hover: {{darken(primary-color, 10%)}};
     --primary-light: {{lighten(primary-color, 40%)}};
   }

   /* Login card styling */
   .login-pf-page {
     background-color: #f5f5f5;
   }

   .card-pf {
     border-top: 4px solid var(--primary-color);
   }

   /* Button styling */
   .btn-primary {
     background-color: var(--primary-color);
     border-color: var(--primary-color);
   }

   .btn-primary:hover {
     background-color: var(--primary-hover);
     border-color: var(--primary-hover);
   }

   /* Link styling */
   a {
     color: var(--primary-color);
   }

   a:hover {
     color: var(--primary-hover);
   }

   /* Logo styling */
   .kc-logo-text {
     background-image: url(../img/logo.png);
     background-size: contain;
     background-repeat: no-repeat;
   }
   ```

6. **Generate login.ftl Template**
   - Copy base template from keycloak theme
   - Add organization-specific customizations:
     ```html
     <#import "template.ftl" as layout>
     <@layout.registrationLayout displayInfo=social.displayInfo; section>
       <#if section = "title">
         ${msg("loginTitle", (realm.displayName!''))}
       <#elseif section = "header">
         <span class="kc-logo-text"></span>
       <#elseif section = "form">
         <!-- Standard Keycloak login form -->
         <div id="kc-form">
           <div id="kc-form-wrapper">
             <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
               <!-- Form fields here -->
             </form>
           </div>
         </div>
       </#if>
     </@layout.registrationLayout>
     ```

7. **Handle Logo File (if provided)**
   - If logo-url is a URL:
     - Download using curl
     - Save to `resources/img/logo.png`
   - If logo-url is a local path:
     - Copy file to `resources/img/logo.png`
   - Validate image format (PNG, JPG, SVG)

8. **Generate Account Theme Properties**
   ```properties
   parent=keycloak
   ```

9. **Update Keycloak Realm to Use Theme**
   - Get admin token
   - Update realm configuration:
     ```bash
     curl -X PUT "http://localhost:8080/admin/realms/${REALM}" \
       -H "Authorization: Bearer ${TOKEN}" \
       -H "Content-Type: application/json" \
       -d '{
         "loginTheme": "{{org-id}}",
         "accountTheme": "{{org-id}}"
       }'
     ```

10. **Restart Keycloak (if needed)**
    - Check if themes are hot-reloadable
    - If not, restart: `docker-compose restart keycloak`
    - Wait for Keycloak to be ready (health check)

11. **Verify Theme Deployment**
    - Check that theme directory exists
    - Verify all files are present
    - Test login page renders with custom theme
    - Confirm primary color is applied

## Usage Examples

### Basic theme with org-id only
```
/lobbi:keycloak-theme --org-id org-alpha
```

### Theme with custom primary color
```
/lobbi:keycloak-theme --org-id org-beta --primary-color "#10b981"
```

### Full theme with logo
```
/lobbi:keycloak-theme --org-id org-gamma --primary-color "#ef4444" --logo-url "https://example.com/logo.png"
```

### Theme with local logo file
```
/lobbi:keycloak-theme --org-id org-delta --logo-url "./assets/org-delta-logo.png"
```

## Expected Outputs

### Theme Directory Structure Created
```
✅ Theme Structure Created

Location: ./keycloak/themes/org-alpha/
Files Created:
  - login/theme.properties
  - login/resources/css/styles.css
  - login/resources/img/logo.png
  - login/login.ftl
  - account/theme.properties

Theme Configuration:
  Org ID: org-alpha
  Primary Color: #3b82f6
  Logo: Yes (logo.png)
```

### Keycloak Realm Updated
```
✅ Realm Configuration Updated

Realm: master
Login Theme: org-alpha
Account Theme: org-alpha
Status: Active
```

### Verification Report
```
✅ Theme Verification

Theme Files: All present ✓
CSS Validity: Valid ✓
FreeMarker Template: Valid ✓
Logo File: Present (256x128 PNG) ✓
Keycloak Status: Running ✓
Theme Active: Yes ✓

Test URL: http://localhost:8080/realms/master/protocol/openid-connect/auth?client_id=lobbi-web&redirect_uri=http://localhost:3000&response_type=code
```

## Success Criteria

- Theme directory structure created successfully
- All required files generated (theme.properties, styles.css, login.ftl)
- Primary color is correctly applied in CSS
- Logo is downloaded/copied (if provided)
- CSS uses valid syntax and color values
- Keycloak realm updated to use the new theme
- Keycloak restarted (if necessary)
- Login page loads with custom theme
- No errors in Keycloak logs
- Theme appears in Keycloak admin console theme list

## Notes

- Themes require Keycloak restart to be recognized (not hot-reloadable by default)
- Custom CSS should extend base theme, not replace entirely
- FreeMarker templates (.ftl) use Apache FreeMarker syntax
- Logo should be optimized for web (< 100KB recommended)
- Supported image formats: PNG, JPG, SVG
- Default parent theme is "keycloak"; can be changed to "base" for more customization
- For production, themes should be deployed via volume mount or container image
- Consider creating a theme backup before modifications
- Multiple organizations can have separate themes
- Themes are cached; clear browser cache to see changes
