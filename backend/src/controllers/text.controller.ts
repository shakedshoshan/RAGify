import { Body, Controller, Post } from '@nestjs/common';
import { TextPayloadDto } from '../dto/text-payload.dto';
import { FirestoreService } from '../services/firestore.service';

@Controller('text')
export class TextController {
  constructor(private readonly firestoreService: FirestoreService) {}

  @Post()
  async createText(@Body() textPayloadDto: TextPayloadDto) {
    try {
      const docRef = await this.firestoreService.addDocument('rawText', textPayloadDto);
      
      return {
        success: true,
        id: docRef.id,
        message: 'Text created successfully',
        data: {
          id: docRef.id,
          ...textPayloadDto,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create text',
        error: error.message,
      };
    }
  }
}
