import { Injectable } from '@nestjs/common';
import csv from 'csv-parser';
import { Readable } from 'stream';

export interface CsvParseResult {
  data: any[];
  rowCount: number;
  headers: string[];
}

@Injectable()
export class CsvService {
  /**
   * Parses CSV buffer and converts it to JSON array
   * @param buffer - CSV file buffer
   * @param options - Optional parsing options
   * @returns Promise with parsed data, row count, and headers
   */
  async parseCSV(
    buffer: Buffer,
    options: {
      delimiter?: string;
      skipEmptyLines?: boolean;
      headers?: string[] | boolean;
    } = {}
  ): Promise<CsvParseResult> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      let headers: string[] = [];
      let isFirstRow = true;

      // Create readable stream from buffer
      const stream = Readable.from(buffer);

      // Configure csv-parser options
      const csvOptions = {
        separator: options.delimiter || ',',
        skipEmptyLines: options.skipEmptyLines !== false,
        headers: options.headers !== undefined ? options.headers : true,
      };

      stream
        .pipe(csv(csvOptions))
        .on('headers', (headerList: string[]) => {
          headers = headerList;
        })
        .on('data', (data) => {
          // Capture headers from first row if not already set
          if (isFirstRow && headers.length === 0) {
            headers = Object.keys(data);
            isFirstRow = false;
          }
          results.push(data);
        })
        .on('end', () => {
          resolve({
            data: results,
            rowCount: results.length,
            headers: headers,
          });
        })
        .on('error', (error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        });
    });
  }

  /**
   * Validates CSV file buffer
   * @param buffer - File buffer to validate
   * @param maxSizeInMB - Maximum file size in MB (default: 10MB)
   * @returns Validation result
   */
  validateCSVFile(buffer: Buffer, maxSizeInMB: number = 10): { isValid: boolean; error?: string } {
    // Check if buffer exists and has content
    if (!buffer || buffer.length === 0) {
      return { isValid: false, error: 'File is empty or invalid' };
    }

    // Check file size
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (buffer.length > maxSizeInBytes) {
      return { isValid: false, error: `File size exceeds ${maxSizeInMB}MB limit` };
    }

    // Basic CSV format check - look for common CSV patterns
    const content = buffer.toString('utf8', 0, Math.min(1000, buffer.length));
    const hasCommas = content.includes(',');
    const hasSemicolons = content.includes(';');
    const hasNewlines = content.includes('\n') || content.includes('\r');

    if (!hasNewlines) {
      return { isValid: false, error: 'File does not appear to contain multiple rows' };
    }

    if (!hasCommas && !hasSemicolons) {
      return { isValid: false, error: 'File does not appear to be in CSV format (no delimiters found)' };
    }

    return { isValid: true };
  }

  /**
   * Detects the most likely delimiter in a CSV file
   * @param buffer - CSV file buffer
   * @returns Detected delimiter
   */
  detectDelimiter(buffer: Buffer): string {
    const sample = buffer.toString('utf8', 0, Math.min(2000, buffer.length));
    const delimiters = [',', ';', '\t', '|'];
    const counts = delimiters.map(delimiter => ({
      delimiter,
      count: (sample.match(new RegExp(delimiter, 'g')) || []).length
    }));

    // Return the delimiter with the highest count
    const mostLikely = counts.reduce((prev, current) => 
      current.count > prev.count ? current : prev
    );

    return mostLikely.count > 0 ? mostLikely.delimiter : ',';
  }
}
