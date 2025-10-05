# Generation Controller Documentation

## Overview

The Generation Controller is a core component of the RAGify system that handles the Retrieval-Augmented Generation (RAG) workflow. It orchestrates the process of taking a user query, retrieving relevant context from a vector database, and generating an AI response based on that context and conversation history.

## API Endpoints

### `POST /generation/generate`

This endpoint processes user queries and generates AI responses using the RAG approach.

**Authentication**: Requires a valid API key (uses `ApiKeyGuard`)

**Request Body**:
```typescript
{
  "prompt": string,         // The user's query
  "projectId": string,      // The project ID for context retrieval
  "topK"?: number,          // Optional: Number of results to retrieve (default: 5)
  "conversationHistory"?: [ // Optional: Previous conversation turns
    {
      "role": "user" | "assistant" | "system",
      "content": string
    }
  ]
}
```

**Response**:
```typescript
{
  "answer": string,         // The generated AI response
  "query": string,          // The processed query
  "conversationHistory": [  // Updated conversation history
    {
      "role": "user" | "assistant" | "system",
      "content": string
    }
  ]
}
```

## Internal Flow

The Generation Controller follows a sequential workflow:

1. **Query Reception**
   - Receives the user query with optional conversation history
   - Generates a unique correlation ID for tracking
   - Records the start time for performance monitoring

2. **Event Publishing: Query Received**
   - Publishes a `QueryReceived` event to Kafka
   - Includes metadata like query length and source

3. **Context Retrieval**
   - Calls the Retrieval Service to fetch relevant document chunks
   - Combines retrieved context with conversation history

4. **Event Publishing: Context Retrieved**
   - Publishes a `ContextRetrieved` event to Kafka
   - Includes metadata about retrieval performance and conversation history

5. **Response Generation**
   - Uses the Generation Service to produce an AI response
   - Leverages both retrieved context and conversation history

6. **Event Publishing: Response Generated**
   - Publishes a `ResponseGenerated` event to Kafka
   - Includes metadata about generation performance and model used

7. **Response Preparation**
   - Updates the conversation history with the new query and response
   - Returns the answer, query, and updated conversation history

## Error Handling

The controller implements comprehensive error handling:

- All exceptions are caught and logged
- A `ProcessingError` event is published to Kafka with detailed error information
- A `BadRequestException` is thrown with an appropriate error message

## Conversation History Management

The controller maintains conversation history to enable contextual, multi-turn interactions:

- Conversation history is optional in the request
- Each history entry has a `role` (user/assistant/system) and `content`
- The controller appends the current query and generated response to the history
- The updated history is returned in the response for the client to use in subsequent requests

## Telemetry and Monitoring

The controller captures detailed telemetry at each step:

- Correlation IDs track requests across the entire processing pipeline
- Timestamps measure performance at each stage
- Metadata includes information about conversation context, retrieval performance, and generation details

## Dependencies

The Generation Controller depends on:
- `GenerationService`: Handles AI response generation
- `RetrievalService`: Retrieves relevant context from vector database
- `KafkaProducerService`: Publishes events for monitoring and analytics
- `ApiKeyGuard`: Provides authentication and authorization

## Generation Service Implementation

The `GenerationService` processes conversation history and context to generate responses:

1. **Message Formatting**
   - Converts the retrieved context into a formatted string
   - Builds an array of messages for the OpenAI chat completion API

2. **Conversation History Integration**
   - Adds previous conversation turns (limited to the last 10)
   - Maps conversation history to OpenAI message format

3. **Context Inclusion**
   - Adds the retrieved context and current query as the final user message
   - Ensures the LLM has both conversation history and relevant document context

4. **Response Generation**
   - Uses the OpenAI chat completions API with the constructed messages
   - Returns the generated response text
   - Implements fallback mechanism for insufficient context scenarios

5. **Fallback Mechanism**
   - Detects when the response indicates insufficient context information
   - Falls back to conversation history only when available
   - Creates a new prompt focused solely on conversational context
   - Generates an alternative response that leverages previous interactions

The service maintains the conversational context while incorporating retrieved information, enabling the system to provide coherent responses that build on previous interactions while leveraging the knowledge base.
