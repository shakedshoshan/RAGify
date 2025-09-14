# RAGify AWS Infrastructure

This Terraform configuration provisions the foundational AWS cloud infrastructure for the RAGify project, including VPC, RDS PostgreSQL database, S3 storage, ECS cluster, and IAM resources.

## Architecture Overview

The infrastructure includes:

- **VPC**: Isolated network with public and private subnets across multiple AZs
- **RDS PostgreSQL**: Database instance in private subnet for secure data storage
- **S3 Bucket**: Encrypted storage for uploaded files (PDFs, DOCX, etc.)
- **ECS Cluster**: Container orchestration platform using Fargate
- **IAM**: Least privilege access controls for application resources
- **ALB**: Application Load Balancer for high availability
- **Security Groups**: Network-level security controls

## Prerequisites

1. **AWS CLI**: Install and configure with appropriate credentials
   ```bash
   aws configure
   ```

2. **Terraform**: Install Terraform (>= 1.0)
   ```bash
   # On macOS with Homebrew
   brew install terraform
   
   # On Windows with Chocolatey
   choco install terraform
   
   # On Linux
   wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
   unzip terraform_1.6.0_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   ```

3. **AWS Permissions**: Ensure your AWS credentials have permissions for:
   - VPC management (vpc:*, ec2:*)
   - RDS management (rds:*)
   - S3 management (s3:*)
   - ECS management (ecs:*)
   - IAM management (iam:*)
   - CloudWatch Logs (logs:*)

## Quick Start

1. **Clone and Navigate**
   ```bash
   cd terraform
   ```

2. **Configure Variables**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your specific values
   ```

3. **Initialize Terraform**
   ```bash
   terraform init
   ```

4. **Plan Infrastructure**
   ```bash
   terraform plan
   ```

5. **Deploy Infrastructure**
   ```bash
   terraform apply
   ```

6. **View Outputs**
   ```bash
   terraform output
   ```

## Configuration

### Required Variables

Edit `terraform.tfvars` with your desired configuration:

```hcl
# AWS Configuration
aws_region = "us-west-2"

# Project Configuration
project_name = "ragify"
environment  = "dev"

# Database Configuration
db_username = "ragify_admin"
db_password = "your-secure-password-here"  # Use a strong password!

# Optional: Custom S3 bucket name (will auto-generate if empty)
s3_bucket_name = ""
```

### Network Configuration

The default network setup creates:
- VPC: `10.0.0.0/16`
- Public Subnets: `10.0.1.0/24`, `10.0.2.0/24`
- Private Subnets: `10.0.10.0/24`, `10.0.20.0/24`

You can customize these in `terraform.tfvars`:

```hcl
vpc_cidr               = "10.0.0.0/16"
public_subnet_cidrs    = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs   = ["10.0.10.0/24", "10.0.20.0/24"]
```

## Key Outputs

After deployment, you'll get important connection details:

```bash
# Database connection
terraform output rds_endpoint
terraform output database_name

# S3 bucket for file storage
terraform output s3_bucket_name

# ECS cluster for application deployment
terraform output ecs_cluster_name
terraform output alb_dns_name

# IAM credentials (sensitive - handle securely)
terraform output iam_access_key_id
terraform output iam_secret_access_key
```

## Security Features

- **Network Isolation**: Database and application servers in private subnets
- **Encryption**: S3 bucket encryption enabled, RDS encryption enabled
- **Access Control**: IAM policies follow principle of least privilege
- **Secure Transport**: S3 bucket policy enforces HTTPS connections
- **Public Access Blocking**: S3 bucket blocks all public access

## Cost Optimization

The configuration uses cost-effective resources suitable for development:

- **RDS**: `db.t3.micro` instance (eligible for free tier)
- **ECS**: Fargate with minimal capacity
- **S3**: Standard storage class with lifecycle policies
- **NAT Gateway**: Single NAT Gateway (consider multiple for production)

## Environment Variables for Application

Set these environment variables in your application:

```bash
# Database
DATABASE_URL="postgresql://username:password@endpoint:5432/database_name"
DB_HOST="<rds_endpoint>"
DB_PORT="5432"
DB_NAME="<database_name>"
DB_USERNAME="<database_username>"
DB_PASSWORD="<your_password>"

# AWS Credentials
AWS_ACCESS_KEY_ID="<iam_access_key_id>"
AWS_SECRET_ACCESS_KEY="<iam_secret_access_key>"
AWS_REGION="<aws_region>"

# S3
S3_BUCKET_NAME="<s3_bucket_name>"

# ECS
ECS_CLUSTER_NAME="<ecs_cluster_name>"
```

## Next Steps

After infrastructure deployment:

1. **Connect Application**: Update your backend application with the database and S3 credentials
2. **Deploy Containers**: Create ECS task definitions and services for your application
3. **Domain Setup**: Configure Route 53 and SSL certificates for production
4. **Monitoring**: Set up CloudWatch alarms and dashboards
5. **CI/CD**: Implement deployment pipelines using the ECS cluster

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

⚠️ **Warning**: This will permanently delete all resources including the database and S3 bucket contents.

## File Structure

```
terraform/
├── main.tf                 # Provider configuration
├── variables.tf            # Variable definitions
├── vpc.tf                  # VPC, subnets, gateways
├── rds.tf                  # PostgreSQL database
├── s3.tf                   # S3 bucket and policies
├── ecs.tf                  # ECS cluster and load balancer
├── iam.tf                  # IAM users, roles, and policies
├── outputs.tf              # Output values
├── terraform.tfvars.example # Example configuration
└── README.md               # This file
```

## Troubleshooting

### Common Issues

1. **Insufficient Permissions**
   ```
   Error: AccessDenied: User is not authorized to perform: iam:CreateUser
   ```
   Solution: Ensure your AWS credentials have the required permissions listed in Prerequisites.

2. **Resource Already Exists**
   ```
   Error: resource already exists
   ```
   Solution: Check for existing resources with the same name or use different variable values.

3. **Database Password Requirements**
   ```
   Error: InvalidParameterValue: The parameter MasterUserPassword is not a valid password
   ```
   Solution: Use a password with at least 8 characters, including uppercase, lowercase, and numbers.

### Getting Help

- Check Terraform logs: `TF_LOG=DEBUG terraform apply`
- Validate configuration: `terraform validate`
- Format code: `terraform fmt`
- View state: `terraform show`

## Security Considerations

- Store `terraform.tfvars` securely and never commit to version control
- Use AWS Secrets Manager for production database passwords
- Enable MFA on AWS accounts
- Regularly rotate IAM access keys
- Monitor AWS CloudTrail for unusual activity
- Consider using Terraform Cloud for state management in production

## Production Readiness Checklist

Before using in production:

- [ ] Enable multi-AZ deployment for RDS
- [ ] Set up automated backups and monitoring
- [ ] Configure SSL/TLS certificates
- [ ] Implement proper logging and monitoring
- [ ] Set up disaster recovery procedures
- [ ] Enable AWS Config for compliance
- [ ] Review and harden security groups
- [ ] Implement network ACLs if needed
- [ ] Set up VPC Flow Logs
- [ ] Configure AWS WAF if using web applications
