# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

# Database Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.ragify_db.endpoint
  sensitive   = true
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.ragify_db.port
}

output "database_name" {
  description = "Name of the database"
  value       = aws_db_instance.ragify_db.db_name
}

output "database_username" {
  description = "Database master username"
  value       = aws_db_instance.ragify_db.username
  sensitive   = true
}

# Database table outputs removed for minimal configuration


# ECS outputs removed for minimal configuration


# IAM Outputs
output "iam_user_name" {
  description = "Name of the IAM user"
  value       = aws_iam_user.ragify_app_user.name
}

output "iam_user_arn" {
  description = "ARN of the IAM user"
  value       = aws_iam_user.ragify_app_user.arn
}

output "iam_access_key_id" {
  description = "Access key ID for the IAM user"
  value       = aws_iam_access_key.ragify_app_user_key.id
  sensitive   = true
}

output "iam_secret_access_key" {
  description = "Secret access key for the IAM user"
  value       = aws_iam_access_key.ragify_app_user_key.secret
  sensitive   = true
}

# ECS role outputs removed for minimal configuration

# Security Group Outputs
output "rds_security_group_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds_sg.id
}
