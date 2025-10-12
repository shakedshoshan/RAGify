import { 
  Body, 
  Controller, 
  Post, 
  Put,
  Delete,
  Param,
  UploadedFile, 
  UseInterceptors, 
  BadRequestException, 
  HttpException, 
  HttpStatus,
  Query
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TextPayloadDto, EditTextDto } from '../dto/text-payload.dto';
import { FirestoreService } from '../services/firestore.service';
import { CsvService } from '../services/csv.service';
import { PdfService } from '../services/pdf.service';
import { CacheService } from '../services/cache.service';
import { ElasticsearchService } from '../services/elasticsearch.service';

@Controller('text')
export class TextController {
  constructor(
    private readonly firestoreService: FirestoreService,
    private readonly csvService: CsvService,
    private readonly pdfService: PdfService,
    private readonly cacheService: CacheService,
    private readonly elasticsearchService: ElasticsearchService
  ) {}

  @Post()
  async createText(@Body() textPayloadDto: TextPayloadDto) {
    try {
      const docRef = await this.firestoreService.addDocument('rawText', textPayloadDto);
      
      // Index to Elasticsearch
      try {
        await this.elasticsearchService.indexRawText(docRef.id, textPayloadDto);
      } catch (esError) {
        console.error('Failed to index to Elasticsearch:', esError.message);
      }
      
      // Invalidate project cache if a project_id is provided
      if (textPayloadDto.project_id) {
        const cacheKey = this.cacheService.generateProjectKey(textPayloadDto.project_id);
        await this.cacheService.delete(cacheKey);
        console.log(`🔄 Invalidated cache for project: ${textPayloadDto.project_id} after adding new text`);
      }
      
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

  @Put(':id')
  async editText(@Param('id') id: string, @Body() editTextDto: EditTextDto) {
    try {
      // Validate ID parameter
      if (!id) {
        throw new BadRequestException('ID parameter is required');
      }

      // Validate that at least one field is provided for update
      if (!editTextDto.name && !editTextDto.text) {
        throw new BadRequestException('At least one field (name or text) must be provided for update');
      }

      // Check if document exists before updating
      const existingDoc = await this.firestoreService.getDocument('rawText', id);
      if (!existingDoc) {
        throw new HttpException(
          {
            success: false,
            message: 'Text document not found',
            error: `No document found with ID: ${id}`,
          },
          HttpStatus.NOT_FOUND
        );
      }
      
      // Type assertion to help TypeScript understand the document structure
      const typedExistingDoc = existingDoc as Record<string, any>;

      // Prepare update data (only include fields that are provided)
      const updateData: any = {};
      if (editTextDto.name !== undefined) {
        updateData.name = editTextDto.name;
      }
      if (editTextDto.text !== undefined) {
        updateData.text = editTextDto.text;
      }

      // Update the document
      await this.firestoreService.updateDocument('rawText', id, updateData);

      // Update in Elasticsearch
      try {
        await this.elasticsearchService.updateRawText(id, updateData);
      } catch (esError) {
        console.error('Failed to update in Elasticsearch:', esError.message);
      }

      // Get the updated document to return
      const updatedDoc = await this.firestoreService.getDocument('rawText', id);
      
      // Invalidate project cache if document belongs to a project
      if (typedExistingDoc.project_id) {
        const cacheKey = this.cacheService.generateProjectKey(typedExistingDoc.project_id);
        await this.cacheService.delete(cacheKey);
        console.log(`🔄 Invalidated cache for project: ${typedExistingDoc.project_id} after text edit`);
      }

      return {
        success: true,
        id: id,
        message: 'Text updated successfully',
        data: {
          id: id,
          ...updatedDoc,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: 'Failed to update text',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Post('upload-csv')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, callback) => {
        // Accept only CSV files
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
          callback(null, true);
        } else {
          callback(new BadRequestException('Only CSV files are allowed'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    })
  )
  async uploadCSV(
    @UploadedFile() file: Express.Multer.File,
    @Query('project_id') projectId: string,
    @Query('delimiter') delimiter?: string,
    @Query('skipEmptyLines') skipEmptyLines?: string,
    @Query('name') name?: string,
  ) {
    try {
      // Validate file exists
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      // Validate project_id
      if (!projectId) {
        throw new BadRequestException('project_id is required');
      }

      // Validate file buffer
      const validation = this.csvService.validateCSVFile(file.buffer);
      if (!validation.isValid) {
        throw new BadRequestException(validation.error);
      }

      // Auto-detect delimiter if not provided
      const finalDelimiter = delimiter || this.csvService.detectDelimiter(file.buffer);

      // Parse CSV
      const parseOptions = {
        delimiter: finalDelimiter,
        skipEmptyLines: skipEmptyLines !== 'false',
      };

      const result = await this.csvService.parseCSV(file.buffer, parseOptions);
      
      // Convert parsed data to JSON string
      const jsonData = JSON.stringify(result.data);
      
      // Create text payload
      const textPayload: TextPayloadDto = {
        project_id: projectId,
        name: name || file.originalname,
        text: jsonData
      };

      // Save to Firestore
      const docRef = await this.firestoreService.addDocument('rawText', textPayload);
      
      // Index to Elasticsearch
      try {
        await this.elasticsearchService.indexRawText(docRef.id, textPayload);
      } catch (esError) {
        console.error('Failed to index CSV to Elasticsearch:', esError.message);
      }
      
      // Invalidate project cache
      const cacheKey = this.cacheService.generateProjectKey(projectId);
      await this.cacheService.delete(cacheKey);
      console.log(`🔄 Invalidated cache for project: ${projectId} after CSV upload`);
      
      return {
        success: true,
        id: docRef.id,
        message: 'CSV file processed and saved successfully',
        data: {
          id: docRef.id,
          filename: file.originalname,
          size: file.size,
          rowCount: result.rowCount,
          headers: result.headers,
          project_id: projectId,
          name: textPayload.name
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: 'Failed to process CSV file',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('upload-pdf')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, callback) => {
        // Log file information for debugging
        console.log('Received file:', {
          fieldname: file.fieldname,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        });
        
        // Accept only PDF files
        if (file.mimetype === 'application/pdf' || 
            file.originalname.toLowerCase().endsWith('.pdf') ||
            file.mimetype === 'application/octet-stream') { // Some browsers may send this for PDFs
          callback(null, true);
        } else {
          console.log('Rejected file with mimetype:', file.mimetype);
          callback(new BadRequestException(`Only PDF files are allowed. Got mimetype: ${file.mimetype}`), false);
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
    })
  )
  async uploadPDF(
    @UploadedFile() file: Express.Multer.File,
    @Query('project_id') projectId: string,
    @Query('name') name?: string,
  ) {
    try {
      console.log('PDF upload endpoint called with project_id:', projectId, 'name:', name);
      
      // Validate file exists
      if (!file) {
        console.error('No file received in the request');
        throw new BadRequestException('No file uploaded');
      }
      
      console.log('File received:', {
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      });

      // Validate project_id
      if (!projectId) {
        throw new BadRequestException('project_id is required');
      }

      // Parse PDF and extract text
      const pdfResult = await this.pdfService.parsePdf(file.buffer);
      
      // Clean the extracted text
      const cleanedText = this.pdfService.cleanText(pdfResult.text);
      
      // Create text payload
      const textPayload: TextPayloadDto = {
        project_id: projectId,
        name: name || file.originalname.replace('.pdf', ''),
        text: cleanedText
      };

      // Save to Firestore
      const docRef = await this.firestoreService.addDocument('rawText', textPayload);
      
      // Index to Elasticsearch
      try {
        await this.elasticsearchService.indexRawText(docRef.id, textPayload);
      } catch (esError) {
        console.error('Failed to index PDF to Elasticsearch:', esError.message);
      }
      
      // Invalidate project cache
      const cacheKey = this.cacheService.generateProjectKey(projectId);
      await this.cacheService.delete(cacheKey);
      console.log(`🔄 Invalidated cache for project: ${projectId} after PDF upload`);
      
      return {
        success: true,
        id: docRef.id,
        message: 'PDF file processed and saved successfully',
        data: {
          id: docRef.id,
          filename: file.originalname,
          size: file.size,
          pageCount: pdfResult.pageCount,
          textContent: cleanedText.substring(0, 500) + (cleanedText.length > 500 ? '...' : ''), // Preview of text
          project_id: projectId,
          name: textPayload.name
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: 'Failed to process PDF file',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':id')
  async deleteText(@Param('id') id: string) {
    try {
      // Validate ID parameter
      if (!id) {
        throw new BadRequestException('ID parameter is required');
      }

      // Check if document exists before deletion
      const existingDoc = await this.firestoreService.getDocument('rawText', id);
      if (!existingDoc) {
        throw new HttpException(
          {
            success: false,
            message: 'Text document not found',
            error: `No document found with ID: ${id}`,
          },
          HttpStatus.NOT_FOUND
        );
      }
      
      // Type assertion to help TypeScript understand the document structure
      const typedExistingDoc = existingDoc as Record<string, any>;

      // Delete the document from Firestore
      await this.firestoreService.deleteDocument('rawText', id);

      // Delete from Elasticsearch
      try {
        await this.elasticsearchService.deleteRawText(id);
      } catch (esError) {
        console.error('Failed to delete from Elasticsearch:', esError.message);
      }
      
      // Invalidate project cache if document belongs to a project
      if (typedExistingDoc.project_id) {
        const cacheKey = this.cacheService.generateProjectKey(typedExistingDoc.project_id);
        await this.cacheService.delete(cacheKey);
        console.log(`🔄 Invalidated cache for project: ${typedExistingDoc.project_id} after text deletion`);
      }

      return {
        success: true,
        message: 'Text deleted successfully',
        data: {
          id: id,
          deletedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: 'Failed to delete text',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
