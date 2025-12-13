# =============================================================================
# AWS ElastiCache Redis Configuration
# =============================================================================
# Description: Managed Redis cluster for caching and session management
# Best Practices: Cluster mode, automatic failover, encryption, backups
# =============================================================================

# =============================================================================
# ElastiCache Subnet Group
# =============================================================================

resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-redis-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-subnet-group"
  }
}

# =============================================================================
# ElastiCache Parameter Group
# =============================================================================

resource "aws_elasticache_parameter_group" "main" {
  name   = "${var.project_name}-${var.environment}-redis-params"
  family = var.redis_parameter_group_family

  # Memory management
  parameter {
    name  = "maxmemory-policy"
    value = var.redis_maxmemory_policy
  }

  # Persistence
  parameter {
    name  = "appendonly"
    value = var.redis_appendonly ? "yes" : "no"
  }

  # Timeouts
  parameter {
    name  = "timeout"
    value = var.redis_timeout
  }

  # Slow log
  parameter {
    name  = "slowlog-log-slower-than"
    value = var.redis_slowlog_threshold
  }

  parameter {
    name  = "slowlog-max-len"
    value = "128"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-params"
  }
}

# =============================================================================
# ElastiCache Replication Group (Cluster Mode Disabled)
# =============================================================================

resource "aws_elasticache_replication_group" "main" {
  count = var.redis_cluster_mode_enabled ? 0 : 1

  replication_group_id       = "${var.project_name}-${var.environment}-redis"
  replication_group_description = "Redis replication group for ${var.project_name} ${var.environment}"

  # Engine configuration
  engine               = "redis"
  engine_version       = var.redis_engine_version
  node_type            = var.redis_node_type
  num_cache_clusters   = var.redis_num_cache_nodes
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.main.name

  # Network configuration
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.elasticache.id]

  # High availability
  automatic_failover_enabled = var.redis_num_cache_nodes > 1 ? true : false
  multi_az_enabled           = var.redis_multi_az && var.redis_num_cache_nodes > 1 ? true : false

  # Security
  at_rest_encryption_enabled = var.redis_at_rest_encryption_enabled
  transit_encryption_enabled = var.redis_transit_encryption_enabled
  auth_token_enabled         = var.redis_transit_encryption_enabled
  auth_token                 = var.redis_transit_encryption_enabled ? random_password.redis_auth_token[0].result : null
  kms_key_id                 = var.redis_at_rest_encryption_enabled ? var.redis_kms_key_id : null

  # Maintenance and backups
  maintenance_window       = var.redis_maintenance_window
  snapshot_window          = var.redis_snapshot_window
  snapshot_retention_limit = var.redis_snapshot_retention_limit
  final_snapshot_identifier = var.environment == "production" ? "${var.project_name}-${var.environment}-redis-final-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  # Notifications
  notification_topic_arn = var.sns_alarm_topic_arn != "" ? var.sns_alarm_topic_arn : null

  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_engine_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "engine-log"
  }

  # Auto-apply minor version upgrades
  auto_minor_version_upgrade = var.redis_auto_minor_version_upgrade

  # Apply changes immediately in non-production
  apply_immediately = var.environment != "production"

  tags = {
    Name = "${var.project_name}-${var.environment}-redis"
  }

  lifecycle {
    ignore_changes = [
      auth_token,
      final_snapshot_identifier
    ]
  }
}

# =============================================================================
# ElastiCache Cluster (Standalone - for development)
# =============================================================================

resource "aws_elasticache_cluster" "main" {
  count = !var.redis_cluster_mode_enabled && var.environment == "development" && !var.redis_multi_az ? 1 : 0

  cluster_id           = "${var.project_name}-${var.environment}-redis"
  engine               = "redis"
  engine_version       = var.redis_engine_version
  node_type            = var.redis_node_type
  num_cache_nodes      = 1
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.main.name
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.elasticache.id]

  # Maintenance and backups
  maintenance_window       = var.redis_maintenance_window
  snapshot_window          = var.redis_snapshot_window
  snapshot_retention_limit = 1

  # Auto-apply minor version upgrades
  auto_minor_version_upgrade = var.redis_auto_minor_version_upgrade

  # Apply changes immediately
  apply_immediately = true

  tags = {
    Name = "${var.project_name}-${var.environment}-redis"
  }
}

