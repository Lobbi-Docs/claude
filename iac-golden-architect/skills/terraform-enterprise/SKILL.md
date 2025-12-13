# Terraform Enterprise Skill

## Description

The terraform-enterprise skill provides comprehensive knowledge and patterns for enterprise-grade Terraform infrastructure management. This skill activates when working with multi-cloud infrastructure provisioning, state management, workspace orchestration, and policy-as-code implementations.

## Trigger Phrases

This skill activates on:
- "terraform", "tf", "infrastructure as code", "iac"
- "tf module", "terraform module", "module development"
- "state management", "remote state", "state backend"
- "workspaces", "terraform workspace"
- "multi-cloud", "aws terraform", "azure terraform", "gcp terraform"
- "policy as code", "sentinel", "opa"
- "terraform cloud", "terraform enterprise"
- "atlantis", "terraform automation"
- "state import", "terraform import"

## Capabilities

### Multi-Cloud Provider Expertise
- **AWS**: Complete resource coverage including VPC, EC2, RDS, EKS, Lambda, S3, IAM
- **Azure**: Resource Groups, VNets, AKS, App Services, Key Vault, Storage
- **GCP**: Projects, VPC, GKE, Cloud Functions, Cloud SQL, IAM
- **Cross-cloud patterns**: Networking, DNS, CDN, monitoring integration

### Remote State Management
- **S3 Backend**: Bucket configuration, DynamoDB locking, encryption, versioning
- **Azure Blob Storage**: Storage account setup, container configuration, state locking
- **Google Cloud Storage**: Bucket configuration, state locking
- **Terraform Cloud/Enterprise**: Workspace management, VCS integration, remote operations
- **State operations**: mv, rm, import, pull, push, list

### Workspace Strategies
- **Per-environment**: dev, staging, production isolation
- **Per-region**: Multi-region deployment patterns
- **Per-customer**: Multi-tenant infrastructure
- **Hybrid approaches**: Combining workspace and directory strategies

### Module Development Patterns
- **Standard module structure**: Variables, outputs, main, versions
- **Input validation**: Variable validation rules, type constraints
- **Output design**: Exposing resources effectively
- **Documentation**: README automation, terraform-docs
- **Versioning**: Semantic versioning, registry publishing
- **Testing**: Terratest, kitchen-terraform integration

### Variables, Outputs, and Locals
- **Variable types**: string, number, bool, list, map, object, set, tuple, any
- **Variable validation**: Custom validation rules
- **Default values**: Smart defaults, required vs optional
- **Locals patterns**: DRY principles, computed values
- **Output formatting**: Maps, objects, sensitive outputs

### Data Sources and Dependencies
- **Data source patterns**: Querying existing resources
- **Implicit dependencies**: Resource references
- **Explicit dependencies**: depends_on usage
- **Module dependencies**: Output chaining
- **Provider data sources**: AWS, Azure, GCP specific patterns

### Policy-as-Code Integration
- **Sentinel**: HashiCorp's policy framework for Terraform Cloud/Enterprise
- **OPA (Open Policy Agent)**: Conftest integration with Terraform
- **Policy types**: Cost control, security compliance, naming conventions
- **Pre-plan checks**: Preventing invalid configurations
- **Post-plan checks**: Validating planned changes

### Atlantis Integration
- **Repository configuration**: atlantis.yaml patterns
- **Workflow customization**: Multi-stage approval
- **Policy checks**: Integration with Sentinel/OPA
- **PR automation**: Plan comments, apply automation
- **Webhook setup**: GitHub, GitLab, Bitbucket integration

### Import Workflows
- **Resource discovery**: Identifying existing infrastructure
- **Import command patterns**: Resource-specific import syntax
- **State reconciliation**: Aligning code with imported state
- **Bulk import strategies**: Scripting imports for multiple resources
- **Post-import cleanup**: Refactoring imported code

### State Manipulation
- **terraform state mv**: Moving resources between modules/states
- **terraform state rm**: Removing resources from state without deletion
- **terraform state import**: Importing existing resources
- **terraform state list**: Listing all resources in state
- **terraform state show**: Inspecting specific resource state
- **State recovery**: Backup and restore procedures

## Integration Points

