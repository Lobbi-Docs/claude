# Cost Optimization Strategies for Infrastructure as Code

## Overview

This document provides comprehensive strategies for optimizing cloud infrastructure costs using Infrastructure as Code. It covers tagging for cost allocation, right-sizing, reserved capacity, spot instances, storage optimization, and FinOps integration.

---

## Cost Optimization Principles

### 1. Visibility
- Tag 100% of resources for cost allocation
- Monitor spending in real-time
- Set up billing alerts and budgets
- Regular cost review meetings

### 2. Right-Sizing
- Start small, scale based on metrics
- Regular utilization reviews
- Auto-scaling for variable workloads
- Shutdown non-production during off-hours

### 3. Reserved Capacity
- Commit to stable workloads
- Use savings plans for flexibility
- Regular reservation utilization review
- Right reservation type for workload

### 4. Waste Elimination
- Delete unused resources
- Consolidate underutilized resources
- Use spot/preemptible for fault-tolerant
- Archive old data to cheaper storage

### 5. Continuous Optimization
- Automated cost anomaly detection
- Regular architecture reviews
- Stay current with new cost-effective services
- Foster cost-aware culture

---

## Tagging for Cost Allocation

### Required Cost Tags

```hcl
locals {
  cost_allocation_tags = {
    # Business unit or team
    CostCenter = var.cost_center

    # Environment (affects shutdown schedules)
    Environment = var.environment

    # Application for chargeback
    Application = var.application

    # Team owner for accountability
    Owner = var.owner

    # Project for budget tracking
    Project = var.project

    # Optional: Budget code
    BudgetCode = var.budget_code
  }
}
```

### Enable Cost Allocation Tags (AWS)

```hcl
# Activate cost allocation tags
resource "aws_ce_cost_allocation_tag" "tags" {
  for_each = toset([
    "CostCenter",
    "Environment",
    "Application",
    "Owner",
    "Project"
  ])

  tag_key = each.value
  status  = "Active"
}
```

### Cost and Usage Report (AWS)

```hcl
# S3 bucket for CUR
resource "aws_s3_bucket" "cur" {
  bucket = "cost-usage-report-${var.account_id}"

  lifecycle_rule {
    enabled = true

    transition {
      days          = 30
      storage_class = "INTELLIGENT_TIERING"
    }

    expiration {
      days = 365
    }
  }

  tags = merge(
    local.cost_allocation_tags,
    {
      Purpose = "cost-reporting"
    }
  )
}

# Cost and Usage Report
resource "aws_cur_report_definition" "main" {
  report_name                = "cost-usage-report"
  time_unit                  = "HOURLY"
  format                     = "Parquet"
  compression                = "Parquet"
  additional_schema_elements = ["RESOURCES"]
  s3_bucket                  = aws_s3_bucket.cur.id
  s3_region                  = var.region
  s3_prefix                  = "cur"
  report_versioning          = "OVERWRITE_REPORT"

  additional_artifacts = [
    "ATHENA",
  ]
}
```

---

## Budgets and Alerts

### Cost Budget with Alerts

```hcl
# Overall monthly budget
resource "aws_budgets_budget" "monthly" {
  name         = "monthly-budget"
  budget_type  = "COST"
  limit_amount = var.monthly_budget
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # Alert at 80% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.finance_team_emails
  }

  # Alert at 100% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = concat(var.finance_team_emails, var.leadership_emails)
  }

  # Forecast alert at 100%
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.finance_team_emails
  }
}

# Per-environment budgets
resource "aws_budgets_budget" "environment" {
  for_each = var.environment_budgets

  name         = "${each.key}-budget"
  budget_type  = "COST"
  limit_amount = each.value
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name = "TagKeyValue"
    values = [
      "Environment$${each.key}"
    ]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 90
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.team_leads[each.key]]
  }
}

# Per-application budgets
resource "aws_budgets_budget" "application" {
  for_each = var.application_budgets

  name         = "${each.key}-app-budget"
  budget_type  = "COST"
  limit_amount = each.value
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name = "TagKeyValue"
    values = [
      "Application$${each.key}"
    ]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 85
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.app_owners[each.key]]
  }
}
```

### Cost Anomaly Detection

