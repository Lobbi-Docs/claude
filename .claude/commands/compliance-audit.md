# Compliance Audit

Full regulatory compliance audit for GDPR, HIPAA, SOC2, PCI-DSS, ISO 27001, and other frameworks with gap analysis, remediation planning, and evidence collection.

## Purpose

Conduct comprehensive compliance audit against multiple regulatory frameworks to ensure legal and regulatory adherence, identify compliance gaps, create remediation plans, and prepare for external audits and certifications.

## Multi-Agent Coordination Strategy

Uses **parallel compliance assessment** pattern where framework-specific agents audit in parallel, then synthesize findings for cross-framework compliance optimization.

### Compliance Audit Architecture
\`\`\`
┌──────────────────────────────────────────────────┐
│       Compliance Command Center                   │
│       (compliance-orchestrator)                   │
└────────────┬─────────────────────────────────────┘
             │
    ┌────────┼────────┬────────┬────────┬─────────┐
    ▼        ▼        ▼        ▼        ▼         ▼
  GDPR    HIPAA    SOC2    PCI-DSS   ISO27001  Custom
\`\`\`

## Execution Flow

### Phase 1: Compliance Scoping (0-20 mins)
1. **compliance-orchestrator** - Determine applicable frameworks
2. **scope-analyzer** - Identify in-scope systems and data
3. **data-classifier** - Classify data types (PII, PHI, PCI, etc.)
4. **stakeholder-mapper** - Identify compliance stakeholders

### Phase 2: GDPR Compliance Audit (20-50 mins)
5. **gdpr-auditor** - GDPR Article compliance check
6. **data-subject-rights-validator** - Right to access, erasure, portability
7. **consent-manager-auditor** - Consent collection and management
8. **data-protection-impact-assessor** - DPIA requirements
9. **international-transfer-validator** - Cross-border data transfer compliance
10. **privacy-policy-reviewer** - Privacy policy completeness

### Phase 3: HIPAA Compliance Audit (50-80 mins)
11. **hipaa-auditor** - HIPAA Security and Privacy Rule compliance
12. **phi-identifier** - Protected Health Information identification
13. **access-control-validator** - Minimum necessary and role-based access
14. **audit-log-validator** - Audit logging requirements
15. **encryption-validator** - PHI encryption at rest and in transit
16. **breach-notification-assessor** - Breach notification procedures

### Phase 4: SOC2 Compliance Audit (80-110 mins)
17. **soc2-auditor** - Trust Services Criteria (Security, Availability, Confidentiality)
18. **security-control-validator** - Common Criteria controls
19. **availability-validator** - System availability and uptime
20. **confidentiality-validator** - Data confidentiality controls
21. **privacy-validator** - Privacy commitments (if applicable)
22. **change-management-auditor** - Change management procedures

### Phase 5: PCI-DSS Compliance Audit (110-140 mins)
23. **pci-dss-auditor** - PCI-DSS 12 requirements
24. **cardholder-data-flow-mapper** - Cardholder data environment mapping
25. **network-segmentation-validator** - Network segmentation validation
26. **vulnerability-scanner** - Quarterly vulnerability scans
27. **penetration-test-validator** - Annual penetration testing
28. **pci-logging-validator** - Log retention and monitoring

### Phase 6: ISO 27001 Compliance Audit (140-170 mins)
29. **iso27001-auditor** - Annex A controls compliance
30. **isms-validator** - Information Security Management System
31. **risk-assessment-validator** - Risk assessment methodology
32. **asset-management-validator** - Asset inventory and classification
33. **incident-management-validator** - Security incident management
34. **business-continuity-validator** - BC/DR planning

### Phase 7: Additional Frameworks (170-190 mins)
35. **ccpa-auditor** - California Consumer Privacy Act (if applicable)
36. **fedramp-auditor** - FedRAMP compliance (if applicable)
37. **nist-csf-mapper** - NIST Cybersecurity Framework mapping
38. **industry-specific-auditor** - Industry-specific regulations

### Phase 8: Cross-Framework Analysis (190-210 mins)
39. **control-mapper** - Map controls across frameworks
40. **gap-analyzer** - Identify compliance gaps
41. **evidence-collector** - Collect compliance evidence
42. **remediation-planner** - Create remediation roadmap
43. **compliance-orchestrator** - Final report and recommendations

## Agent Coordination Layers

### Framework-Specific Audit Layer
- **gdpr-auditor**: GDPR compliance assessment
- **hipaa-auditor**: HIPAA compliance assessment
- **soc2-auditor**: SOC2 compliance assessment
- **pci-dss-auditor**: PCI-DSS compliance assessment
- **iso27001-auditor**: ISO 27001 compliance assessment

### Technical Control Layer
- **access-control-validator**: Access controls and authentication
- **encryption-validator**: Encryption implementation
- **audit-log-validator**: Logging and monitoring
- **network-segmentation-validator**: Network security
- **vulnerability-scanner**: Vulnerability management

### Process & Policy Layer
- **policy-reviewer**: Policy completeness and accuracy
- **procedure-validator**: Procedure documentation
- **training-validator**: Security awareness training
- **incident-response-validator**: Incident response plan
- **business-continuity-validator**: BC/DR planning

### Data Governance Layer
- **data-classifier**: Data classification
- **data-flow-mapper**: Data flow documentation
- **data-retention-validator**: Retention policies
- **data-subject-rights-validator**: Privacy rights fulfillment

### Evidence & Reporting Layer
- **evidence-collector**: Compliance evidence gathering
- **gap-analyzer**: Gap analysis
- **remediation-planner**: Remediation planning
- **compliance-reporter**: Audit report generation

## Usage Examples

### Example 1: Healthcare SaaS Compliance
\`\`\`
/compliance-audit Comprehensive compliance audit for healthcare SaaS:
- Frameworks: HIPAA, SOC2 Type II, GDPR (EU customers)
- Scope: Patient data platform with EHR integration
- Data: PHI, PII, payment information
- Goal: Prepare for SOC2 audit in 90 days
- Deliverable: Gap analysis and remediation roadmap
\`\`\`

### Example 2: FinTech Payment Platform
\`\`\`
/compliance-audit Compliance audit for payment processing platform:
- Frameworks: PCI-DSS Level 1, SOC2, GDPR, CCPA
- Scope: Payment gateway, card data processing
- Goal: Annual PCI-DSS assessment preparation
- Current: Level 2 certified, scaling to Level 1
- Deliverable: PCI compliance gaps and evidence collection
\`\`\`

### Example 3: Enterprise SaaS Pre-Audit
\`\`\`
/compliance-audit Pre-audit assessment for SOC2 Type II:
- First-time SOC2 certification
- Trust Services: Security, Availability, Confidentiality
- Scope: Multi-tenant B2B SaaS platform
- Timeline: 6 months to audit readiness
- Deliverable: Control implementation roadmap
\`\`\`

### Example 4: Government Contractor FedRAMP
\`\`\`
/compliance-audit FedRAMP compliance assessment:
- Frameworks: FedRAMP Moderate, NIST 800-53
- Scope: Cloud-based document management system
- Goal: FedRAMP authorization in 12 months
- Current: FISMA compliance
- Deliverable: System Security Plan (SSP) gap analysis
\`\`\`

### Example 5: E-Commerce Multi-Region Compliance
\`\`\`
/compliance-audit Multi-jurisdiction privacy compliance:
- Frameworks: GDPR (EU), CCPA (California), PIPEDA (Canada)
- Scope: E-commerce platform with global operations
- Data: Customer PII, payment data, behavioral analytics
- Goal: Unified privacy compliance program
- Deliverable: Cross-framework compliance matrix
\`\`\`

## Expected Outputs

### 1. Compliance Scope Document
- Applicable regulatory frameworks
- In-scope systems, applications, and data
- Data classification (PII, PHI, PCI, etc.)
- Compliance timeline and milestones

### 2. Framework-Specific Audit Reports

#### GDPR Audit Report
- Article-by-article compliance assessment
- Lawful basis for processing
- Data subject rights fulfillment
- DPIA requirements and completion
- Data transfer mechanisms
- Cookie consent compliance
- Privacy policy adequacy

#### HIPAA Audit Report
- Security Rule (Administrative, Physical, Technical Safeguards)
- Privacy Rule compliance
- PHI inventory and access controls
- Breach notification procedures
- Business Associate Agreements (BAAs)
- Audit logging and monitoring

#### SOC2 Audit Report
- Trust Services Criteria assessment (TSC)
- Common Criteria (CC) control implementation
- Control design and operating effectiveness
- System description accuracy
- Complementary User Entity Controls (CUECs)
- Readiness for Type I/II audit

#### PCI-DSS Audit Report
- 12 requirement compliance status
- Cardholder Data Environment (CDE) scope
- Network segmentation validation
- Compensating controls documentation
- Self-Assessment Questionnaire (SAQ) type
- Attestation of Compliance (AOC) readiness

#### ISO 27001 Audit Report
- ISMS maturity assessment
- Annex A controls implementation (114 controls)
- Risk assessment and treatment
- Statement of Applicability (SoA)
- Internal audit findings
- Management review adequacy

### 3. Compliance Gap Analysis
- Identified gaps by framework and severity
- Non-compliant controls with evidence
- Partially compliant controls requiring enhancement
- Missing policies, procedures, and documentation
- Technical control deficiencies

### 4. Risk Assessment
- Compliance risk scoring (Critical, High, Medium, Low)
- Regulatory enforcement risk
- Financial penalty exposure
- Reputational risk
- Business impact analysis

### 5. Evidence Collection Package
- Existing compliance evidence organized by control
- Evidence gaps requiring collection
- Automated evidence collection opportunities
- Evidence retention recommendations

### 6. Control Mapping Matrix
- Cross-framework control mapping
- Common controls across frameworks
- Framework-specific unique requirements
- Control inheritance opportunities

### 7. Remediation Roadmap
- Prioritized remediation plan (by risk and effort)
- Quick wins (high impact, low effort)
- Long-term strategic improvements
- Resource requirements (people, budget, tools)
- Timeline with milestones
- Dependencies and prerequisites

### 8. Policy & Procedure Recommendations
- Required policy creation/updates
- Procedure documentation gaps
- Training and awareness programs
- Incident response plan enhancements
- Business continuity/disaster recovery

### 9. Technical Implementation Guide
- Technical controls to implement
- Configuration hardening recommendations
- Encryption implementation
- Access control enhancements
- Logging and monitoring improvements

### 10. Audit Readiness Assessment
- Overall compliance readiness score (0-100)
- Readiness by framework
- Estimated time to audit-ready state
- Critical blockers to address
- Recommended external audit timeline

## Success Criteria

- ✅ All applicable frameworks identified and scoped
- ✅ Complete compliance gap analysis per framework
- ✅ All in-scope data classified (PII, PHI, PCI, etc.)
- ✅ Technical controls assessed and documented
- ✅ Policies and procedures reviewed for completeness
- ✅ Compliance evidence collected and organized
- ✅ Cross-framework control mapping completed
- ✅ Risk-prioritized remediation roadmap created
- ✅ Timeline to compliance established
- ✅ Resource requirements identified
- ✅ Audit readiness score calculated
- ✅ Executive summary for stakeholders

## Compliance Frameworks Coverage

### Privacy Frameworks
- **GDPR** (General Data Protection Regulation - EU)
- **CCPA** (California Consumer Privacy Act - California)
- **PIPEDA** (Personal Information Protection - Canada)
- **LGPD** (Lei Geral de Proteção de Dados - Brazil)
- **APPI** (Act on Protection of Personal Information - Japan)

### Healthcare Frameworks
- **HIPAA** (Health Insurance Portability and Accountability Act)
- **HITECH** (Health Information Technology for Economic and Clinical Health)
- **21 CFR Part 11** (FDA Electronic Records)

### Payment Security
- **PCI-DSS** (Payment Card Industry Data Security Standard)
- **PA-DSS** (Payment Application Data Security Standard)

### Information Security
- **ISO 27001/27002** (Information Security Management)
- **SOC 2** (Service Organization Control - Trust Services)
- **NIST CSF** (Cybersecurity Framework)
- **NIST 800-53** (Security and Privacy Controls)
- **CIS Controls** (Center for Internet Security)

### Government & Federal
- **FedRAMP** (Federal Risk and Authorization Management Program)
- **FISMA** (Federal Information Security Management Act)
- **CMMC** (Cybersecurity Maturity Model Certification)
- **ITAR** (International Traffic in Arms Regulations)

### Industry-Specific
- **FINRA** (Financial Industry Regulatory Authority)
- **GLBA** (Gramm-Leach-Bliley Act - Financial)
- **FERPA** (Family Educational Rights and Privacy Act)
- **COPPA** (Children's Online Privacy Protection Act)

## Compliance Control Categories

### Administrative Controls
- Policies and procedures
- Risk assessments
- Security awareness training
- Vendor management
- Incident response planning
- Business continuity planning

### Technical Controls
- Access controls (authentication, authorization)
- Encryption (at rest, in transit)
- Audit logging and monitoring
- Vulnerability management
- Network security
- Data loss prevention

### Physical Controls
- Facility access controls
- Environmental controls
- Hardware disposal
- Visitor management

### Data Governance
- Data classification
- Data retention and disposal
- Data subject rights (access, erasure, portability)
- Consent management
- Privacy by design

## Estimated Execution Time

- **Single Framework Audit**: 1-2 hours
- **Dual Framework (e.g., HIPAA + SOC2)**: 2-3 hours
- **Triple Framework (e.g., GDPR + HIPAA + SOC2)**: 3-4 hours
- **Comprehensive Multi-Framework**: 5-8 hours
- **Enterprise Compliance Program**: 12-16 hours

## Notes

- Compliance is ongoing, not one-time; establish continuous compliance
- Automated compliance monitoring recommended post-audit
- Regular internal audits (quarterly or semi-annually) maintain readiness
- Compliance evidence should be collected continuously, not just pre-audit
- Cross-framework control mapping reduces duplication of effort
- Third-party audit firms may have specific evidence requirements
- Compliance frameworks evolve; stay updated on regulatory changes
- Consider compliance-as-code for automated policy enforcement
- Engage legal counsel for regulatory interpretation
- Document compensating controls where full compliance isn't feasible
