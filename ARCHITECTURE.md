# Personalized Mental Wellness Assistant - System Architecture

## Core Retrieval Tools Specifications

### 1. searchMemories (Mem0 AI)
- **Functionality**: Performs semantic similarity searches over past user conversations and personal disclosure history.
- **Execution Policy**: Always Executed (concurrent background retrieval).
- **Data Source**: Mem0 Vector Layer API.
- **Latency**: ~400 - 500 ms.
- **Sample Outputs**: User disclosures (*e.g., "User experiences elevated stress during final exams"*).

### 2. getFitbitHealthData
- **Functionality**: Queries 7-day historical trends for resting heart rate, sleep efficiency, and daily activity.
- **Execution Policy**: Always Executed (concurrent background database retrieval).
- **Data Source**: Supabase PostgreSQL database (`fitbit_data` table).
- **Latency**: ~150 - 200 ms.
- **Sample Outputs**: Historical 7-day vitals summaries.

### 3. queryRAG (Pinecone Vector DB)
- **Functionality**: Queries chunked clinical literature and cognitive-behavioral coping resources.
- **Execution Policy**: Conditional (invoked only when Gemini Flash classifies the query as educational or psychological).
- **Data Source**: Pinecone Vector Database (`mental-health-rag` index).
- **Latency**: ~800 ms.
- **Sample Outputs**: Evidence-based CBT techniques and psychological concepts.

### 4. analyzeHealthWithAI
- **Functionality**: Analyzes correlations between physiological stress indicators and mental wellness.
- **Execution Policy**: Conditional (executed when valid Fitbit biometric data is present).
- **Data Source**: Ollama local inference engine.
- **Latency**: ~900 ms.
- **Sample Outputs**: Stress and fatigue risk level assessments.

---

## Data Flow Architecture

### Fitbit Data Pipeline Architecture

```
Fitbit External API Servers 
    -> OAuth 2.0 PKCE Sync Route (/api/fitbit/data)
    -> Transform Vitals Arrays & Calculate Stress Vitals
    -> PostgreSQL Database (Supabase fitbit_data Table)
    -> Flash Orchestrator & Context Summarizer
    -> DeepSeek Empathetic Response Generation Engine
```

#### Key Design Points:
1. **Asynchronous Background Sync**: Historical data is synced into Supabase database storage asynchronously, preventing high-latency API queries during active user chat sessions.
2. **Real-Time Intraday Fetching**: High-frequency vitals (heart rate, HRV, SpO2, breathing rate) from the preceding 30 minutes are fetched on demand to inform real-time emotional analysis.

---

## Three-Stage Execution Architecture

### Stage 1: Context Orchestration (Gemini 2.5 Flash)

```typescript
// Parallel execution reduces total tool latency to the single slowest request (~600ms)
const [memories, fitbit, wellness, profile, ragDecision] = await Promise.allSettled([
  searchMemories(),      // Mem0 Vector Store
  getFitbitHealthData(), // Supabase Database
  executeRecentWellnessFetch(), // Fitbit Intraday API
  getUserProfile(),      // Supabase Profiles
  shouldCallRAG()        // Gemini Flash Intent Classifier
]);

if (ragDecision) {
  await queryRAG();      // Pinecone Vector DB
}
```

### Stage 2: Response Generation (DeepSeek / Ollama)

```typescript
const summarizedContext = await summarizeContext(rawContextPayload);

const response = await generateDeepSeekResponse({
  userMessage,
  summarizedContext,
  conversationHistory: recentMessages.slice(-10)
});
```

---

## Data Source Performance Summary

| Tool Name | Data Provider | Endpoint / Service | Execution Policy | Typical Latency |
| :--- | :--- | :--- | :--- | :--- |
| `searchMemories` | Mem0 AI | Cloud Vector API | Always Executed | ~400 ms |
| `getUserProfile` | Supabase DB | PostgreSQL Query | Always Executed | ~150 ms |
| `getFitbitHealthData` | Supabase DB | PostgreSQL Query | Always Executed | ~200 ms |
| `getRecentWellness` | Fitbit API | Intraday Vitals Endpoint | Always Executed | ~600 ms |
| `queryRAG` | Pinecone DB | Vector Similarity Index | Conditional | ~800 ms |
| `analyzeHealthWithAI` | Ollama Engine | Local Model Instance | Conditional | ~900 ms |

---

## RAG Execution Criteria

Gemini 2.5 Flash evaluates query intent before triggering vector retrieval:

* **Trigger RAG for**:
  - Educational queries: *"What is cognitive behavioral therapy?"*
  - Coping mechanism literature: *"What are grounding techniques for panic attacks?"*
  - Psychological definitions: *"Explain generalized anxiety disorder."*
* **Bypass RAG for**:
  - Personal statements: *"I feel overwhelmed today."*
  - Conversational greetings: *"Hello, how are you?"*
  - Personal biometric inquiries: *"What was my heart rate this morning?"*

---

## Module Layout

```
lib/
├── gemini/
│   ├── flash-client.ts         # Gemini 2.5 Flash initialization client
│   ├── flash-orchestrator.ts   # Parallel tool orchestration module
│   ├── context-summarizer.ts   # Context compression & summarization engine
│   └── tool-schemas.ts         # Function calling schema definitions
├── mem0/
│   └── client.ts               # Mem0 memory retrieval & extraction client
├── rag/
│   └── query.ts                # Pinecone vector retrieval module
├── fitbit/
│   ├── api.ts                  # Fitbit OAuth & background data sync handlers
│   ├── intraday-api.ts         # Real-time vitals retrieval routines
│   └── ai-analyzer.ts          # Physiological metric correlation engine
├── ollama/
│   ├── client.ts               # DeepSeek local generation client
│   └── context-builder.ts      # Prompt template construction routines
└── safety/
    ├── crisis-detection.ts     # Crisis keyword evaluation rules
    └── crisis-alert.ts         # Resend emergency notification dispatcher
```

---

## Performance Benchmark

```
Sequential Tool Architecture (Unoptimized):
searchMemories (500ms) + queryRAG (800ms) + getFitbitData (1000ms) + generateResponse (10000ms) = ~12,300 ms

Parallel Multi-Agent Architecture (Optimized):
Promise.allSettled([Memories, Profile, Fitbit, Intraday]) = ~600 ms
Context Compression (Flash) = ~1,200 ms
DeepSeek Response Generation = ~4,000 ms
Total Turnaround Time: ~5,800 ms (2.1x Latency Reduction)
```