```hcl
# Anomaly detection monitor
resource "aws_ce_anomaly_monitor" "service" {
  name              = "service-anomaly-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"
}

# Anomaly subscription
resource "aws_ce_anomaly_subscription" "realtime" {
  name      = "realtime-anomaly-alerts"
  frequency = "IMMEDIATE"

  monitor_arn_list = [
    aws_ce_anomaly_monitor.service.arn,
  ]

  subscriber {
    type    = "EMAIL"
    address = var.finops_team_email
  }

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      values        = ["100"]  # Alert on $100+ anomalies
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }
}
```

---

## Right-Sizing Strategies

### Auto-Scaling Groups

```hcl
# Auto-scaling based on CPU and memory
resource "aws_autoscaling_group" "app" {
  name                = "app-asg-${var.environment}"
  vpc_zone_identifier = var.subnet_ids
  target_group_arns   = [aws_lb_target_group.app.arn]

  # Start small
  min_size         = var.environment == "prod" ? 2 : 1
  max_size         = var.environment == "prod" ? 20 : 5
  desired_capacity = var.environment == "prod" ? 3 : 1

  health_check_type         = "ELB"
  health_check_grace_period = 300

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  # Cost-optimized instance types
  mixed_instances_policy {
    instances_distribution {
      on_demand_base_capacity                  = var.environment == "prod" ? 2 : 0
      on_demand_percentage_above_base_capacity = var.environment == "prod" ? 50 : 0
      spot_allocation_strategy                 = "capacity-optimized"
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.app.id
        version            = "$Latest"
      }

      # Multiple instance types for flexibility
      dynamic "override" {
        for_each = var.instance_types
        content {
          instance_type     = override.value
          weighted_capacity = "1"
        }
      }
    }
  }

  tag {
    key                 = "Name"
    value               = "app-${var.environment}"
    propagate_at_launch = true
  }

  tag {
    key                 = "CostOptimization"
    value               = "auto-scaling"
    propagate_at_launch = true
  }
}

# CPU-based scaling
resource "aws_autoscaling_policy" "cpu" {
  name                   = "cpu-scaling"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

# Memory-based scaling (requires CloudWatch agent)
resource "aws_autoscaling_policy" "memory" {
  name                   = "memory-scaling"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    customized_metric_specification {
      metric_dimension {
        name  = "AutoScalingGroupName"
        value = aws_autoscaling_group.app.name
      }
      metric_name = "MemoryUtilization"
      namespace   = "CWAgent"
      statistic   = "Average"
    }
    target_value = 80.0
  }
}
```

### Scheduled Scaling for Non-Production

```hcl
# Shutdown non-prod environments during off-hours
resource "aws_autoscaling_schedule" "scale_down_evening" {
  count = var.environment != "prod" ? 1 : 0

  scheduled_action_name  = "scale-down-evening"
  autoscaling_group_name = aws_autoscaling_group.app.name
  recurrence             = "0 19 * * 1-5"  # 7 PM weekdays
  min_size               = 0
  max_size               = 0
  desired_capacity       = 0
}

resource "aws_autoscaling_schedule" "scale_up_morning" {
  count = var.environment != "prod" ? 1 : 0

  scheduled_action_name  = "scale-up-morning"
  autoscaling_group_name = aws_autoscaling_group.app.name
  recurrence             = "0 7 * * 1-5"  # 7 AM weekdays
  min_size               = 1
  max_size               = 5
  desired_capacity       = 1
}
```

---

## Reserved Capacity

### EC2 Reserved Instances

```hcl
# Reserved instance for stable workloads
resource "aws_ec2_capacity_reservation" "database" {
  count = var.environment == "prod" ? 1 : 0

  instance_type     = "m6i.2xlarge"
  instance_platform = "Linux/UNIX"
  availability_zone = var.availability_zones[0]
  instance_count    = 2

  instance_match_criteria = "targeted"

  tags = merge(
    local.cost_allocation_tags,
    {
      Name               = "database-reserved-capacity"
      CostOptimization   = "reserved-instance"
      ReservationType    = "1-year-no-upfront"
    }
  )
}
```

### RDS Reserved Instances

