import { Injectable, Logger } from '@nestjs/common';
import { KafkaProducerService } from '../producers/kafka-producer.service';
import { v4 as uuidv4 } from 'uuid';

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
}

export interface RetryState {
  retryCount: number;
  lastRetryTime: number;
  nextRetryTime: number;
  errorMessage: string;
  correlationId: string;
}

@Injectable()
export class KafkaErrorHandler {
  private readonly logger = new Logger(KafkaErrorHandler.name);
  private readonly retryStates = new Map<string, RetryState>();

  // Default retry configuration
  private readonly defaultRetryConfig: RetryConfig = {
    maxRetries: 5,
    initialDelayMs: 1000, // 1 second
    maxDelayMs: 60000, // 1 minute
    backoffFactor: 2 // Exponential backoff
  };

  constructor(private readonly kafkaProducerService: KafkaProducerService) {}

  /**
   * Handle error and determine if retry is needed
   * @returns true if the operation should be retried, false otherwise
   */
  async handleError(
    error: Error,
    projectId: string,
    service: string,
    operation: string,
    errorType: string,
    correlationId?: string,
    customRetryConfig?: Partial<RetryConfig>
  ): Promise<boolean> {
    const retryConfig = { ...this.defaultRetryConfig, ...customRetryConfig };
    const errorId = correlationId || uuidv4();
    
    // Get or create retry state
    let retryState = this.retryStates.get(errorId);
    if (!retryState) {
      retryState = {
        retryCount: 0,
        lastRetryTime: 0,
        nextRetryTime: Date.now(),
        errorMessage: error.message,
        correlationId: errorId
      };
      this.retryStates.set(errorId, retryState);
    }

    // Check if max retries reached
    if (retryState.retryCount >= retryConfig.maxRetries) {
      this.logger.error(`❌ Max retries (${retryConfig.maxRetries}) reached for operation ${operation}`, {
        service,
        errorType,
        correlationId: errorId
      });

      // Publish final error event
      await this.kafkaProducerService.publishProcessingError({
        projectId,
        timestamp: new Date().toISOString(),
        errorType: `${errorType}_MAX_RETRIES_EXCEEDED`,
        errorMessage: `Failed after ${retryConfig.maxRetries} retries: ${error.message}`,
        service,
        operation,
        correlationId: errorId,
        errorDetails: {
          originalError: error.message,
          retryCount: retryState.retryCount,
          stackTrace: error.stack
        }
      });

      // Clean up retry state
      this.retryStates.delete(errorId);
      return false;
    }

    // Calculate next retry delay with exponential backoff
    const delayMs = Math.min(
      retryConfig.initialDelayMs * Math.pow(retryConfig.backoffFactor, retryState.retryCount),
      retryConfig.maxDelayMs
    );

    // Update retry state
    retryState.retryCount++;
    retryState.lastRetryTime = Date.now();
    retryState.nextRetryTime = Date.now() + delayMs;
    retryState.errorMessage = error.message;

    // Publish retry event
    await this.kafkaProducerService.publishProcessingError({
      projectId,
      timestamp: new Date().toISOString(),
      errorType: `${errorType}_RETRY`,
      errorMessage: `Retry ${retryState.retryCount}/${retryConfig.maxRetries}: ${error.message}`,
      service,
      operation,
      correlationId: errorId,
      errorDetails: {
        originalError: error.message,
        retryCount: retryState.retryCount,
        nextRetryIn: `${delayMs}ms`,
        stackTrace: error.stack
      }
    });

    // Log retry information
    this.logger.warn(`⚠️ Retry ${retryState.retryCount}/${retryConfig.maxRetries} for operation ${operation} in ${delayMs}ms`, {
      service,
      errorType,
      correlationId: errorId
    });

    // Wait for the delay
    await new Promise(resolve => setTimeout(resolve, delayMs));
    
    return true;
  }

  /**
   * Clear retry state for a specific correlation ID
   */
  clearRetryState(correlationId: string): void {
    this.retryStates.delete(correlationId);
  }

  /**
   * Get current retry state for a specific correlation ID
   */
  getRetryState(correlationId: string): RetryState | undefined {
    return this.retryStates.get(correlationId);
  }

  /**
   * Get all active retry states
   */
  getAllRetryStates(): Map<string, RetryState> {
    return new Map(this.retryStates);
  }
}
