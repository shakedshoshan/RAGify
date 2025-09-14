import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { TextPayloadDto } from '../dto/text-payload.dto';
import { S3Service } from '../services/s3.service';

@Controller('text')
export class TextController {
  constructor(private readonly s3Service: S3Service) {}

  @Post()
  async uploadText(@Body(new ValidationPipe()) textPayload: TextPayloadDto) {
    try {
      const s3Key = await this.s3Service.uploadText(
        textPayload.name,
        textPayload.text,
      );

      return {
        success: true,
        message: 'Text uploaded successfully',
        data: {
          name: textPayload.name,
          s3Key,
          uploadedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to upload text',
        error: error.message,
      };
    }
  }
}
