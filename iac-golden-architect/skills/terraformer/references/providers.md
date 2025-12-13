# Terraformer Provider-Specific Guides

Complete reference for importing infrastructure from major cloud providers using Terraformer.

## Table of Contents

- [AWS](#aws)
- [Azure](#azure)
- [GCP](#gcp)
- [Kubernetes](#kubernetes)
- [Multi-Provider Strategies](#multi-provider-strategies)

---

## AWS

### Prerequisites

```bash
# Install AWS CLI
brew install awscli  # macOS
# or
apt-get install awscli  # Linux

# Configure credentials
aws configure
# OR use environment variables
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
export AWS_DEFAULT_REGION="us-east-1"

# Verify access
aws sts get-caller-identity
```

### Supported AWS Resources (150+)

**Compute:**
- ec2_instance
- autoscaling
- elastic_beanstalk
- lambda
- ecs
- eks
- batch

**Networking:**
- vpc
- subnet
- route_table
- internet_gateway
- nat_gateway
- security_group
- network_acl
- elastic_ip
- vpn_gateway
- vpn_connection
- customer_gateway
- transit_gateway
- vpc_peering

**Storage:**
- s3
- ebs
- efs
- fsx
- backup

**Database:**
- rds
- dynamodb
- elasticache
- redshift
- neptune
- documentdb

**Identity & Access:**
- iam
- iam_role
- iam_policy
- iam_user
- iam_group
- organizations

**Application Services:**
- sqs
- sns
- api_gateway
- cloudfront
- route53
- acm
- cloudwatch
- kinesis

**Container Services:**
- ecr
- ecs
- eks

**Analytics:**
- glue
- athena
- emr

**Management:**
- cloudformation
- cloudtrail
- config
- systems_manager

### AWS Import Examples

#### 1. VPC and Networking

```bash
# Import complete VPC setup
terraformer import aws \
  --resources=vpc,subnet,route_table,internet_gateway,nat_gateway,security_group \
  --regions=us-east-1 \
  --filter="Name=tag:Environment;Value=production" \
  --compact

# Import specific VPC by ID
terraformer import aws \
  --resources=vpc \
  --regions=us-east-1 \
  --filter="Name=id;Value=vpc-0123456789abcdef0"

# Import multi-region VPC setup
terraformer import aws \
  --resources=vpc,subnet,security_group \
  --regions=us-east-1,us-west-2,eu-west-1 \
  --path-pattern=generated/aws/{region}/network
```

#### 2. EC2 Instances and Auto Scaling

```bash
# Import EC2 instances with filters
terraformer import aws \
  --resources=ec2_instance \
  --regions=us-east-1 \
  --filter="Name=tag:Team;Value=platform" \
  --compact

# Import Auto Scaling Groups
terraformer import aws \
  --resources=autoscaling,launch_configuration \
  --regions=us-east-1 \
  --filter="Name=tag:Environment;Value=production"

# Import complete compute stack
terraformer import aws \
  --resources=ec2_instance,autoscaling,elastic_beanstalk,lambda \
  --regions=us-east-1
```

#### 3. RDS and Databases

```bash
# Import RDS instances
terraformer import aws \
  --resources=rds \
  --regions=us-east-1 \
  --filter="Name=engine;Value=postgres"

# Import complete database stack
terraformer import aws \
  --resources=rds,dynamodb,elasticache \
  --regions=us-east-1 \
  --filter="Name=tag:Environment;Value=production"

# Import RDS with subnet groups and parameter groups
terraformer import aws \
  --resources=rds,subnet_group,parameter_group,option_group \
  --regions=us-east-1
```

#### 4. S3 Buckets

```bash
# Import all S3 buckets
terraformer import aws \
  --resources=s3 \
  --regions=us-east-1

# Import specific buckets
terraformer import aws \
  --resources=s3 \
  --regions=us-east-1 \
  --filter="Name=id;Value=my-production-bucket"

# Import S3 with policies
terraformer import aws \
  --resources=s3,iam_policy \
  --regions=us-east-1
```

#### 5. EKS Clusters

```bash
# Import EKS cluster
terraformer import aws \
  --resources=eks \
  --regions=us-east-1

# Import EKS with node groups
terraformer import aws \
  --resources=eks,autoscaling,iam_role \
  --regions=us-east-1 \
  --filter="Name=tag:Cluster;Value=production-eks"

# Import complete EKS setup
terraformer import aws \
  --resources=eks,vpc,subnet,security_group,iam_role,iam_policy \
  --regions=us-east-1
```

#### 6. IAM Resources

```bash
# Import IAM roles and policies
terraformer import aws \
  --resources=iam_role,iam_policy,iam_user,iam_group \
  --regions=us-east-1

# Import specific role
terraformer import aws \
  --resources=iam_role \
  --regions=us-east-1 \
  --filter="Name=id;Value=my-application-role"

# Import service-linked roles
terraformer import aws \
  --resources=iam_role \
  --regions=us-east-1 \
  --filter="Name=path;Value=/aws-service-role/"
```

#### 7. Lambda Functions

```bash
# Import Lambda functions
terraformer import aws \
  --resources=lambda \
  --regions=us-east-1 \
  --filter="Name=tag:Application;Value=api"

# Import Lambda with IAM and API Gateway
terraformer import aws \
  --resources=lambda,iam_role,api_gateway \
  --regions=us-east-1
```

#### 8. CloudFront and Route53

```bash
# Import CloudFront distributions
terraformer import aws \
  --resources=cloudfront \
  --regions=us-east-1

# Import Route53 zones
terraformer import aws \
  --resources=route53 \
  --regions=us-east-1

# Import complete CDN setup
terraformer import aws \
  --resources=cloudfront,route53,acm,s3 \
  --regions=us-east-1
```

### AWS Multi-Account Import

```bash
# Account A
export AWS_PROFILE=account-a
terraformer import aws \
  --resources=vpc,ec2_instance,rds \
  --regions=us-east-1 \
  --path-pattern=generated/account-a/{service}

# Account B
export AWS_PROFILE=account-b
terraformer import aws \
  --resources=vpc,ec2_instance,rds \
  --regions=us-east-1 \
  --path-pattern=generated/account-b/{service}

# Account C (Organization Master)
export AWS_PROFILE=organization-master
terraformer import aws \
  --resources=organizations,iam \
  --regions=us-east-1 \
  --path-pattern=generated/organization/{service}
```

### AWS Filtering Strategies

```bash
# By tag key-value
--filter="Name=tag:Environment;Value=production"
--filter="Name=tag:Team;Value=platform"

# By resource ID
--filter="Name=id;Value=vpc-12345678"
--filter="Name=id;Value=i-0123456789abcdef0"

# By name pattern (use wildcard)
--filter="Name=name;Value=prod-*"

# By VPC ID (for VPC-specific resources)
--filter="Name=vpc-id;Value=vpc-12345678"

# By subnet ID
--filter="Name=subnet-id;Value=subnet-12345678"

# By instance type
--filter="Name=instance-type;Value=t3.large"

# By state
--filter="Name=state;Value=running"

# Multiple filters (AND logic)
--filter="Name=tag:Environment;Value=production" \
--filter="Name=tag:Team;Value=platform"
```

### AWS Best Practices

1. **Use Read-Only IAM Role**: Create dedicated role with read-only permissions
2. **Filter by Tags**: Consistently tag resources for easier filtering
3. **Import by Service**: Import related services together
4. **Multi-Region**: Use path patterns to organize regional resources
5. **Exclude Defaults**: Skip default VPCs, security groups
6. **Sensitive Data**: Review for hardcoded secrets, credentials
7. **State Files**: Split large state files by service or region

### AWS Common Issues

**Issue: Rate Limiting**
```bash
# Solution: Import fewer resources at once, or add delays
terraformer import aws \
  --resources=ec2_instance \
  --regions=us-east-1 \
  --rate-limit=10  # Experimental flag
```

**Issue: Missing Permissions**
```bash
# Solution: Add required IAM permissions
# Example: Read-only policy for EC2 import
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "ec2:List*"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## Azure

### Prerequisites

```bash
# Install Azure CLI
brew install azure-cli  # macOS
# or
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash  # Linux

# Login
az login

# Set subscription
az account set --subscription "My Subscription"

# Verify access
az account show
```

### Supported Azure Resources (100+)

**Compute:**
- virtual_machine
- virtual_machine_scale_set
- container_instance
- kubernetes_cluster (AKS)
- app_service
- function_app

**Networking:**
- virtual_network
- subnet
- network_security_group
- network_interface
- public_ip
- load_balancer
- application_gateway
- vpn_gateway
- express_route

**Storage:**
- storage_account
- storage_container
- storage_blob
- managed_disk

**Database:**
- sql_server
- sql_database
- mysql_server
- postgresql_server
- cosmosdb_account
- redis_cache

**Identity & Access:**
- role_assignment
- role_definition
- user_assigned_identity

**Management:**
- resource_group
- management_lock
- policy_assignment
- policy_definition

**Container Services:**
- container_registry
- kubernetes_cluster

**Monitoring:**
- monitor
- log_analytics_workspace
- application_insights

### Azure Import Examples

#### 1. Resource Group Import

```bash
# Import entire resource group
terraformer import azure \
  --resources=resource_group,virtual_network,virtual_machine \
  --resource-group=my-resource-group

# Import all resources in resource group
terraformer import azure \
  --resources=* \
  --resource-group=production-rg
```

#### 2. Virtual Networks

```bash
# Import VNet and subnets
terraformer import azure \
  --resources=virtual_network,subnet,network_security_group \
  --resource-group=network-rg

# Import complete networking stack
terraformer import azure \
  --resources=virtual_network,subnet,network_security_group,public_ip,load_balancer \
  --resource-group=production-rg
```

#### 3. Virtual Machines

```bash
# Import VMs
terraformer import azure \
  --resources=virtual_machine,network_interface,managed_disk \
  --resource-group=compute-rg

# Import VM Scale Sets
terraformer import azure \
  --resources=virtual_machine_scale_set \
  --resource-group=vmss-rg
```

#### 4. AKS Clusters

```bash
# Import AKS cluster
terraformer import azure \
  --resources=kubernetes_cluster \
  --resource-group=aks-rg

# Import AKS with networking
terraformer import azure \
  --resources=kubernetes_cluster,virtual_network,subnet \
  --resource-group=aks-production-rg
```

#### 5. Storage Accounts

```bash
# Import storage accounts
terraformer import azure \
  --resources=storage_account,storage_container \
  --resource-group=storage-rg

# Import all storage resources
terraformer import azure \
  --resources=storage_account,storage_container,storage_blob \
  --resource-group=data-rg
```

#### 6. Databases

```bash
# Import SQL Server and databases
terraformer import azure \
  --resources=sql_server,sql_database \
  --resource-group=database-rg

# Import PostgreSQL
terraformer import azure \
  --resources=postgresql_server,postgresql_database \
  --resource-group=postgres-rg

# Import CosmosDB
terraformer import azure \
  --resources=cosmosdb_account \
  --resource-group=cosmosdb-rg
```

#### 7. App Services

```bash
# Import App Service Plan and Apps
terraformer import azure \
  --resources=app_service_plan,app_service \
  --resource-group=webapp-rg

# Import Function Apps
terraformer import azure \
  --resources=function_app,storage_account \
  --resource-group=functions-rg
```

### Azure Multi-Subscription Import

```bash
# Subscription A
az account set --subscription "Production"
terraformer import azure \
  --resources=* \
  --resource-group=production-rg \
  --path-pattern=generated/azure/production/{service}

# Subscription B
az account set --subscription "Development"
terraformer import azure \
  --resources=* \
  --resource-group=dev-rg \
  --path-pattern=generated/azure/development/{service}
```

### Azure Filtering

```bash
# By resource group (most common)
--resource-group=my-resource-group

# Multiple resource groups (run separately)
terraformer import azure --resources=* --resource-group=rg1
terraformer import azure --resources=* --resource-group=rg2

# By tag (limited support, filter post-import)
# Import all, then filter in Terraform
```

### Azure Best Practices

1. **Organize by Resource Group**: Azure's natural boundary
2. **Use Managed Identities**: For authentication where possible
3. **Service Principal**: Create dedicated SP with read-only access
4. **Subscription Isolation**: Import separately per subscription
5. **Naming Conventions**: Azure enforces strict naming rules
6. **Location**: Be explicit about Azure regions
7. **Dependencies**: Import parent resources first (VNet before subnet)

### Azure Common Issues

**Issue: Authentication Failed**
```bash
# Solution: Re-authenticate
az login
az account show

# Or use Service Principal
export ARM_CLIENT_ID="00000000-0000-0000-0000-000000000000"
export ARM_CLIENT_SECRET="your-secret"
export ARM_SUBSCRIPTION_ID="00000000-0000-0000-0000-000000000000"
export ARM_TENANT_ID="00000000-0000-0000-0000-000000000000"
```

**Issue: Resource Not Found**
```bash
# Solution: Verify resource group and subscription
az group show --name my-resource-group
az account show
```

---

## GCP

### Prerequisites

```bash
# Install gcloud CLI
brew install google-cloud-sdk  # macOS
# or follow: https://cloud.google.com/sdk/docs/install

# Login
gcloud auth login
gcloud auth application-default login

# Set project
gcloud config set project my-project-id

# Verify access
gcloud config list
gcloud projects describe my-project-id
```

### Supported GCP Resources (100+)

**Compute:**
- compute_instance
- compute_instance_group
- compute_instance_template
- compute_autoscaler
- app_engine

**Networking:**
- compute_network
- compute_subnetwork
- compute_firewall
- compute_route
- compute_router
- compute_vpn_gateway
- compute_vpn_tunnel
- compute_forwarding_rule
- compute_target_pool
- compute_backend_service

**Storage:**
- storage_bucket
- compute_disk
- filestore

**Database:**
- sql_database_instance
- spanner_instance
- bigtable_instance
- firestore

**Container:**
- container_cluster (GKE)
- container_node_pool
- container_registry

**Identity & Access:**
- project_iam
- service_account
- iam_policy

**Serverless:**
- cloud_functions
- cloud_run

**Analytics:**
- bigquery_dataset
- bigquery_table
- dataflow

**Monitoring:**
- monitoring
- logging

### GCP Import Examples

#### 1. VPC Networks

```bash
# Import VPC and subnets
terraformer import google \
  --resources=networks,subnetworks,firewalls \
  --projects=my-project-id \
  --regions=us-central1

# Import complete network setup
terraformer import google \
  --resources=networks,subnetworks,firewalls,routes,routers \
  --projects=my-project-id \
  --regions=us-central1,us-east1
```

#### 2. Compute Instances

```bash
# Import instances in a region
terraformer import google \
  --resources=instances \
  --projects=my-project-id \
  --regions=us-central1

# Import instance groups
terraformer import google \
  --resources=instanceGroups,instanceTemplates \
  --projects=my-project-id \
  --regions=us-central1

# Import complete compute stack
terraformer import google \
  --resources=instances,instanceGroups,autoscalers,instanceTemplates \
  --projects=my-project-id \
  --regions=us-central1
```

#### 3. GKE Clusters

```bash
# Import GKE cluster
terraformer import google \
  --resources=gke \
  --projects=my-project-id \
  --regions=us-central1

# Import GKE with networking
terraformer import google \
  --resources=gke,networks,subnetworks,firewalls \
  --projects=my-project-id \
  --regions=us-central1

# Import GKE with node pools
terraformer import google \
  --resources=gke,gkeNodePools \
  --projects=my-project-id \
  --regions=us-central1
```

#### 4. Cloud Storage

```bash
# Import all buckets in project
terraformer import google \
  --resources=gcs \
  --projects=my-project-id

# Import specific bucket
terraformer import google \
  --resources=gcs \
  --projects=my-project-id \
  --filter="Name=id;Value=my-bucket-name"
```

#### 5. Cloud SQL

```bash
# Import Cloud SQL instances
terraformer import google \
  --resources=cloudsql \
  --projects=my-project-id \
  --regions=us-central1

# Import with databases
terraformer import google \
  --resources=cloudsql,databases \
  --projects=my-project-id \
  --regions=us-central1
```

#### 6. Cloud Functions

```bash
# Import Cloud Functions
terraformer import google \
  --resources=cloudFunctions \
  --projects=my-project-id \
  --regions=us-central1

# Import with storage (for source code)
terraformer import google \
  --resources=cloudFunctions,gcs \
  --projects=my-project-id \
  --regions=us-central1
```

#### 7. IAM and Service Accounts

```bash
# Import service accounts
terraformer import google \
  --resources=serviceAccounts \
  --projects=my-project-id

# Import project IAM bindings
terraformer import google \
  --resources=projectIamPolicy \
  --projects=my-project-id

# Import complete IAM setup
terraformer import google \
  --resources=serviceAccounts,projectIamPolicy,iamBindings \
  --projects=my-project-id
```

#### 8. BigQuery

```bash
# Import BigQuery datasets
terraformer import google \
  --resources=bigQuery \
  --projects=my-project-id

# Import datasets and tables
terraformer import google \
  --resources=bigQueryDatasets,bigQueryTables \
  --projects=my-project-id
```

### GCP Multi-Project Import

```bash
# Project A (Production)
gcloud config set project production-project
terraformer import google \
  --resources=* \
  --projects=production-project \
  --regions=us-central1 \
  --path-pattern=generated/gcp/production/{service}

# Project B (Development)
gcloud config set project dev-project
terraformer import google \
  --resources=* \
  --projects=dev-project \
  --regions=us-central1 \
  --path-pattern=generated/gcp/development/{service}

# Organization level (requires org admin)
terraformer import google \
  --resources=organizations,folders \
  --projects=org-admin-project
```

### GCP Filtering

```bash
# By project (required)
--projects=my-project-id

# By region (recommended)
--regions=us-central1,us-east1

# By zone
--zones=us-central1-a,us-central1-b

# By resource name (filter)
--filter="Name=name;Value=my-instance"

# By label (limited support)
# Import all, then filter with lifecycle in Terraform
```

### GCP Best Practices

1. **Project Isolation**: Import one project at a time
2. **Regional Resources**: Specify regions to avoid duplication
3. **Service Account**: Use dedicated SA with Viewer role
4. **Zonal vs Regional**: Be aware of zonal resources (instances) vs regional (subnetworks)
5. **Labels**: Use GCP labels for organization
6. **Dependencies**: Import networks before instances
7. **Quotas**: Be aware of API quotas when importing large projects

### GCP Common Issues

**Issue: Project Not Found**
```bash
# Solution: Verify project ID
gcloud projects list
gcloud config set project correct-project-id
```

**Issue: API Not Enabled**
```bash
# Solution: Enable required APIs
gcloud services enable compute.googleapis.com
gcloud services enable container.googleapis.com
gcloud services enable storage-api.googleapis.com
```

**Issue: Permission Denied**
```bash
# Solution: Grant required permissions
# Required roles:
# - roles/viewer (minimum)
# - roles/compute.networkViewer
# - roles/container.clusterViewer
# etc.
```

---

## Kubernetes

### Prerequisites

```bash
# Ensure kubectl is configured
kubectl config current-context
kubectl cluster-info

# Verify access
kubectl get nodes
kubectl get namespaces
```

### Supported Kubernetes Resources

**Workloads:**
- deployments
- statefulsets
- daemonsets
- replicasets
- pods

**Services & Networking:**
- services
- ingresses
- network_policies

**Configuration:**
- configmaps
- secrets
- persistent_volume_claims
- persistent_volumes
- storage_classes

**RBAC:**
- service_accounts
- roles
- role_bindings
- cluster_roles
- cluster_role_bindings

**Custom Resources:**
- custom_resource_definitions (CRDs)
- Custom resources from CRDs

### Kubernetes Import Examples

#### 1. Namespace Import

```bash
# Import all resources in a namespace
terraformer import kubernetes \
  --resources=deployments,services,configmaps,secrets \
  --namespace=production

# Import specific namespace resources
terraformer import kubernetes \
  --resources=deployments \
  --namespace=my-app \
  --filter="Name=name;Value=frontend"
```

#### 2. Multi-Namespace Import

```bash
# Import from multiple namespaces
for ns in production staging development; do
  terraformer import kubernetes \
    --resources=* \
    --namespace=$ns \
    --path-pattern=generated/k8s/$ns/{service}
done

# Or with loop
namespaces=("default" "kube-system" "production")
for ns in "${namespaces[@]}"; do
  terraformer import kubernetes \
    --resources=deployments,services \
    --namespace=$ns
done
```

#### 3. Cluster-Wide Resources

```bash
# Import cluster-level resources
terraformer import kubernetes \
  --resources=namespaces,persistent_volumes,storage_classes,cluster_roles

# Import all cluster resources
terraformer import kubernetes \
  --resources=* \
  --all-namespaces
```

#### 4. Complete Application Stack

```bash
# Import full application
terraformer import kubernetes \
  --resources=deployments,services,ingresses,configmaps,secrets,persistent_volume_claims \
  --namespace=my-application \
  --compact
```

#### 5. RBAC Resources

```bash
# Import RBAC configuration
terraformer import kubernetes \
  --resources=service_accounts,roles,role_bindings,cluster_roles,cluster_role_bindings \
  --namespace=production

# Import cluster-wide RBAC
terraformer import kubernetes \
  --resources=cluster_roles,cluster_role_bindings
```

### Kubernetes Multi-Cluster Import

```bash
# Cluster A
kubectl config use-context production-cluster
terraformer import kubernetes \
  --resources=* \
  --namespace=default \
  --path-pattern=generated/k8s/production/{service}

# Cluster B
kubectl config use-context staging-cluster
terraformer import kubernetes \
  --resources=* \
  --namespace=default \
  --path-pattern=generated/k8s/staging/{service}

# Cluster C
kubectl config use-context development-cluster
terraformer import kubernetes \
  --resources=* \
  --namespace=default \
  --path-pattern=generated/k8s/development/{service}
```

### Kubernetes Filtering

```bash
# By namespace (most common)
--namespace=my-namespace

# All namespaces
--all-namespaces

# By resource name
--filter="Name=name;Value=my-deployment"

# By label (planned feature, currently limited)
# Import all, then use lifecycle blocks in Terraform
```

### Kubernetes Best Practices

1. **Namespace Isolation**: Import per namespace
2. **Exclude System Resources**: Skip kube-system unless needed
3. **Secrets Handling**: Review secrets before committing
4. **State Sensitivity**: Encrypt state files (secrets included)
5. **CRDs First**: Import CRDs before custom resources
6. **Resource Dependencies**: Import in order (namespace → resources)
7. **Context Switching**: Verify kubectl context before import

### Kubernetes Common Issues

**Issue: Context Not Set**
```bash
# Solution: Set correct context
kubectl config get-contexts
kubectl config use-context my-cluster
```

**Issue: Namespace Not Found**
```bash
# Solution: Verify namespace exists
kubectl get namespaces
kubectl get ns my-namespace
```

**Issue: CRDs Not Imported**
```bash
# Solution: Import CRDs separately first
terraformer import kubernetes --resources=custom_resource_definitions
# Then import custom resources
terraformer import kubernetes --resources=* --namespace=my-app
```

---

## Multi-Provider Strategies

### Hybrid Cloud Import

Import resources from multiple providers into unified Terraform configuration.

```bash
# Step 1: Import AWS resources
terraformer import aws \
  --resources=vpc,ec2_instance,rds \
  --regions=us-east-1 \
  --path-pattern=generated/multi-cloud/aws/{service}

# Step 2: Import Azure resources
terraformer import azure \
  --resources=virtual_network,virtual_machine,sql_database \
  --resource-group=production-rg \
  --path-pattern=generated/multi-cloud/azure/{service}

# Step 3: Import GCP resources
terraformer import google \
  --resources=networks,instances,cloudsql \
  --projects=my-project \
  --regions=us-central1 \
  --path-pattern=generated/multi-cloud/gcp/{service}

# Step 4: Import Kubernetes (running on any cloud)
terraformer import kubernetes \
  --resources=deployments,services \
  --namespace=production \
  --path-pattern=generated/multi-cloud/kubernetes/{service}
```

### Cross-Provider Networking

Import interconnected resources across providers.

```bash
# AWS VPN side
terraformer import aws \
  --resources=vpn_gateway,vpn_connection,customer_gateway \
  --regions=us-east-1 \
  --path-pattern=generated/vpn/aws

# Azure VPN side
terraformer import azure \
  --resources=vpn_gateway,express_route \
  --resource-group=vpn-rg \
  --path-pattern=generated/vpn/azure

# GCP VPN side
terraformer import google \
  --resources=vpnGateways,vpnTunnels \
  --projects=my-project \
  --regions=us-central1 \
  --path-pattern=generated/vpn/gcp
```

### Multi-Region Multi-Cloud

```bash
#!/bin/bash

# Define regions for each provider
AWS_REGIONS=("us-east-1" "us-west-2" "eu-west-1")
AZURE_RGS=("us-rg" "eu-rg")
GCP_REGIONS=("us-central1" "europe-west1")

# Import AWS multi-region
for region in "${AWS_REGIONS[@]}"; do
  terraformer import aws \
    --resources=vpc,ec2_instance \
    --regions=$region \
    --path-pattern=generated/aws/$region/{service}
done

# Import Azure multi-region
for rg in "${AZURE_RGS[@]}"; do
  terraformer import azure \
    --resources=virtual_network,virtual_machine \
    --resource-group=$rg \
    --path-pattern=generated/azure/$rg/{service}
done

# Import GCP multi-region
for region in "${GCP_REGIONS[@]}"; do
  terraformer import google \
    --resources=networks,instances \
    --projects=my-project \
    --regions=$region \
    --path-pattern=generated/gcp/$region/{service}
done
```

### Unified State Management

After importing from multiple providers, consolidate state management.

```bash
# Create unified backend configuration
cat > backend.tf <<EOF
terraform {
  backend "s3" {
    bucket         = "multi-cloud-terraform-state"
    key            = "global/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
EOF

# Initialize each provider directory
for provider in aws azure gcp kubernetes; do
  cd generated/$provider
  cp ../../backend.tf .
  terraform init
  cd ../..
done
```

### Tagging Strategy Across Providers

Standardize tags/labels across clouds for consistent filtering.

**AWS Tags:**
```bash
--filter="Name=tag:Environment;Value=production"
--filter="Name=tag:Team;Value=platform"
--filter="Name=tag:CostCenter;Value=engineering"
```

**Azure Tags (post-import filtering):**
```hcl
# Filter in Terraform after import
resource "azurerm_virtual_machine" "example" {
  # ...
  tags = {
    Environment = "production"
    Team        = "platform"
    CostCenter  = "engineering"
  }
}
```

**GCP Labels:**
```bash
# Import all, then filter with lifecycle
# GCP labels follow different format
# environment: production
# team: platform
# cost-center: engineering
```

### Cross-Provider Dependencies

Document dependencies between clouds.

```hcl
# AWS resource referencing GCP
data "terraform_remote_state" "gcp" {
  backend = "gcs"
  config = {
    bucket = "gcp-terraform-state"
    prefix = "terraform/state"
  }
}

resource "aws_vpn_connection" "to_gcp" {
  vpn_gateway_id      = aws_vpn_gateway.main.id
  customer_gateway_id = aws_customer_gateway.gcp.id
  type                = "ipsec.1"

  # Reference GCP VPN IP from remote state
  # static_routes_only = true
}
```

### Provider Version Pinning

Ensure consistent provider versions across imports.

```hcl
# versions.tf (create in root of each provider directory)
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}
```

### Cost Optimization Across Clouds

After importing, analyze costs across providers.

```bash
# Generate cost report using infracost
cd generated/aws
infracost breakdown --path . --format table > aws-costs.txt

cd ../azure
infracost breakdown --path . --format table > azure-costs.txt

cd ../gcp
infracost breakdown --path . --format table > gcp-costs.txt

# Compare and optimize
```

---

## Quick Reference

### AWS
```bash
terraformer import aws --resources=vpc,ec2_instance --regions=us-east-1 --filter="Name=tag:Env;Value=prod"
```

### Azure
```bash
terraformer import azure --resources=virtual_network,virtual_machine --resource-group=my-rg
```

### GCP
```bash
terraformer import google --resources=networks,instances --projects=my-project --regions=us-central1
```

### Kubernetes
```bash
terraformer import kubernetes --resources=deployments,services --namespace=production
```

### Multi-Provider
```bash
# Import from all providers into organized structure
./scripts/multi-cloud-import.sh
```

---

## Next Steps

After importing resources:

1. **Review generated code** in `generated/` directories
2. **Validate with terraform plan** to ensure no drift
3. **Refactor into modules** for reusability
4. **Set up remote state** for collaboration
5. **Implement CI/CD** for automated deployments
6. **Add policy checks** for compliance
7. **Document architecture** for team reference

See `import-workflow.md` for detailed post-import steps.
