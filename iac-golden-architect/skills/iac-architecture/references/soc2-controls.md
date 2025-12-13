# SOC2 Trust Service Criteria - IaC Control Mapping

## Overview

This document maps SOC2 Type II Trust Service Criteria to Infrastructure as Code implementations. It provides specific control objectives, implementation guidance, and evidence collection strategies for IaC-managed infrastructure.

## Trust Service Criteria Categories

- **CC**: Common Criteria (applies to all trust services)
- **A**: Availability
- **C**: Confidentiality
- **P**: Processing Integrity
- **PI**: Privacy

---

## CC6: Logical and Physical Access Controls

### CC6.1 - The entity implements logical access security software

**Control Objective**: Restrict logical access through the use of access control software and rule sets.

#### IaC Implementation

**Encryption at Rest**
```hcl
# AWS Example - S3 Bucket
resource "aws_s3_bucket" "customer_data" {
  bucket = "customer-data-${var.environment}"

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm     = "aws:kms"
        kms_master_key_id = aws_kms_key.customer_data.arn
      }
    }
  }

  tags = {
    SOC2_Control    = "CC6.1"
    DataClassification = "confidential"
    Compliance      = "soc2"
  }
}

# KMS Key with rotation
resource "aws_kms_key" "customer_data" {
  description             = "Customer data encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true  # SOC2 requirement

  tags = {
    SOC2_Control = "CC6.1"
  }
}
```

**Encryption in Transit**
```hcl
# Application Load Balancer - HTTPS only
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.app.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"  # TLS 1.2+
  certificate_arn   = aws_acm_certificate.app.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# Redirect HTTP to HTTPS
resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.app.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
```

**Evidence Collection**
- KMS key rotation status: `aws kms get-key-rotation-status`
- S3 encryption configuration: `aws s3api get-bucket-encryption`
- Load balancer SSL policy: `aws elbv2 describe-listeners`

---

### CC6.6 - The entity implements logical access security measures

**Control Objective**: Provide comprehensive logging and monitoring of access.

#### IaC Implementation

**CloudTrail - Comprehensive Audit Logging**
```hcl
resource "aws_cloudtrail" "main" {
  name                          = "organization-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  include_global_service_events = true
  is_multi_region_trail         = true
  is_organization_trail         = true
  enable_log_file_validation    = true  # Log integrity

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::*/"]  # Log all S3 access
    }
  }

  tags = {
    SOC2_Control = "CC6.6"
    Compliance   = "soc2"
  }
}

# CloudTrail bucket with retention
resource "aws_s3_bucket" "cloudtrail" {
  bucket = "cloudtrail-logs-${var.account_id}"

  lifecycle_rule {
    enabled = true

    transition {
      days          = 90
      storage_class = "GLACIER"  # Long-term retention
    }

    expiration {
      days = 2555  # 7 years retention
    }
  }

  tags = {
    SOC2_Control = "CC6.6"
    Purpose      = "audit-logs"
  }
}

# CloudWatch Logs for application logging
resource "aws_cloudwatch_log_group" "app" {
  name              = "/aws/app/${var.app_name}"
  retention_in_days = 90  # Minimum 90 days for SOC2
  kms_key_id        = aws_kms_key.logs.arn

  tags = {
    SOC2_Control = "CC6.6"
  }
}
```

**VPC Flow Logs**
```hcl
resource "aws_flow_log" "vpc" {
  iam_role_arn    = aws_iam_role.flow_logs.arn
  log_destination = aws_cloudwatch_log_group.flow_logs.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.main.id

  tags = {
    SOC2_Control = "CC6.6"
    Purpose      = "network-monitoring"
  }
}

resource "aws_cloudwatch_log_group" "flow_logs" {
  name              = "/aws/vpc/flow-logs/${var.environment}"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.logs.arn
}
```

**Evidence Collection**
- CloudTrail status: `aws cloudtrail get-trail-status`
- Log retention: `aws logs describe-log-groups`
- VPC Flow Logs: `aws ec2 describe-flow-logs`

---

### CC6.7 - The entity restricts access to system components

**Control Objective**: Implement least privilege access controls.

#### IaC Implementation

