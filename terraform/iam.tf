# IAM User for RAGify application
resource "aws_iam_user" "ragify_app_user" {
  name = "${var.project_name}-${var.environment}-app-user"

  tags = {
    Name        = "${var.project_name}-${var.environment}-app-user"
    Project     = var.project_name
    Environment = var.environment
  }
}

# IAM Access Key for the user
resource "aws_iam_access_key" "ragify_app_user_key" {
  user = aws_iam_user.ragify_app_user.name
}

# IAM Policy Document for S3 access
data "aws_iam_policy_document" "s3_access" {
  statement {
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket"
    ]
    resources = [
      aws_s3_bucket.ragify_files.arn,
      "${aws_s3_bucket.ragify_files.arn}/*"
    ]
  }
}

# IAM Policy Document for RDS access
data "aws_iam_policy_document" "rds_access" {
  statement {
    effect = "Allow"
    actions = [
      "rds:DescribeDBInstances",
      "rds:DescribeDBClusters"
    ]
    resources = [
      aws_db_instance.ragify_db.arn
    ]
  }
}

# IAM Policy Document for ECS access
data "aws_iam_policy_document" "ecs_access" {
  statement {
    effect = "Allow"
    actions = [
      "ecs:DescribeClusters",
      "ecs:DescribeServices",
      "ecs:DescribeTasks",
      "ecs:ListTasks",
      "ecs:UpdateService"
    ]
    resources = [
      aws_ecs_cluster.ragify_cluster.arn,
      "${aws_ecs_cluster.ragify_cluster.arn}/*"
    ]
  }
}

# Combined IAM Policy
data "aws_iam_policy_document" "ragify_app_policy" {
  source_policy_documents = [
    data.aws_iam_policy_document.s3_access.json,
    data.aws_iam_policy_document.rds_access.json,
    data.aws_iam_policy_document.ecs_access.json
  ]
}

# IAM Policy
resource "aws_iam_policy" "ragify_app_policy" {
  name        = "${var.project_name}-${var.environment}-app-policy"
  description = "Policy for RAGify application with least privilege access"
  policy      = data.aws_iam_policy_document.ragify_app_policy.json

  tags = {
    Name        = "${var.project_name}-${var.environment}-app-policy"
    Project     = var.project_name
    Environment = var.environment
  }
}

# Attach Policy to User
resource "aws_iam_user_policy_attachment" "ragify_app_policy_attachment" {
  user       = aws_iam_user.ragify_app_user.name
  policy_arn = aws_iam_policy.ragify_app_policy.arn
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.project_name}-${var.environment}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-ecs-task-execution-role"
    Project     = var.project_name
    Environment = var.environment
  }
}

# Attach AWS managed policy for ECS task execution
resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM Role for ECS Tasks
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.project_name}-${var.environment}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-ecs-task-role"
    Project     = var.project_name
    Environment = var.environment
  }
}

# Attach application policy to ECS task role
resource "aws_iam_role_policy_attachment" "ecs_task_role_policy" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.ragify_app_policy.arn
}
