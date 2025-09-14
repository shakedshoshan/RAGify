# Configure the AWS Provider
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.4"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Data source to get availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# Data source to get current caller identity
data "aws_caller_identity" "current" {}
