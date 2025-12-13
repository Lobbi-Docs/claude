# IaC Architecture - Cross-Cutting Concerns Skill

## Skill Description

This skill provides comprehensive guidance on infrastructure as code architecture patterns, focusing on cross-cutting concerns that span all cloud providers and IaC tools. The Dredgen uses this skill to architect secure, compliant, cost-optimized, and maintainable infrastructure at enterprise scale.

## Trigger Phrases

This skill activates when discussions involve:
- "iac best practices"
- "infrastructure architecture"
- "soc2" or "compliance"
- "security patterns"
- "cost optimization"
- "multi-cloud architecture"
- "enterprise infrastructure"
- "tagging strategy"
- "repository structure"
- "iac security"
- "infrastructure compliance"
- "cloud governance"

## Core Competencies

### 1. Security Patterns

**Encryption Standards**
- Encryption at rest: AES-256 for all storage resources
- Encryption in transit: TLS 1.2+ for all network communications
- Key management: Cloud-native KMS or HashiCorp Vault
- Certificate rotation: Automated with short-lived certificates

**IAM Best Practices**
- Principle of least privilege
- Role-based access control (RBAC)
- Service accounts for automation
- MFA enforcement for human access
- Regular access reviews and audits
- Assume-role patterns for cross-account access

**Network Segmentation**
- VPC/VNet isolation per environment
- Private subnets for data and compute
- Public subnets only for load balancers
- Network ACLs and security groups
- Bastion hosts or VPN for administrative access
- Zero-trust network principles

**Secrets Management**
- Never commit secrets to version control
- Use cloud-native secrets managers
- Dynamic secrets generation
- Secrets rotation policies
- Audit logging for secret access
- Encryption in transit and at rest

**Security Scanning Integration**
- **tfsec**: Terraform security scanning
- **checkov**: Multi-IaC policy scanning
- **trivy**: Container and IaC vulnerability scanning
- **terrascan**: Compliance scanning
- Integration in CI/CD pipelines
- Fail builds on critical findings

### 2. SOC2 Compliance

**CC6.1 - Logical and Physical Access Controls**
- Encryption at rest (customer data)
- Encryption in transit (all communications)
- Key rotation policies
- Access logging

**CC6.6 - Logical Access Security Measures**
- Comprehensive logging (CloudTrail, Activity Logs, Audit Logs)
- Log retention (minimum 90 days)
- Log integrity protection
- SIEM integration
- Real-time alerting

**CC6.7 - Restriction of Logical Access**
- IAM policies with least privilege
- MFA enforcement
- Session timeout policies
- Access reviews
- Privileged access management

**CC7.1 - Network Security**
- Network segmentation
- Security groups/NSGs with minimal rules
- No public database access
- Private endpoints for services
- DDoS protection

**CC7.2 - Detection and Monitoring**
- Change management tracking
- Infrastructure drift detection
- Automated remediation
- Version control for all IaC
- Approval workflows for production changes

**Audit Trail Requirements**
- Immutable audit logs
- Centralized log aggregation
- Log analysis and alerting
- Compliance reporting
- Evidence collection automation

### 3. Cost Optimization

**Tagging Strategies**
- Environment tags (dev, staging, prod)
- Owner/team tags
- Cost center allocation
- Application/service tags
- Automation tags (terraform-managed)
- Data classification tags
- Compliance tags (soc2, hipaa)

**Right-Sizing Patterns**
- Start small, scale up based on metrics
- Use auto-scaling groups
- Implement scheduled scaling
- Leverage spot/preemptible instances
- Monitor and adjust continuously

**Reserved Capacity**
- Reserved instances for stable workloads
- Savings plans for flexible workloads
- Commitment-based discounts
- Regular utilization reviews

**Spot/Preemptible Instances**
- Batch processing workloads
- Stateless applications
- Development environments
- Mixed instance groups
- Fault-tolerant architectures

**Cost Allocation**
- Tag-based cost allocation
- Budget alerts and limits
- Showback/chargeback reports
- Cost anomaly detection
- FinOps integration

### 4. Multi-Cloud Patterns

**Abstraction Layers**
- Provider-agnostic modules
- Standardized interfaces
- Common tagging schemas
- Unified naming conventions
- Shared variable structures

**Provider-Agnostic Modules**
- Abstract compute, storage, networking
- Use Terragrunt for DRY configurations
- Implement factory patterns
- Version and document modules
- Test across providers

**Cross-Cloud Networking**
- VPN connections between clouds
- SD-WAN for multi-cloud
- Direct connect/ExpressRoute/Interconnect
- Consistent CIDR planning
- DNS strategy for multi-cloud

**Disaster Recovery**
- RTO/RPO requirements
- Active-passive configurations
- Active-active for critical systems
- Automated failover
- Regular DR testing

### 5. Repository Structure

**Monorepo vs Polyrepo**

**Monorepo Benefits:**
- Single source of truth
- Atomic changes across modules
- Shared tooling and standards
- Easier code reuse
- Simplified dependency management

**Polyrepo Benefits:**
- Independent versioning
- Team autonomy
- Smaller blast radius
- Easier access control
- Focused CI/CD pipelines

**Module Organization**
```
terraform/
├── modules/                    # Reusable modules
│   ├── compute/
│   ├── database/
│   ├── networking/
│   └── security/
├── environments/               # Environment configurations
│   ├── dev/
│   ├── staging/
│   └── prod/
├── shared/                     # Shared resources
│   ├── dns/
│   ├── monitoring/
│   └── logging/
└── policies/                   # Security policies
    ├── tfsec/
    ├── checkov/
    └── sentinel/
```

**Environment Separation**
- Separate AWS accounts/Azure subscriptions/GCP projects
- Isolated state files per environment
- Environment-specific variables
- Promotion workflows (dev → staging → prod)
- Immutable infrastructure

**CI/CD Integration**
- Automated validation (fmt, validate, lint)
- Security scanning in pipelines
- Plan on pull requests
- Apply on merge to main
- Drift detection scheduled jobs
- Rollback capabilities

## Reference Files

- `soc2-controls.md` - Complete SOC2 control mapping
- `security-scanning.md` - Security scanner configurations
- `tagging-strategy.md` - Enterprise tagging standards
- `repository-patterns.md` - Repository organization patterns
- `cost-optimization.md` - Cost control strategies

## Example Files

- `soc2-compliant-vpc.tf` - SOC2-compliant VPC configuration
- `tagging-module.tf` - Reusable tagging module
- `security-group-patterns.tf` - Secure security group patterns
- `cost-tags.tf` - Cost allocation tagging examples

## Skill Activation

When The Dredgen detects architectural discussions involving security, compliance, cost, or governance, this skill provides:
1. Best practice recommendations
2. Compliance control mappings
3. Security patterns and examples
4. Cost optimization strategies
5. Repository structure guidance
6. Multi-cloud architecture patterns

## Integration with Other Skills

- **terraform-enterprise**: State management and workspace patterns
- **harness-cd**: Pipeline integration for compliance
- **vault-operations**: Secrets management implementation
- **terraformer**: Import existing infrastructure with compliance

## Success Criteria

Infrastructure architecture is successful when:
- Security scanners pass with zero critical findings
- SOC2 controls are fully implemented and documented
- Cost allocation tags are 100% compliant
- Multi-cloud patterns enable provider portability
- Repository structure supports team collaboration
- CI/CD pipelines enforce all policies
- Audit trails are complete and immutable
