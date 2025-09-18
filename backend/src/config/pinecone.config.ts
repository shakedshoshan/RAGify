export default () => ({
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT || '',
    indexName: process.env.PINECONE_INDEX_NAME || '',
    indexHost: process.env.PINECONE_INDEX_HOST || '',
  },
});