**IAM Policies - Least Privilege**
```hcl
# Read-only access for developers
resource "aws_iam_policy" "developer_readonly" {
  name        = "DeveloperReadOnly"
  description = "Read-only access for developers"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:Get*",
          "s3:List*",
          "ec2:Describe*",
          "rds:Describe*",
          "logs:Get*",
          "logs:Describe*"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    SOC2_Control = "CC6.7"
  }
}

# Application service role - minimal permissions
resource "aws_iam_role" "app_service" {
  name = "app-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    SOC2_Control = "CC6.7"
  }
}

resource "aws_iam_role_policy" "app_service" {
  name = "app-service-policy"
  role = aws_iam_role.app_service.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.app_data.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.app_config.arn
      }
    ]
  })
}
```

**MFA Enforcement**
```hcl
# Require MFA for production access
resource "aws_iam_policy" "require_mfa" {
  name        = "RequireMFA"
  description = "Deny all actions without MFA"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyAllExceptListedIfNoMFA"
        Effect = "Deny"
        NotAction = [
          "iam:CreateVirtualMFADevice",
          "iam:EnableMFADevice",
          "iam:GetUser",
          "iam:ListMFADevices",
          "iam:ListVirtualMFADevices",
          "iam:ResyncMFADevice",
          "sts:GetSessionToken"
        ]
        Resource = "*"
        Condition = {
          BoolIfExists = {
            "aws:MultiFactorAuthPresent" = "false"
          }
        }
      }
    ]
  })

  tags = {
    SOC2_Control = "CC6.7"
  }
}
```

**Evidence Collection**
- IAM policy review: `aws iam get-policy-version`
- MFA status: `aws iam list-mfa-devices`
- Role usage: CloudTrail AssumeRole events

---

## CC7: System Operations

### CC7.1 - The entity restricts the transmission, movement, and removal of information

**Control Objective**: Implement network security controls.

#### IaC Implementation

**Network Segmentation**
```hcl
# VPC with public and private subnets
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name         = "main-vpc-${var.environment}"
    SOC2_Control = "CC7.1"
    Environment  = var.environment
  }
}

# Private subnets for data and compute
resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name         = "private-subnet-${count.index + 1}"
    Tier         = "private"
    SOC2_Control = "CC7.1"
  }
}

# Public subnets only for load balancers
resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index + 101}.0/24"
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = false  # Explicit public IP assignment only

  tags = {
    Name         = "public-subnet-${count.index + 1}"
    Tier         = "public"
    SOC2_Control = "CC7.1"
  }
}
```

**Security Groups - Minimal Access**
```hcl
# Application security group - restricted ingress
resource "aws_security_group" "app" {
  name        = "app-sg"
  description = "Application server security group"
  vpc_id      = aws_vpc.main.id

  # Only allow traffic from load balancer
  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "Application traffic from ALB"
  }

  # Allow all outbound (restrict in production if needed)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = {
    Name         = "app-sg"
    SOC2_Control = "CC7.1"
  }
}

# Database security group - no public access
resource "aws_security_group" "database" {
  name        = "database-sg"
  description = "Database security group"
  vpc_id      = aws_vpc.main.id

  # Only allow from application servers
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "PostgreSQL from app servers"
  }

  # No outbound internet access
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "VPC-only outbound"
  }

  tags = {
    Name         = "database-sg"
    SOC2_Control = "CC7.1"
  }
}
```

**Private Endpoints**
```hcl
# S3 VPC Endpoint - no internet routing
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.region}.s3"

  route_table_ids = aws_route_table.private[*].id

  tags = {
    Name         = "s3-endpoint"
    SOC2_Control = "CC7.1"
  }
}

# Secrets Manager VPC Endpoint
resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name         = "secretsmanager-endpoint"
    SOC2_Control = "CC7.1"
  }
}
```

**Evidence Collection**
- VPC configuration: `aws ec2 describe-vpcs`
- Security group rules: `aws ec2 describe-security-groups`
- VPC endpoints: `aws ec2 describe-vpc-endpoints`

---

### CC7.2 - The entity monitors system components

**Control Objective**: Detect and respond to security events and changes.

#### IaC Implementation

