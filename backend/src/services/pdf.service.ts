import { Injectable, BadRequestException } from '@nestjs/common';
import pdfParse from 'pdf-parse';

export interface PdfParseResult {
  text: string;
  pageCount: number;
  info?: any;
}

@Injectable()
export class PdfService {
  /**
   * Validate PDF file buffer
   * @param buffer PDF file buffer
   * @returns Validation result
   */
  validatePdfFile(buffer: Buffer): { isValid: boolean; error?: string } {
    try {
      // Check if buffer is empty
      if (!buffer || buffer.length === 0) {
        return { isValid: false, error: 'PDF file is empty' };
      }

      // Check file size (max 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (buffer.length > maxSize) {
        return { isValid: false, error: 'PDF file is too large. Maximum size is 50MB' };
      }

      // Basic PDF signature check
      const pdfSignature = buffer.toString('hex', 0, 4);
      if (pdfSignature !== '25504446') { // %PDF in hex
        return { isValid: false, error: 'Invalid PDF file format' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Failed to validate PDF file' };
    }
  }

  /**
   * Parse PDF file and extract text content
   * @param buffer PDF file buffer
   * @returns Parsed PDF data
   */
  async parsePdf(buffer: Buffer): Promise<PdfParseResult> {
    try {
      const validation = this.validatePdfFile(buffer);
      if (!validation.isValid) {
        throw new BadRequestException(validation.error);
      }

      console.log('Attempting to parse PDF file...');
      
      try {
        const pdfData = await pdfParse(buffer);
        
        console.log('PDF parsed successfully:', {
          pageCount: pdfData.numpages,
          textLength: pdfData.text?.length || 0,
          hasInfo: !!pdfData.info
        });
        
        return {
          text: pdfData.text,
          pageCount: pdfData.numpages,
          info: pdfData.info,
        };
      } catch (parseError) {
        console.error('PDF parsing error:', parseError);
        throw new BadRequestException(`PDF parsing failed: ${parseError.message}`);
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      console.error('Unexpected error in parsePdf:', error);
      throw new BadRequestException(`Failed to process PDF: ${error.message}`);
    }
  }

  /**
   * Clean and format extracted text
   * @param text Raw extracted text
   * @returns Cleaned text
   */
  cleanText(text: string): string {
    if (!text || text.trim().length === 0) {
      throw new BadRequestException('No text content found in PDF');
    }

    // Clean up the text
    let cleanedText = text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
      .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
      .trim();

    // Check if text is too short (likely extraction failed)
    if (cleanedText.length < 10) {
      throw new BadRequestException('PDF appears to contain no readable text content');
    }

    return cleanedText;
  }
}
