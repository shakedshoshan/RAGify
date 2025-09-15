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

# Combined IAM Policy - Only RDS access
data "aws_iam_policy_document" "ragify_app_policy" {
  source_policy_documents = [
    data.aws_iam_policy_document.rds_access.json
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

# ECS-related IAM roles removed for minimal configuration
