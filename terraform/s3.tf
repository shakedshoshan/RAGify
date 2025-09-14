# Random suffix for S3 bucket name to ensure uniqueness
resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# S3 Bucket for file storage
resource "aws_s3_bucket" "ragify_files" {
  bucket = var.s3_bucket_name != "" ? var.s3_bucket_name : "${var.project_name}-${var.environment}-files-${random_string.bucket_suffix.result}"

  tags = {
    Name        = "${var.project_name}-${var.environment}-files"
    Project     = var.project_name
    Environment = var.environment
  }
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "ragify_files_versioning" {
  bucket = aws_s3_bucket.ragify_files.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Server Side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "ragify_files_encryption" {
  bucket = aws_s3_bucket.ragify_files.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "ragify_files_pab" {
  bucket = aws_s3_bucket.ragify_files.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket Policy
data "aws_iam_policy_document" "s3_bucket_policy" {
  statement {
    sid    = "DenyInsecureConnections"
    effect = "Deny"
    
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    
    actions = ["s3:*"]
    
    resources = [
      aws_s3_bucket.ragify_files.arn,
      "${aws_s3_bucket.ragify_files.arn}/*"
    ]
    
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }

  statement {
    sid    = "AllowApplicationAccess"
    effect = "Allow"
    
    principals {
      type        = "AWS"
      identifiers = [aws_iam_user.ragify_app_user.arn]
    }
    
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

  statement {
    sid    = "AllowECSTaskAccess"
    effect = "Allow"
    
    principals {
      type        = "AWS"
      identifiers = [aws_iam_role.ecs_task_role.arn]
    }
    
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

resource "aws_s3_bucket_policy" "ragify_files_policy" {
  bucket = aws_s3_bucket.ragify_files.id
  policy = data.aws_iam_policy_document.s3_bucket_policy.json
}

# S3 Bucket Lifecycle Configuration
resource "aws_s3_bucket_lifecycle_configuration" "ragify_files_lifecycle" {
  bucket = aws_s3_bucket.ragify_files.id

  rule {
    id     = "delete_old_versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  rule {
    id     = "abort_incomplete_multipart_uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
