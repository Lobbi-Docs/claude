# Security Fortress

Complete security hardening with threat modeling, penetration testing, vulnerability assessment, and multi-framework compliance validation (OWASP, CWE, NIST).

## Purpose

Transform your application into a security fortress through comprehensive threat modeling, automated and manual penetration testing, vulnerability remediation, secure code review, and compliance validation against industry standards.

## Multi-Agent Coordination Strategy

Uses **hierarchical security assessment** pattern with specialized agents at each security layer, coordinated by a security orchestrator for comprehensive defense-in-depth analysis.

### Security Layer Architecture
\`\`\`
┌─────────────────────────────────────────────┐
│         Security Command Center              │
│         (security-orchestrator)              │
└────────────────┬────────────────────────────┘
                 │
    ┌────────────┴────────────┬────────────┐
    ▼                         ▼            ▼
Threat Layer          Attack Layer    Defense Layer
\`\`\`

## Execution Flow

### Phase 1: Threat Modeling (0-20 mins)
1. **threat-modeler** - Create threat model using STRIDE methodology
2. **attack-surface-mapper** - Map all attack surfaces and entry points
3. **asset-identifier** - Identify critical assets and data flows
4. **trust-boundary-analyzer** - Identify trust boundaries and crossings

### Phase 2: Static Analysis (20-40 mins)
5. **code-scanner-sast** - Static application security testing
6. **dependency-auditor** - Scan dependencies for known vulnerabilities
7. **secrets-detective** - Hunt for exposed credentials and API keys
8. **configuration-hardener** - Audit security configurations

### Phase 3: Dynamic Analysis (40-70 mins)
9. **penetration-tester-web** - OWASP Top 10 testing
10. **penetration-tester-api** - API security testing
11. **authentication-breaker** - Auth/authz bypass attempts
12. **injection-specialist** - SQL, NoSQL, command injection testing
13. **xss-hunter** - Cross-site scripting detection
14. **csrf-detector** - CSRF vulnerability testing

### Phase 4: Infrastructure Security (70-90 mins)
15. **network-security-analyst** - Network segmentation and firewall rules
16. **container-security-scanner** - Docker/K8s security assessment
17. **cloud-security-auditor** - Cloud infrastructure security (AWS/Azure/GCP)
18. **secrets-management-validator** - Secrets management best practices

### Phase 5: Cryptography & Privacy (90-110 mins)
19. **cryptography-expert** - Encryption implementation validation
20. **pii-detector** - Personal data identification and protection
21. **gdpr-compliance-checker** - GDPR compliance validation
22. **encryption-auditor** - Data at rest/in-transit encryption

### Phase 6: Application Security (110-130 mins)
23. **session-security-analyst** - Session management security
24. **rate-limiter-validator** - Rate limiting and DDoS protection
25. **cors-policy-auditor** - CORS policy validation
26. **security-header-checker** - Security headers validation

### Phase 7: Compliance & Reporting (130-150 mins)
27. **compliance-orchestrator** - Multi-framework compliance
28. **vulnerability-scorer** - CVSS scoring and prioritization
29. **remediation-planner** - Remediation roadmap creation
30. **security-reporter** - Executive security report

## Agent Coordination Layers

### Strategic Security Layer
- **security-orchestrator**: Overall security coordination
- **threat-modeler**: Threat landscape analysis
- **compliance-orchestrator**: Regulatory compliance
- **risk-assessor**: Security risk quantification

### Offensive Security Layer (Red Team)
- **penetration-tester-web**: Web application attacks
- **penetration-tester-api**: API exploitation
- **authentication-breaker**: Auth bypass testing
- **injection-specialist**: Injection attack testing
- **xss-hunter**: XSS vulnerability discovery
- **csrf-detector**: CSRF testing

### Defensive Security Layer (Blue Team)
- **code-scanner-sast**: Static code analysis
- **dependency-auditor**: Supply chain security
- **secrets-detective**: Credential exposure prevention
- **configuration-hardener**: Secure configuration
- **encryption-auditor**: Cryptographic controls

### Infrastructure Security Layer
- **network-security-analyst**: Network security
- **container-security-scanner**: Container security
- **cloud-security-auditor**: Cloud security posture
- **secrets-management-validator**: Secrets management

### Compliance & Reporting Layer
- **vulnerability-scorer**: Vulnerability prioritization
- **remediation-planner**: Fix planning and tracking
- **compliance-orchestrator**: Standards compliance
- **security-reporter**: Security reporting

## Usage Examples

### Example 1: Pre-Production Security Audit
\`\`\`
/security-fortress Comprehensive security audit before production launch:
- Web application (React + Node.js + PostgreSQL)
- OAuth2 authentication with JWT
- Payment processing (Stripe integration)
- PCI-DSS compliance required
- OWASP Top 10 validation
- Container deployment on AWS ECS
\`\`\`

### Example 2: Post-Breach Hardening
\`\`\`
/security-fortress Emergency security hardening after incident:
- Recent credential exposure incident
- Full threat model reassessment
- Penetration testing (assume breach scenario)
- Secrets rotation and management
- Zero-trust architecture implementation
- Enhanced monitoring and detection
\`\`\`

### Example 3: Healthcare Application Security
\`\`\`
/security-fortress HIPAA compliance security assessment:
- Patient data handling application
- HL7 FHIR API implementation
- Multi-tenant architecture
- End-to-end encryption required
- Audit logging and access controls
- HIPAA compliance validation
\`\`\`

### Example 4: Financial Services Platform
\`\`\`
/security-fortress Banking application security review:
- High-value transaction processing
- Multi-factor authentication
- Transaction signing and verification
- SOC2 Type II compliance
- Fraud detection integration
- Insider threat modeling
\`\`\`

### Example 5: API Gateway Hardening
\`\`\`
/security-fortress Secure our API gateway and microservices:
- Kong API Gateway configuration
- JWT token validation
- Rate limiting and throttling
- API key management
- OAuth2/OIDC flows
- API versioning security
\`\`\`

## Expected Outputs

### 1. Threat Model Report
- STRIDE threat analysis per component
- Attack trees for critical assets
- Trust boundary diagram
- Threat actor profiles (script kiddie to nation-state)

### 2. Vulnerability Assessment
- Comprehensive vulnerability catalog
- CVSS v3.1 scores with risk ratings
- Exploitability analysis
- Proof-of-concept exploits (where applicable)

### 3. Penetration Testing Report
- OWASP Top 10 test results
- Successful exploitation scenarios
- Attack chain documentation
- Remediation recommendations

### 4. Code Security Analysis
- SAST findings with code locations
- Insecure coding pattern identification
- Dependency vulnerability report (SCA)
- Secrets exposure findings

### 5. Compliance Report
- OWASP ASVS compliance matrix
- CWE coverage analysis
- Framework-specific compliance (PCI-DSS, HIPAA, GDPR, SOC2)
- Gap analysis with remediation plan

### 6. Remediation Roadmap
- Prioritized vulnerability backlog (Critical → Low)
- Effort estimates for each fix
- Quick wins vs. strategic improvements
- Recommended security controls

### 7. Security Hardening Guide
- Configuration hardening checklist
- Security header recommendations
- Encryption implementation guide
- Secure coding standards

### 8. Executive Security Report
- Risk summary with business impact
- Top 10 critical findings
- Security posture score (0-100)
- Investment recommendations

## Success Criteria

- ✅ Complete threat model with STRIDE coverage
- ✅ All OWASP Top 10 vulnerabilities tested
- ✅ Zero critical vulnerabilities remaining
- ✅ High/Medium vulnerabilities documented with fixes
- ✅ Dependency vulnerabilities identified and tracked
- ✅ No exposed secrets or credentials
- ✅ Encryption validated for data at rest and in transit
- ✅ Security headers properly configured
- ✅ Rate limiting and DDoS protection validated
- ✅ Compliance requirements mapped and validated
- ✅ Remediation roadmap with timelines
- ✅ Security posture score >85/100

## Security Testing Coverage

### OWASP Top 10 (2021)
1. ✅ Broken Access Control
2. ✅ Cryptographic Failures
3. ✅ Injection
4. ✅ Insecure Design
5. ✅ Security Misconfiguration
6. ✅ Vulnerable and Outdated Components
7. ✅ Identification and Authentication Failures
8. ✅ Software and Data Integrity Failures
9. ✅ Security Logging and Monitoring Failures
10. ✅ Server-Side Request Forgery (SSRF)

### CWE Top 25 Coverage
- Out-of-bounds Write/Read
- Improper Input Validation
- SQL Injection
- XSS (Reflected, Stored, DOM-based)
- Path Traversal
- CSRF
- Command Injection
- Deserialization of Untrusted Data
- And 17 more CWE patterns

### Compliance Frameworks
- **OWASP ASVS** (Application Security Verification Standard)
- **PCI-DSS** (Payment Card Industry)
- **HIPAA** (Healthcare)
- **GDPR** (Privacy)
- **SOC2** (Security, Availability, Confidentiality)
- **NIST Cybersecurity Framework**
- **ISO 27001** (Information Security Management)

## Attack Simulation Scenarios

1. **External Attacker** - Public internet attacker with no prior knowledge
2. **Authenticated User** - Malicious authenticated user privilege escalation
3. **Insider Threat** - Compromised internal user with elevated access
4. **Supply Chain Attack** - Compromised dependency or third-party service
5. **Advanced Persistent Threat (APT)** - Nation-state level sophisticated attack

## Estimated Execution Time

- **Basic Security Scan**: 30-45 minutes
- **Standard Security Audit**: 2-3 hours
- **Comprehensive Security Fortress**: 4-6 hours
- **Enterprise Security Assessment**: 8-12 hours

## Notes

- Includes both automated scanning and manual security testing
- Penetration testing performed in safe, controlled manner
- No destructive actions without explicit permission
- Findings reported with severity, exploitability, and business impact
- Remediation guidance includes code examples and best practices
- Re-testing available after remediation implementation
- Integration with security tools (Burp Suite, OWASP ZAP, Snyk, etc.)
- Security metrics tracked over time for continuous improvement