**CloudWatch Alarms for Changes**
```hcl
# Alert on security group changes
resource "aws_cloudwatch_event_rule" "security_group_changes" {
  name        = "security-group-changes"
  description = "Alert on security group modifications"

  event_pattern = jsonencode({
    source      = ["aws.ec2"]
    detail-type = ["AWS API Call via CloudTrail"]
    detail = {
      eventName = [
        "AuthorizeSecurityGroupIngress",
        "AuthorizeSecurityGroupEgress",
        "RevokeSecurityGroupIngress",
        "RevokeSecurityGroupEgress",
        "CreateSecurityGroup",
        "DeleteSecurityGroup"
      ]
    }
  })

  tags = {
    SOC2_Control = "CC7.2"
  }
}

resource "aws_cloudwatch_event_target" "security_group_sns" {
  rule      = aws_cloudwatch_event_rule.security_group_changes.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.security_alerts.arn
}

# SNS topic for security alerts
resource "aws_sns_topic" "security_alerts" {
  name              = "security-alerts"
  kms_master_key_id = aws_kms_key.sns.id

  tags = {
    SOC2_Control = "CC7.2"
  }
}
```

**AWS Config for Drift Detection**
```hcl
resource "aws_config_configuration_recorder" "main" {
  name     = "main-recorder"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported = true
    include_global_resource_types = true
  }
}

resource "aws_config_delivery_channel" "main" {
  name           = "main-channel"
  s3_bucket_name = aws_s3_bucket.config.id

  snapshot_delivery_properties {
    delivery_frequency = "TwentyFour_Hours"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Config rule - encryption enabled
resource "aws_config_config_rule" "encrypted_volumes" {
  name = "encrypted-volumes"

  source {
    owner             = "AWS"
    source_identifier = "ENCRYPTED_VOLUMES"
  }

  depends_on = [aws_config_configuration_recorder.main]
}

# Config rule - S3 bucket encryption
resource "aws_config_config_rule" "s3_bucket_server_side_encryption" {
  name = "s3-bucket-server-side-encryption"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}
```

**GuardDuty - Threat Detection**
```hcl
resource "aws_guardduty_detector" "main" {
  enable = true

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
  }

  tags = {
    SOC2_Control = "CC7.2"
  }
}

# GuardDuty findings to SNS
resource "aws_cloudwatch_event_rule" "guardduty_findings" {
  name        = "guardduty-findings"
  description = "GuardDuty findings"

  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
    detail = {
      severity = [7, 8, 9]  # High severity only
    }
  })
}

resource "aws_cloudwatch_event_target" "guardduty_sns" {
  rule      = aws_cloudwatch_event_rule.guardduty_findings.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.security_alerts.arn
}
```

**Evidence Collection**
- Config recorder status: `aws configservice describe-configuration-recorder-status`
- Config rule compliance: `aws configservice describe-compliance-by-config-rule`
- GuardDuty findings: `aws guardduty list-findings`
- CloudWatch alarms: `aws cloudwatch describe-alarms`

---

## A1: Availability

### A1.2 - The entity authorizes, designs, develops or acquires, implements, operates, approves, maintains, and monitors environmental protections

**Control Objective**: Implement high availability and disaster recovery.

#### IaC Implementation

**Multi-AZ Deployment**
```hcl
# RDS with Multi-AZ
resource "aws_db_instance" "main" {
  identifier           = "main-db-${var.environment}"
  engine               = "postgres"
  engine_version       = "15.3"
  instance_class       = "db.t3.medium"
  allocated_storage    = 100
  storage_encrypted    = true
  kms_key_id           = aws_kms_key.rds.arn

  multi_az             = true  # High availability
  backup_retention_period = 30
  backup_window        = "03:00-04:00"
  maintenance_window   = "mon:04:00-mon:05:00"

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  deletion_protection = true  # Prevent accidental deletion

  tags = {
    SOC2_Control = "A1.2"
    Environment  = var.environment
  }
}

# Auto Scaling Group across multiple AZs
resource "aws_autoscaling_group" "app" {
  name                = "app-asg-${var.environment}"
  vpc_zone_identifier = aws_subnet.private[*].id
  min_size            = 2
  max_size            = 10
  desired_capacity    = 3
  health_check_type   = "ELB"
  health_check_grace_period = 300

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  tag {
    key                 = "SOC2_Control"
    value               = "A1.2"
    propagate_at_launch = true
  }
}
```

**Automated Backups**
```hcl
# S3 bucket versioning for data protection
resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id

  versioning_configuration {
    status = "Enabled"
  }
}

# S3 cross-region replication
resource "aws_s3_bucket_replication_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  role   = aws_iam_role.replication.arn

  rule {
    id     = "replicate-all"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.data_replica.arn
      storage_class = "STANDARD_IA"

      encryption_configuration {
        replica_kms_key_id = aws_kms_key.replica.arn
      }
    }
  }
}
```

