# Elasticsearch Quick Start Guide

## ⚡ Get Started in 5 Minutes

This guide will get Elasticsearch up and running in your RAGify backend quickly.

---

## 📋 Prerequisites

- Docker and Docker Compose installed
- Node.js and npm installed
- RAGify backend repository cloned

---

## 🚀 Step 1: Install Dependencies (2 minutes)

```bash
cd backend
npm install
```

This will install the new `@elastic/elasticsearch` package along with other dependencies.

---

## 🔧 Step 2: Configure Environment (1 minute)

Create or update your `.env` file in the `backend` directory:

```bash
cd backend
touch .env  # Create if doesn't exist
```

Add this line to your `.env` file:
```env
ELASTICSEARCH_NODE=http://localhost:9200
```

**Note**: When using Docker, the backend service will automatically use `http://elasticsearch:9200` from the docker-compose configuration.

---

## 🐳 Step 3: Start Services (1 minute)

```bash
cd backend
docker-compose up -d
```

This will start:
- Elasticsearch on port 9200
- Kibana on port 5601
- Backend on port 5000
- Kafka, Zookeeper, and other services

Wait ~30 seconds for Elasticsearch to fully start.

---

## ✅ Step 4: Verify Installation (30 seconds)

### Check Elasticsearch
```bash
curl http://localhost:9200
```

Expected response:
```json
{
  "name" : "...",
  "cluster_name" : "docker-cluster",
  "version" : {
    "number" : "8.11.0",
    ...
  }
}
```

### Check Backend Logs
```bash
docker logs ragify-backend
```

Look for:
```
✅ Elasticsearch service initialized successfully
✅ Created Elasticsearch index: rawtext
```

---

## 📦 Step 5: Migrate Existing Data (30 seconds)

If you have existing rawText documents in Firestore, run the migration:

```bash
cd backend
npm run elastic:migrate
```

You should see:
```
🚀 Starting Elasticsearch migration...
✅ Firebase initialized successfully
✅ Connected to Elasticsearch
📥 Fetching all rawText documents from Firestore...
📊 Found X documents to migrate
📤 Indexing batch 1...
✅ Progress: X/X documents indexed
🎉 Migration completed successfully!
```

---

## 🧪 Step 6: Test the Search (30 seconds)

### Create a test document
```bash
curl -X POST http://localhost:5000/text \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "test-project",
    "name": "Test Document",
    "text": "This is a test document about machine learning and artificial intelligence."
  }'
```

### Search for it
```bash
curl "http://localhost:5000/search/rawtexts?query=machine%20learning"
```

Expected response:
```json
{
  "total": 1,
  "took": 15,
  "hits": [
    {
      "id": "...",
      "score": 4.25,
      "document": {
        "project_id": "test-project",
        "name": "Test Document",
        "text": "This is a test document about machine learning...",
        "createdAt": "...",
        "updatedAt": "..."
      },
      "highlights": {
        "text": ["...about <em>machine learning</em> and..."]
      }
    }
  ]
}
```

---

## 🎉 You're Done!

Elasticsearch is now fully integrated with your RAGify backend!

---

## 📊 Explore with Kibana (Optional)

Open Kibana in your browser:
```
http://localhost:5601
```

Navigate to:
1. **Dev Tools** → Query your index directly
2. **Discover** → Explore your documents visually
3. **Dashboard** → Create search analytics

---

## 🔍 Common Use Cases

### 1. Search by Content
```bash
curl "http://localhost:5000/search/rawtexts?query=neural%20networks"
```

### 2. Search by Project
```bash
curl "http://localhost:5000/search/rawtexts?query=AI&project_id=proj123"
```

### 3. Paginated Results
```bash
curl "http://localhost:5000/search/rawtexts?query=test&from=0&size=10"
```

### 4. Sort by Date
```bash
curl "http://localhost:5000/search/rawtexts?query=test&sort=createdAt&order=desc"
```

### 5. Autocomplete
```bash
curl "http://localhost:5000/search/suggest?q=doc&project_id=proj123"
```

---

## 🛠️ Useful Commands

### View Backend Logs
```bash
docker logs -f ragify-backend
```

### View Elasticsearch Logs
```bash
docker logs -f ragify-elasticsearch
```

### Restart Services
```bash
docker-compose restart
```

### Stop Services
```bash
docker-compose down
```

### Check Index Health
```bash
curl http://localhost:9200/_cat/indices?v
```

### Count Documents
```bash
curl http://localhost:9200/rawtext/_count
```

---

## 🐛 Quick Troubleshooting

### Elasticsearch won't start
```bash
# Check logs
docker logs ragify-elasticsearch

# Increase Docker memory to at least 4GB
# Docker Desktop → Settings → Resources → Memory
```

### Migration fails
```bash
# Ensure Firebase credentials are correct in .env
# Check that Elasticsearch is running
curl http://localhost:9200

# Run migration again
npm run elastic:migrate
```

### Search returns no results
```bash
# Check if documents exist
curl http://localhost:9200/rawtext/_count

# Test direct ES query
curl -X GET "http://localhost:9200/rawtext/_search?q=test"
```

---

## 📚 Next Steps

Now that Elasticsearch is running:

1. **Test with real data** - Upload your documents
2. **Integrate with frontend** - Add search UI components
3. **Monitor performance** - Use Kibana dashboards
4. **Optimize queries** - Fine-tune search parameters

For detailed documentation, see:
- `ELASTICSEARCH_IMPLEMENTATION_SUMMARY.md` - What was implemented
- `README_ELASTICSEARCH.md` - Complete documentation index
- `ELASTICSEARCH_IMPLEMENTATION_GUIDE.md` - Detailed guide

---

## 🎓 Learning Resources

### Elasticsearch Basics
- [Official Elasticsearch Docs](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Node.js Client Docs](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/index.html)

### Search Query Examples
```bash
# Match query
curl -X GET "http://localhost:9200/rawtext/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": { "text": "machine learning" }
  }
}
'

# Fuzzy query
curl -X GET "http://localhost:9200/rawtext/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "fuzzy": { "name": "dokument" }
  }
}
'
```

---

## ✨ Congratulations!

You've successfully set up Elasticsearch full-text search in RAGify! 🎉

Your users can now:
- 🔍 Search through document content
- ✨ Get relevant results with highlights
- 🎯 Filter by project
- 💡 Use autocomplete for document names
- 🚀 Experience fast, scalable search

**Happy searching!** 🚀