# =============================================================================
# Redis Auth Token
# =============================================================================

resource "random_password" "redis_auth_token" {
  count = var.redis_transit_encryption_enabled ? 1 : 0

  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "redis_auth_token" {
  count = var.redis_transit_encryption_enabled ? 1 : 0

  name                    = "${var.project_name}/${var.environment}/redis/auth-token"
  description             = "Redis auth token for ${var.project_name} ${var.environment}"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-auth-token"
  }
}

resource "aws_secretsmanager_secret_version" "redis_auth_token" {
  count = var.redis_transit_encryption_enabled ? 1 : 0

  secret_id     = aws_secretsmanager_secret.redis_auth_token[0].id
  secret_string = random_password.redis_auth_token[0].result
}

# =============================================================================
# CloudWatch Log Groups
# =============================================================================

resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/${var.project_name}-${var.environment}/slow-log"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-slow-log"
  }
}

resource "aws_cloudwatch_log_group" "redis_engine_log" {
  name              = "/aws/elasticache/${var.project_name}-${var.environment}/engine-log"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-engine-log"
  }
}

# =============================================================================
# CloudWatch Alarms
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = var.redis_cpu_alarm_threshold
  alarm_description   = "This metric monitors Redis CPU utilization"
  alarm_actions       = var.sns_alarm_topic_arn != "" ? [var.sns_alarm_topic_arn] : []

  dimensions = {
    CacheClusterId = var.redis_cluster_mode_enabled ? null : (
      var.environment == "development" && !var.redis_multi_az ?
      aws_elasticache_cluster.main[0].id :
      aws_elasticache_replication_group.main[0].id
    )
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-cpu-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-memory-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = var.redis_memory_alarm_threshold
  alarm_description   = "This metric monitors Redis memory utilization"
  alarm_actions       = var.sns_alarm_topic_arn != "" ? [var.sns_alarm_topic_arn] : []

  dimensions = {
    CacheClusterId = var.redis_cluster_mode_enabled ? null : (
      var.environment == "development" && !var.redis_multi_az ?
      aws_elasticache_cluster.main[0].id :
      aws_elasticache_replication_group.main[0].id
    )
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-memory-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_evictions" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-evictions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Sum"
  threshold           = var.redis_evictions_alarm_threshold
  alarm_description   = "This metric monitors Redis evictions"
  alarm_actions       = var.sns_alarm_topic_arn != "" ? [var.sns_alarm_topic_arn] : []

  dimensions = {
    CacheClusterId = var.redis_cluster_mode_enabled ? null : (
      var.environment == "development" && !var.redis_multi_az ?
      aws_elasticache_cluster.main[0].id :
      aws_elasticache_replication_group.main[0].id
    )
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-evictions-alarm"
  }
}

# =============================================================================
# Outputs
# =============================================================================

output "redis_primary_endpoint" {
  description = "Primary endpoint for the Redis cluster"
  value = var.redis_cluster_mode_enabled ? null : (
    var.environment == "development" && !var.redis_multi_az ?
    aws_elasticache_cluster.main[0].cache_nodes[0].address :
    aws_elasticache_replication_group.main[0].primary_endpoint_address
  )
}

output "redis_reader_endpoint" {
  description = "Reader endpoint for the Redis cluster (if replication group)"
  value = var.redis_cluster_mode_enabled ? null : (
    var.environment == "development" && !var.redis_multi_az ?
    null :
    aws_elasticache_replication_group.main[0].reader_endpoint_address
  )
}

output "redis_port" {
  description = "Port for the Redis cluster"
  value       = 6379
}

output "redis_auth_token_secret_arn" {
  description = "ARN of the Secrets Manager secret containing the Redis auth token"
  value       = var.redis_transit_encryption_enabled ? aws_secretsmanager_secret.redis_auth_token[0].arn : null
}