**Evidence Collection**
- RDS Multi-AZ status: `aws rds describe-db-instances`
- ASG configuration: `aws autoscaling describe-auto-scaling-groups`
- S3 replication status: `aws s3api get-bucket-replication`

---

## Implementation Checklist

### Encryption (CC6.1)
- [ ] All S3 buckets encrypted with KMS
- [ ] All EBS volumes encrypted
- [ ] All RDS instances encrypted
- [ ] KMS key rotation enabled
- [ ] TLS 1.2+ for all load balancers
- [ ] Application-to-database encryption

### Logging (CC6.6)
- [ ] CloudTrail enabled (multi-region, organization-wide)
- [ ] CloudTrail log file validation enabled
- [ ] VPC Flow Logs enabled for all VPCs
- [ ] CloudWatch Logs retention ≥ 90 days
- [ ] Application logging to CloudWatch
- [ ] Log encryption with KMS

### Access Control (CC6.7)
- [ ] IAM policies follow least privilege
- [ ] MFA required for console access
- [ ] Service roles for all applications
- [ ] No long-lived access keys
- [ ] Regular access reviews documented

### Network Security (CC7.1)
- [ ] Private subnets for all data and compute
- [ ] Security groups with minimal rules
- [ ] No databases publicly accessible
- [ ] VPC endpoints for AWS services
- [ ] Network ACLs configured

### Monitoring (CC7.2)
- [ ] AWS Config enabled
- [ ] AWS Config rules for compliance
- [ ] GuardDuty enabled
- [ ] CloudWatch alarms for changes
- [ ] SNS alerts configured
- [ ] Drift detection scheduled

### Availability (A1.2)
- [ ] Multi-AZ deployments
- [ ] Auto Scaling Groups configured
- [ ] Automated backups enabled
- [ ] Cross-region replication for critical data
- [ ] Health checks configured

---

## Evidence Automation

**Terraform Output for Compliance Report**
```hcl
output "soc2_compliance_evidence" {
  description = "SOC2 compliance evidence"
  value = {
    encryption = {
      s3_buckets_encrypted     = [for b in aws_s3_bucket.* : b.id if b.server_side_encryption_configuration != null]
      kms_key_rotation_enabled = [for k in aws_kms_key.* : k.id if k.enable_key_rotation]
      rds_encrypted            = [for db in aws_db_instance.* : db.id if db.storage_encrypted]
    }
    logging = {
      cloudtrail_enabled  = aws_cloudtrail.main.is_multi_region_trail
      vpc_flow_logs       = [for fl in aws_flow_log.* : fl.vpc_id]
      log_retention_days  = [for lg in aws_cloudwatch_log_group.* : lg.retention_in_days]
    }
    network_security = {
      private_subnets         = [for s in aws_subnet.private : s.id]
      security_groups         = [for sg in aws_security_group.* : sg.id]
      vpc_endpoints           = [for e in aws_vpc_endpoint.* : e.service_name]
    }
    monitoring = {
      config_enabled     = aws_config_configuration_recorder.main.id
      guardduty_enabled  = aws_guardduty_detector.main.id
      cloudwatch_alarms  = [for a in aws_cloudwatch_metric_alarm.* : a.alarm_name]
    }
  }
}
```

---

## Annual Review Process

1. **Access Review** (Quarterly)
   - Review IAM users and roles
   - Verify MFA enforcement
   - Audit unused credentials
   - Document access changes

2. **Configuration Review** (Monthly)
   - AWS Config compliance reports
   - Security group rule audit
   - Encryption verification
   - Log retention confirmation

3. **Incident Response Testing** (Quarterly)
   - GuardDuty finding simulation
   - CloudWatch alarm testing
   - Runbook execution
   - Post-incident documentation

4. **Disaster Recovery Testing** (Semi-Annual)
   - Database restore test
   - Cross-region failover
   - Backup verification
   - RTO/RPO validation

---

## References

- [SOC 2 Trust Service Criteria](https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/aicpasoc2report)
- [AWS SOC 2 Compliance](https://aws.amazon.com/compliance/soc/)
- [Azure SOC 2 Compliance](https://docs.microsoft.com/en-us/azure/compliance/offerings/offering-soc-2)
- [GCP SOC 2 Compliance](https://cloud.google.com/security/compliance/soc-2)
