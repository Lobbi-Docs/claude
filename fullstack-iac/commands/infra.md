---
description: Generate Terraform infrastructure as code for AWS, Azure, or GCP
argument-hint: "[name] --cloud [aws|azure|gcp] --env [dev|staging|prod]"
allowed-tools: ["Write", "Bash", "Read", "Edit"]
---

# Zenith Infrastructure

Generate production-ready Terraform infrastructure code for cloud providers with best practices, security, and scalability.

## Usage
```
/zenith:infra <name> [options]
```

## Arguments
- `name` - Infrastructure project name (required)

## Options
- `--cloud <provider>` - Cloud provider (default: aws)
  - `aws` - Amazon Web Services
  - `azure` - Microsoft Azure
  - `gcp` - Google Cloud Platform
- `--env <environment>` - Environment setup (default: all)
  - `dev` - Development only
  - `staging` - Staging only
  - `prod` - Production only
  - `all` - All environments
- `--modules <list>` - Infrastructure modules (comma-separated)
  - `network` - VPC/VNet setup (default)
  - `compute` - VM/Container instances
  - `database` - Managed databases
  - `storage` - Object storage
  - `cdn` - Content delivery
  - `monitoring` - Monitoring stack
  - `security` - Security groups/policies
- `--backend <type>` - Terraform backend (default: s3)
  - `s3` - AWS S3 (with DynamoDB lock)
  - `azurerm` - Azure Storage
  - `gcs` - Google Cloud Storage
  - `local` - Local backend (dev only)

## Project Structure
```
<name>/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── terraform.tfvars
│   ├── staging/
│   └── prod/
├── modules/
│   ├── network/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── compute/
│   ├── database/
│   ├── storage/
│   └── monitoring/
├── scripts/
│   ├── init.sh
│   ├── plan.sh
│   ├── apply.sh
│   └── destroy.sh
├── policies/
│   └── security-policies.json
├── .gitignore
└── README.md
```

## AWS Modules

### Network
- VPC with public/private subnets
- Internet Gateway
- NAT Gateway
- Route Tables
- Security Groups
- Network ACLs

### Compute
- EC2 instances
- Auto Scaling Groups
- Load Balancers (ALB/NLB)
- ECS/EKS clusters
- Lambda functions

### Database
- RDS (PostgreSQL/MySQL)
- DynamoDB
- ElastiCache (Redis/Memcached)
- DocumentDB

### Storage
- S3 buckets
- EFS file systems
- EBS volumes

### Monitoring
- CloudWatch
- CloudTrail
- X-Ray
- SNS/SQS

## Azure Modules

### Network
- Virtual Network
- Subnets
- Network Security Groups
- Application Gateway
- Azure Firewall

### Compute
- Virtual Machines
- VM Scale Sets
- AKS clusters
- Container Instances
- Azure Functions

### Database
- Azure SQL Database
- Cosmos DB
- Azure Database for PostgreSQL
- Azure Cache for Redis

### Storage
- Blob Storage
- File Storage
- Disk Storage

## GCP Modules

### Network
- VPC Network
- Subnets
- Firewall Rules
- Cloud NAT
- Cloud Load Balancing

### Compute
- Compute Engine
- GKE clusters
- Cloud Run
- Cloud Functions

### Database
- Cloud SQL
- Firestore
- Cloud Spanner
- Memorystore

## Examples

```bash
# AWS infrastructure with all environments
/zenith:infra my-app-infra --cloud aws --env all

# Azure production only with specific modules
/zenith:infra prod-infra --cloud azure --env prod --modules network,compute,database

# GCP development with monitoring
/zenith:infra dev-infra --cloud gcp --env dev --modules network,compute,monitoring

# AWS full stack infrastructure
/zenith:infra fullstack --cloud aws --modules network,compute,database,storage,cdn,monitoring
```

## Features

### Security
- Encryption at rest
- Encryption in transit
- IAM policies
- Secret management
- Network isolation
- Security scanning

### High Availability
- Multi-AZ deployment
- Auto-scaling
- Load balancing
- Failover configuration
- Backup strategies

### Monitoring
- Metrics collection
- Log aggregation
- Alerting
- Dashboards
- Tracing

### Cost Optimization
- Right-sized instances
- Reserved instances
- Spot instances
- Auto-scaling policies
- Resource tagging

## Terraform Commands

### Initialize
```bash
cd environments/dev
terraform init
```

### Plan
```bash
terraform plan -var-file=terraform.tfvars -out=plan.out
```

### Apply
```bash
terraform apply plan.out
```

### Destroy
```bash
terraform destroy -var-file=terraform.tfvars
```

## State Management
- Remote state storage
- State locking
- State encryption
- Workspace separation
- State backup

## Agent Assignment
This command activates the **zenith-infra-builder** agent for execution.

## Prerequisites
- Terraform 1.5+
- Cloud provider CLI (aws-cli/az/gcloud)
- Appropriate cloud credentials
- S3/Azure Storage/GCS bucket for state

## Post-Creation Steps
1. Configure cloud credentials
2. Create backend storage (S3/Azure/GCS)
3. Update `terraform.tfvars` for each environment
4. `cd environments/dev`
5. `terraform init`
6. `terraform plan`
7. `terraform apply`

## Best Practices
- Use modules for reusability
- Separate environments
- Remote state with locking
- Tag all resources
- Use variables for configuration
- Enable encryption
- Implement least privilege
- Regular security audits