```hcl
# Note: Reserved RDS instances are purchased via console/API, not Terraform
# Document the reservation strategy in code

variable "rds_reservation_strategy" {
  description = "RDS reservation strategy documentation"
  type        = object({
    instance_class    = string
    instance_count    = number
    term              = string
    offering_type     = string
    estimated_savings = string
  })

  default = {
    instance_class    = "db.r6g.2xlarge"
    instance_count    = 2
    term              = "1yr"
    offering_type     = "All Upfront"
    estimated_savings = "40%"
  }
}

# RDS instance configured for reservation
resource "aws_db_instance" "main" {
  identifier     = "main-db-${var.environment}"
  instance_class = var.rds_reservation_strategy.instance_class

  tags = merge(
    local.cost_allocation_tags,
    {
      ReservationEligible = "true"
      ReservationPlan     = "${var.rds_reservation_strategy.term}-${var.rds_reservation_strategy.offering_type}"
    }
  )
}
```

### Savings Plans

```hcl
# Compute Savings Plan (more flexible than RIs)
# Note: Purchased via console, documented here

variable "savings_plan" {
  description = "Compute savings plan configuration"
  type        = object({
    commitment_amount = number
    term              = string
    payment_option    = string
    plan_type         = string
  })

  default = {
    commitment_amount = 50  # $50/hour
    term              = "1yr"
    payment_option    = "All Upfront"
    plan_type         = "Compute"  # or "EC2Instance"
  }
}
```

---

## Spot and Preemptible Instances

### Spot Instances for Batch Processing

```hcl
# Spot fleet for batch jobs
resource "aws_spot_fleet_request" "batch" {
  iam_fleet_role  = aws_iam_role.spot_fleet.arn
  target_capacity = var.batch_capacity

  allocation_strategy              = "lowestPrice"
  instance_interruption_behaviour  = "terminate"
  fleet_type                       = "maintain"
  replace_unhealthy_instances      = true
  terminate_instances_with_expiration = true
  wait_for_fulfillment             = false

  # Multiple instance types for better availability
  launch_specification {
    instance_type          = "c6i.2xlarge"
    ami                    = var.batch_ami_id
    spot_price            = "0.15"  # Max price
    subnet_id             = var.subnet_ids[0]
    vpc_security_group_ids = [aws_security_group.batch.id]
    iam_instance_profile_arn = aws_iam_instance_profile.batch.arn

    tags = merge(
      local.cost_allocation_tags,
      {
        Name             = "batch-worker"
        CostOptimization = "spot-instance"
        Workload         = "batch-processing"
      }
    )
  }

  launch_specification {
    instance_type          = "c6a.2xlarge"
    ami                    = var.batch_ami_id
    spot_price            = "0.14"
    subnet_id             = var.subnet_ids[1]
    vpc_security_group_ids = [aws_security_group.batch.id]
    iam_instance_profile_arn = aws_iam_instance_profile.batch.arn

    tags = merge(
      local.cost_allocation_tags,
      {
        Name             = "batch-worker"
        CostOptimization = "spot-instance"
        Workload         = "batch-processing"
      }
    )
  }
}
```

### Mixed On-Demand and Spot

```hcl
# ASG with mixed instances (already shown above)
# 50% on-demand for stability, 50% spot for cost savings

variable "instance_types" {
  description = "Instance types prioritized by cost"
  type        = list(string)
  default = [
    "t3a.medium",   # Cheapest AMD
    "t3.medium",    # Intel alternative
    "t2.medium",    # Older generation fallback
  ]
}
```

---

## Storage Optimization

### S3 Lifecycle Policies

```hcl
resource "aws_s3_bucket" "data" {
  bucket = "data-${var.environment}-${var.account_id}"

  tags = merge(
    local.cost_allocation_tags,
    {
      DataClassification = "internal"
      CostOptimization   = "lifecycle-policy"
    }
  )
}

# Intelligent tiering for unknown access patterns
resource "aws_s3_bucket_lifecycle_configuration" "data_intelligent" {
  bucket = aws_s3_bucket.data.id

  rule {
    id     = "intelligent-tiering"
    status = "Enabled"

    transition {
      days          = 0
      storage_class = "INTELLIGENT_TIERING"
    }
  }

  rule {
    id     = "archive-old-data"
    status = "Enabled"

    # Objects not accessed in 90 days → Glacier
    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Objects not accessed in 365 days → Deep Archive
    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }

    # Delete after 7 years (compliance requirement)
    expiration {
      days = 2555
    }
  }

  rule {
    id     = "cleanup-incomplete-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}
```

