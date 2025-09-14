import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials are required. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file.');
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME') || 'ragify-text-storage';
    
    console.log(`S3Service initialized with bucket: ${this.bucketName} in region: ${region}`);
  }

  async uploadText(name: string, text: string): Promise<string> {
    const key = `texts/${Date.now()}-${name}.txt`;
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: text,
      ContentType: 'text/plain',
    });

    try {
      await this.s3Client.send(command);
      return key;
    } catch (error) {
      throw new Error(`Failed to upload text to S3: ${error.message}`);
    }
  }
}