### With Other Skills
- **iac-architecture**: Overall infrastructure design patterns
- **harness-cd**: CI/CD pipeline integration for Terraform deployments
- **vault-operations**: Dynamic credentials, secret management
- **terraformer**: Importing existing infrastructure

### With Commands
- `/iac:tf-init`: Initialize Terraform projects
- `/iac:tf-plan`: Execute plans with validations
- `/iac:tf-apply`: Safe apply operations
- `/iac:validate`: Security and compliance checks
- `/iac:module-scaffold`: Generate new modules

### With Agents
- **terraform-architect**: Code review and optimization
- **security-compliance**: Policy validation
- **cost-optimizer**: Resource cost analysis

## Best Practices Enforced

1. **Always use remote state** for team collaboration
2. **Lock state** with DynamoDB (AWS) or equivalent
3. **Encrypt state** at rest and in transit
4. **Version control everything** except sensitive values
5. **Use workspaces** for environment isolation
6. **Modularize** reusable infrastructure patterns
7. **Validate inputs** with validation blocks
8. **Document modules** with terraform-docs
9. **Test modules** before production use
10. **Implement policy checks** before apply operations

## Security Considerations

- Never commit state files to version control
- Use encrypted backends (S3-SSE, Azure encryption, GCS encryption)
- Enable state versioning for rollback capability
- Use dynamic credentials from Vault when possible
- Implement least-privilege IAM for Terraform execution
- Use separate service accounts per environment
- Enable CloudTrail/Activity Logs for Terraform API calls
- Implement policy-as-code for compliance

## File References

### Core References
- `references/state-backends.md` - Complete backend configurations
- `references/module-patterns.md` - Module design patterns and standards
- `references/policy-as-code.md` - Sentinel and OPA implementation patterns
- `references/multi-cloud.md` - Provider configurations for AWS, Azure, GCP

### Examples
- `examples/aws-vpc-module.tf` - Production-ready AWS VPC module
- `examples/azure-vnet-module.tf` - Production-ready Azure VNet module
- `examples/gcp-vpc-module.tf` - Production-ready GCP VPC module
- `examples/backend-configs.tf` - All backend configuration examples

## Common Workflows

### Initialize New Project
```
1. Configure backend (S3/Azure/GCS/TF Cloud)
2. Initialize with terraform init
3. Create workspace structure
4. Set up modules
5. Configure variables
6. Implement policy checks
```

### Module Development
```
1. Scaffold module structure
2. Define variables with validation
3. Implement resources
4. Define outputs
5. Write README and examples
6. Add tests
7. Version and publish
```

### Import Existing Infrastructure
```
1. Identify resources to import
2. Write minimal resource blocks
3. Execute terraform import commands
4. Run terraform plan to verify
5. Refactor code to match best practices
6. Apply to reconcile any drift
```

### Multi-Cloud Deployment
```
1. Configure provider blocks for each cloud
2. Set up separate state files or workspaces
3. Use provider aliases for multi-region
4. Implement cross-cloud networking (VPN, peering)
5. Centralize DNS management
6. Configure unified monitoring
```

## Performance Optimization

- Use `-parallelism` flag for large infrastructures
- Implement targeted applies with `-target`
- Use `-refresh=false` when state is known good
- Split large states into smaller, focused modules
- Use data sources instead of remote state when possible
- Cache provider credentials

## Troubleshooting Patterns

### State Lock Issues
- Identify lock holder with state show
- Force unlock with caution
- Implement timeout configurations

### Import Failures
- Verify resource exists in cloud
- Check IAM permissions
- Validate resource ID format
- Use provider-specific import documentation

### Plan Differences
- Check for manual changes in console
- Review provider version changes
- Verify variable values
- Check for timing/dependency issues

### Module Conflicts
- Review module source versions
- Check for variable naming conflicts
- Validate provider requirements
- Ensure compatible Terraform versions

## Version Compatibility

- Terraform >= 1.0.0 (recommended 1.6+)
- Provider versions specified in required_providers
- Module registry integration
- Version constraints best practices

## Related Documentation

- [Terraform Registry](https://registry.terraform.io/)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)
- [AWS Provider Docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Azure Provider Docs](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [GCP Provider Docs](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Sentinel Language](https://docs.hashicorp.com/sentinel/language)
- [OPA/Conftest](https://www.conftest.dev/)
- [Atlantis Docs](https://www.runatlantis.io/)