### EBS Volume Optimization

```hcl
# Use gp3 instead of gp2 (cheaper, better performance)
resource "aws_ebs_volume" "data" {
  availability_zone = var.availability_zone
  size              = var.volume_size

  type       = "gp3"  # 20% cheaper than gp2
  iops       = var.required_iops
  throughput = var.required_throughput

  encrypted  = true
  kms_key_id = aws_kms_key.ebs.arn

  tags = merge(
    local.cost_allocation_tags,
    {
      Name             = "data-volume"
      CostOptimization = "gp3"
    }
  )
}

# Delete EBS volumes on instance termination
resource "aws_launch_template" "app" {
  name_prefix = "app-"
  image_id    = var.ami_id

  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size           = 20
      volume_type           = "gp3"
      delete_on_termination = true  # Don't leave orphaned volumes
      encrypted             = true
    }
  }
}
```

### EBS Snapshot Cleanup

```hcl
# Lambda function to delete old snapshots
resource "aws_lambda_function" "snapshot_cleanup" {
  filename      = "snapshot_cleanup.zip"
  function_name = "ebs-snapshot-cleanup"
  role          = aws_iam_role.snapshot_cleanup.arn
  handler       = "index.handler"
  runtime       = "python3.11"

  environment {
    variables = {
      RETENTION_DAYS = "30"
      DRY_RUN        = "false"
    }
  }

  tags = merge(
    local.cost_allocation_tags,
    {
      CostOptimization = "snapshot-cleanup"
    }
  )
}

# Daily schedule
resource "aws_cloudwatch_event_rule" "snapshot_cleanup" {
  name                = "snapshot-cleanup-daily"
  schedule_expression = "cron(0 2 * * ? *)"  # 2 AM daily
}

resource "aws_cloudwatch_event_target" "snapshot_cleanup" {
  rule      = aws_cloudwatch_event_rule.snapshot_cleanup.name
  target_id = "lambda"
  arn       = aws_lambda_function.snapshot_cleanup.arn
}
```

---

## Network Cost Optimization

### VPC Endpoints (Avoid NAT Gateway Costs)

```hcl
# S3 Gateway Endpoint (free)
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.region}.s3"

  route_table_ids = aws_route_table.private[*].id

  tags = merge(
    local.cost_allocation_tags,
    {
      CostOptimization = "avoid-nat-charges"
    }
  )
}

# DynamoDB Gateway Endpoint (free)
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.region}.dynamodb"

  route_table_ids = aws_route_table.private[*].id

  tags = merge(
    local.cost_allocation_tags,
    {
      CostOptimization = "avoid-nat-charges"
    }
  )
}

# Interface endpoints for other services (paid but cheaper than NAT)
resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = merge(
    local.cost_allocation_tags,
    {
      CostOptimization = "reduce-nat-usage"
    }
  )
}
```

### NAT Gateway Optimization

```hcl
# Single NAT Gateway for non-prod (not HA but cheaper)
resource "aws_nat_gateway" "main" {
  count = var.environment == "prod" ? length(var.availability_zones) : 1

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(
    local.cost_allocation_tags,
    {
      Name             = "nat-${count.index + 1}"
      CostOptimization = var.environment == "prod" ? "ha-required" : "single-nat"
    }
  )
}
```

---

## Database Cost Optimization

### RDS Storage Auto-Scaling

```hcl
resource "aws_db_instance" "main" {
  identifier     = "main-db-${var.environment}"
  instance_class = var.db_instance_class

  allocated_storage     = 100
  max_allocated_storage = 1000  # Auto-scale up to 1TB

  storage_type      = "gp3"  # Cheaper than io1
  storage_encrypted = true

  tags = merge(
    local.cost_allocation_tags,
    {
      CostOptimization = "auto-scaling-storage"
    }
  )
}
```

### Aurora Serverless v2

