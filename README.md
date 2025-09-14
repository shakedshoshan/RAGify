# RAGify

A modern RAG (Retrieval-Augmented Generation) application built with NestJS backend and deployed on AWS infrastructure using Terraform.

## 🚀 Overview

RAGify is a scalable document processing and question-answering system that leverages RAG technology to provide intelligent responses based on your document corpus. The application is designed for production use with enterprise-grade infrastructure.

## 🏗️ Architecture

The project consists of two main components:

### Backend (NestJS)
- **Framework**: NestJS with TypeScript
- **Port**: 3000
- **Features**: RESTful API, health checks, document processing
- **Deployment**: Containerized and deployed on AWS ECS Fargate

### Infrastructure (Terraform)
- **Cloud Provider**: AWS
- **Compute**: ECS Fargate with Application Load Balancer
- **Database**: RDS PostgreSQL
- **Storage**: S3 bucket for file storage
- **Networking**: VPC with public/private subnets
- **Security**: IAM roles, security groups, encrypted storage

## 📁 Project Structure

```
RAGify/
├── backend/                 # NestJS application
│   ├── src/                # Source code
│   ├── test/               # Test files
│   ├── dist/               # Compiled JavaScript
│   └── package.json        # Dependencies and scripts
├── terraform/              # Infrastructure as Code
│   ├── main.tf            # Main configuration
│   ├── vpc.tf             # VPC and networking
│   ├── ecs.tf             # ECS and load balancer
│   ├── rds.tf             # Database configuration
│   ├── s3.tf              # File storage
│   ├── iam.tf             # IAM roles and policies
│   └── variables.tf       # Configuration variables
└── README.md              # This file
```

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Terraform** (v1.0 or higher)
- **AWS CLI** (configured with appropriate credentials)
- **Docker** (for containerization)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/shakedshoshan/RAGify.git
cd RAGify
```

### 2. Backend Setup

```bash
cd backend
npm install
npm run build
```

### 3. Infrastructure Deployment

```bash
cd ../terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your configuration
terraform init
terraform plan
terraform apply
```

### 4. Run the Application

#### Development Mode
```bash
cd backend
npm run dev
```

#### Production Mode
```bash
cd backend
npm run build
npm run start:prod
```

## 🔧 Configuration

### Backend Configuration

The backend uses environment variables for configuration. Create a `.env` file in the `backend` directory:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://username:password@host:port/database
AWS_REGION=us-west-2
S3_BUCKET_NAME=your-bucket-name
```

### Terraform Configuration

Copy `terraform.tfvars.example` to `terraform.tfvars` and customize:

```hcl
aws_region      = "us-west-2"
project_name    = "ragify"
environment     = "dev"
vpc_cidr        = "10.0.0.0/16"
db_username     = "ragify_admin"
db_password     = "your-secure-password"
s3_bucket_name  = "your-unique-bucket-name"
```

## 🏗️ Infrastructure Details

### AWS Resources Created

- **VPC**: Custom VPC with public and private subnets across 2 AZs
- **ECS Cluster**: Fargate cluster for containerized applications
- **Application Load Balancer**: Internet-facing ALB with health checks
- **RDS PostgreSQL**: Managed database with encryption and backups
- **S3 Bucket**: Encrypted file storage with lifecycle policies
- **IAM Roles**: Least-privilege access for ECS tasks and S3
- **CloudWatch**: Logging and monitoring

### Security Features

- ✅ VPC with private subnets for database
- ✅ Security groups with minimal required access
- ✅ Encrypted RDS storage
- ✅ S3 bucket encryption
- ✅ IAM roles with least privilege
- ✅ No public database access

## 📊 API Endpoints

The backend provides the following endpoints:

- `GET /` - Welcome message
- `GET /health` - Health check endpoint
- `POST /api/documents` - Upload documents for processing
- `GET /api/documents` - List uploaded documents
- `POST /api/query` - Query the document corpus
- `DELETE /api/documents/:id` - Delete a document

## 🧪 Testing

Run the test suite:

```bash
cd backend
npm test              # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:cov      # Coverage report
```

## 🚀 Deployment

### Using Terraform

1. **Plan the deployment**:
   ```bash
   cd terraform
   terraform plan
   ```

2. **Deploy the infrastructure**:
   ```bash
   terraform apply
   ```

3. **Get the ALB URL**:
   ```bash
   terraform output alb_dns_name
   ```

### Manual Deployment

1. Build the Docker image:
   ```bash
   docker build -t ragify-backend ./backend
   ```

2. Tag and push to ECR:
   ```bash
   aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-west-2.amazonaws.com
   docker tag ragify-backend:latest <account-id>.dkr.ecr.us-west-2.amazonaws.com/ragify-backend:latest
   docker push <account-id>.dkr.ecr.us-west-2.amazonaws.com/ragify-backend:latest
   ```

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Application port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `AWS_REGION` | AWS region | `us-west-2` |
| `S3_BUCKET_NAME` | S3 bucket for file storage | Required |

## 🔍 Monitoring

The application includes:

- **Health checks** at `/health`
- **CloudWatch logs** for application monitoring
- **ECS service metrics** for container health
- **ALB metrics** for load balancer performance

## 🛡️ Security Considerations

- Database is in private subnets
- S3 bucket has public access blocked
- IAM roles follow least privilege principle
- All data is encrypted at rest
- Security groups restrict network access

## 📚 Documentation

- [NestJS Documentation](https://docs.nestjs.com/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/shakedshoshan/RAGify/issues) page
2. Create a new issue with detailed information
3. Contact the maintainers

## 🔄 Version History

- **v1.0.0** - Initial release with basic RAG functionality
- **v1.1.0** - Added AWS infrastructure with Terraform
- **v1.2.0** - Enhanced security and monitoring

---

**Built with ❤️ using NestJS, AWS, and Terraform**