```hcl
resource "aws_rds_cluster" "aurora" {
  count = var.environment != "prod" ? 1 : 0

  cluster_identifier = "aurora-${var.environment}"
  engine             = "aurora-postgresql"
  engine_mode        = "provisioned"
  engine_version     = "15.3"

  serverlessv2_scaling_configuration {
    min_capacity = 0.5   # Min ACUs
    max_capacity = 16    # Max ACUs
  }

  tags = merge(
    local.cost_allocation_tags,
    {
      CostOptimization = "serverless-v2"
    }
  )
}

resource "aws_rds_cluster_instance" "aurora" {
  count = var.environment != "prod" ? 1 : 0

  identifier         = "aurora-instance-${var.environment}"
  cluster_identifier = aws_rds_cluster.aurora[0].id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.aurora[0].engine
  engine_version     = aws_rds_cluster.aurora[0].engine_version
}
```

---

## Container Cost Optimization

### Fargate Spot

```hcl
resource "aws_ecs_service" "app" {
  name            = "app-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 100
    base              = 0
  }

  # Fallback to on-demand if spot unavailable
  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 0
    base              = 1
  }

  tags = merge(
    local.cost_allocation_tags,
    {
      CostOptimization = "fargate-spot"
    }
  )
}
```

---

## FinOps Integration

### Cost Optimization Lambda

```python
# lambda/cost_optimizer.py
import boto3
from datetime import datetime, timedelta

def lambda_handler(event, context):
    """Identify cost optimization opportunities"""

    ec2 = boto3.client('ec2')
    cloudwatch = boto3.client('cloudwatch')

    recommendations = []

    # Find idle EC2 instances
    instances = ec2.describe_instances(
        Filters=[{'Name': 'instance-state-name', 'Values': ['running']}]
    )

    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            instance_id = instance['InstanceId']

            # Check CPU utilization
            cpu_stats = cloudwatch.get_metric_statistics(
                Namespace='AWS/EC2',
                MetricName='CPUUtilization',
                Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
                StartTime=datetime.now() - timedelta(days=7),
                EndTime=datetime.now(),
                Period=86400,
                Statistics=['Average']
            )

            avg_cpu = sum([d['Average'] for d in cpu_stats['Datapoints']]) / len(cpu_stats['Datapoints']) if cpu_stats['Datapoints'] else 0

            if avg_cpu < 5:
                recommendations.append({
                    'resource': instance_id,
                    'type': 'EC2_IDLE',
                    'recommendation': 'Consider stopping or downsizing',
                    'avg_cpu': avg_cpu
                })

    return {
        'statusCode': 200,
        'recommendations': recommendations
    }
```

---

## Cost Optimization Checklist

### Compute
- [ ] Use auto-scaling for variable workloads
- [ ] Implement scheduled shutdown for non-prod
- [ ] Use spot instances for fault-tolerant workloads
- [ ] Right-size instances based on metrics
- [ ] Purchase reserved instances for stable workloads
- [ ] Consider Savings Plans for flexibility
- [ ] Use ARM instances (Graviton) where possible

### Storage
- [ ] Implement S3 lifecycle policies
- [ ] Use Intelligent Tiering for unknown patterns
- [ ] Delete old snapshots and AMIs
- [ ] Use gp3 instead of gp2 for EBS
- [ ] Enable EBS volume deletion on termination
- [ ] Use S3 Standard-IA for infrequent access

### Database
- [ ] Enable storage auto-scaling
- [ ] Use Aurora Serverless for variable workloads
- [ ] Delete old automated backups
- [ ] Use read replicas only when needed
- [ ] Consider RDS reserved instances
- [ ] Use Multi-AZ only in production

### Network
- [ ] Use VPC endpoints instead of NAT Gateway
- [ ] Single NAT Gateway for non-prod
- [ ] Use CloudFront for static content
- [ ] Optimize data transfer between regions
- [ ] Use Direct Connect for large data transfers

### Monitoring
- [ ] Set up billing alerts
- [ ] Enable Cost Anomaly Detection
- [ ] Review Cost Explorer monthly
- [ ] Tag 100% of resources
- [ ] Implement automated cost reports
- [ ] Regular right-sizing reviews
