# System Architecture & Sequence Diagrams

> Technical Mermaid.js specification diagrams for the Personalized Mental Wellness Assistant platform.

---

## Table of Contents

- [Overview Architecture](#overview-architecture)
- [Multi-Agent Orchestration Flow](#multi-agent-orchestration-flow)
- [Three-Stage Execution Pipeline](#three-stage-execution-pipeline)
- [Tool Execution Sequence](#tool-execution-sequence)
- [Fitbit Integration & Biometric Flow](#fitbit-integration--biometric-flow)
- [Memory System Architecture](#memory-system-architecture)
- [Retrieval-Augmented Generation (RAG) Pipeline](#retrieval-augmented-generation-rag-pipeline)
- [Crisis Detection & Safety Flow](#crisis-detection--safety-flow)
- [Database Entity-Relationship Schema](#database-entity-relationship-schema)

---

## Overview Architecture

```mermaid
graph TB
    subgraph Frontend["Frontend Layer (Next.js 14 App Router)"]
        UI["Chat Interface & Dashboard<br/>(dashboard/page.tsx)"]:::frontend
        FitbitWidget["Fitbit Health Widget<br/>(FitbitWidget.tsx)"]:::frontend
        AdminUI["Admin Document Panel<br/>(admin/page.tsx)"]:::frontend
    end
    
    subgraph API["API Gateway Layer"]
        ChatAPI["Chat API Endpoint<br/>(/api/chat)"]:::api
        FitbitAPI["Fitbit Integration APIs<br/>(/api/fitbit/*)"]:::api
        AdminAPI["Admin RAG APIs<br/>(/api/admin/documents)"]:::api
        EmergencyAPI["Emergency Contact API<br/>(/api/emergency-contact)"]:::api
    end
    
    subgraph Orchestration["Multi-Agent AI Engine"]
        CrisisDetect["Crisis & Safety Scanner"]:::agent
        FlashOrchestrator["Gemini 2.5 Flash Orchestrator<br/>(Parallel Tool Dispatcher)"]:::agent
        FlashSummarizer["Gemini 2.5 Flash Summarizer<br/>(Context Compressor)"]:::agent
        DeepSeek["DeepSeek via Ollama<br/>(Empathetic Response Generator)"]:::agent
    end
    
    subgraph Tools["Tool & Context Integrations"]
        Mem0["Mem0 AI Vector Store<br/>(searchMemories)"]:::external
        FitbitClient["Fitbit Intraday & Vitals API<br/>(getRecentWellness)"]:::external
        RAGSystem["Pinecone + Nomic RAG<br/>(queryRAG)"]:::external
        UserProfile["User Profile DB Handler<br/>(getUserProfile)"]:::external
    end
    
    subgraph Data["Data Stores"]
        DB[("PostgreSQL Database<br/>(Supabase DB)")]:::database
        VectorDB[("Pinecone Vector DB<br/>(RAG Embeddings)")]:::database
        Storage[("Supabase Storage<br/>(Document PDFs)")]:::database
    end
    
    UI -->|HTTP POST Prompt| ChatAPI
    FitbitWidget -->|Fetch Vitals| FitbitAPI
    AdminUI -->|Upload PDF| AdminAPI
    
    ChatAPI --> CrisisDetect
    CrisisDetect -->|Severe Crisis Flag| EmergencyAPI
    CrisisDetect -->|Safe Query| FlashOrchestrator
    
    FlashOrchestrator -->|Parallel Query| Mem0
    FlashOrchestrator -->|Parallel Query| FitbitClient
    FlashOrchestrator -->|Conditional Query| RAGSystem
    FlashOrchestrator -->|Parallel Query| UserProfile
    
    Mem0 & FitbitClient & RAGSystem & UserProfile --> FlashSummarizer
    FlashSummarizer -->|Compressed Context| DeepSeek
    DeepSeek -->|Streams Response| ChatAPI
    ChatAPI -->|Renders Response| UI
    
    FitbitAPI --> DB
    Mem0 --> VectorDB
    RAGSystem --> VectorDB
    AdminAPI --> Storage

    classDef frontend fill:#dbeafe,stroke:#3b82f6,stroke-width:1.5px,color:#1e3a8a;
    classDef api fill:#f3e8ff,stroke:#a855f7,stroke-width:1.5px,color:#581c87;
    classDef agent fill:#fef3c7,stroke:#f59e0b,stroke-width:1.5px,color:#78350f;
    classDef database fill:#dcfce7,stroke:#22c55e,stroke-width:1.5px,color:#14532d;
    classDef external fill:#ffe4e6,stroke:#f43f5e,stroke-width:1.5px,color:#881337;
```

---

## Multi-Agent Orchestration Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Client UI)
    participant ChatAPI as Chat API (/api/chat)
    participant Crisis as Safety Scanner
    participant Orchestrator as Gemini Orchestrator
    participant Tools as Tool Execution Engine
    participant Summarizer as Context Summarizer
    participant DeepSeek as DeepSeek Engine
    participant DataStores as Supabase & Mem0

    User->>ChatAPI: Send message prompt
    ChatAPI->>Crisis: Scan for self-harm / crisis terms
    
    alt Severe Crisis Triggered
        Crisis-->>ChatAPI: High-Severity Risk Flagged
        ChatAPI->>DataStores: Dispatch Emergency Alert Email via Resend
        ChatAPI-->>User: Render Hotline Resources (988) & Halt Session
    else Safe / Normal Query
        ChatAPI->>Orchestrator: Pass user message & chat history
        
        par Parallel Tool Execution (~2s total)
            Orchestrator->>Tools: 1. searchMemories(query) [Mem0 Vector DB]
            Orchestrator->>Tools: 2. getUserProfile() [Supabase DB]
            Orchestrator->>Tools: 3. getFitbitHealthData() [7-Day Vitals]
            Orchestrator->>Tools: 4. getRecentWellness() [Intraday Vitals]
            Orchestrator->>Tools: 5. shouldCallRAG() -> queryRAG() [Pinecone DB]
        end
        
        Tools-->>Summarizer: Return raw multi-source context (~3,000 tokens)
        Summarizer->>Summarizer: Compress to natural language paragraph (~60 tokens)
        Summarizer-->>DeepSeek: Forward compressed summary + dialogue history
        DeepSeek-->>ChatAPI: Generate empathetic response (<100 words)
        ChatAPI->>DataStores: Save chat turn & store health insights in Mem0
        ChatAPI-->>User: Return response with embedded vitals context
    end
```

---

## Three-Stage Execution Pipeline

```mermaid
flowchart TD
    UserMsg([User Message Input]):::user --> Stage1
    
    subgraph Stage1["Stage 1: Parallel Tool Orchestration (Gemini 2.5 Flash)"]
        Intent[Analyze User Intent & Context]:::agent
        RAGCheck{Educational / Psychology Query?}:::agent
        
        Intent --> RAGCheck
        RAGCheck -->|Yes| ExecTools[Execute All 5 Retrieval Tools in Parallel]:::agent
        RAGCheck -->|No| ExecToolsNoRAG[Execute 4 Core Vitals & Memory Tools]:::agent
        
        ExecTools --> T1["searchMemories (Mem0 Store)"]:::external
        ExecTools --> T2["getUserProfile (Supabase DB)"]:::api
        ExecTools --> T3["getFitbitHealthData (7-Day Vitals)"]:::api
        ExecTools --> T4["getRecentWellness (30-Min Intraday)"]:::api
        ExecTools --> T5["queryRAG (Pinecone Vector DB)"]:::database
        
        ExecToolsNoRAG --> T1
        ExecToolsNoRAG --> T2
        ExecToolsNoRAG --> T3
        ExecToolsNoRAG --> T4
        
        T1 & T2 & T3 & T4 & T5 --> RawData[Raw Multi-Source Context Data<br/>~2,000 - 4,000 Tokens]:::frontend
    end
    
    RawData --> Stage2
    
    subgraph Stage2["Stage 2: Context Compression (Gemini 2.5 Flash)"]
        Compress[Synthesize raw metrics into 1-2 conversational sentences]:::agent
        Summary["Compressed Context Summary<br/>~50 - 80 Tokens (95% Token Reduction)"]:::agent
        Compress --> Summary
    end
    
    Summary --> Stage3
    
    subgraph Stage3["Stage 3: Response Generation (DeepSeek / Ollama)"]
        Inject[Inject Compressed Context + Conversation History]:::agent
        Generate[Generate Empathetic & Metric-Informed Reply]:::agent
        Inject --> Generate
    end
    
    Generate --> Output([Final User Response]):::user

    classDef user fill:#f3f4f6,stroke:#6b7280,stroke-width:1.5px,color:#111827;
    classDef frontend fill:#dbeafe,stroke:#3b82f6,stroke-width:1.5px,color:#1e3a8a;
    classDef api fill:#f3e8ff,stroke:#a855f7,stroke-width:1.5px,color:#581c87;
    classDef agent fill:#fef3c7,stroke:#f59e0b,stroke-width:1.5px,color:#78350f;
    classDef database fill:#dcfce7,stroke:#22c55e,stroke-width:1.5px,color:#14532d;
    classDef external fill:#ffe4e6,stroke:#f43f5e,stroke-width:1.5px,color:#881337;
```

---

## Fitbit Integration & Biometric Flow

```mermaid
flowchart TD
    subgraph OAuth["OAuth 2.0 PKCE Authorization Flow"]
        Connect[User Clicks Connect Fitbit]:::frontend --> AuthRoute["/api/fitbit/authorize"]:::api
        AuthRoute --> FitbitConsent[Fitbit OAuth Consent Screen]:::external
        FitbitConsent --> CallbackRoute["/api/fitbit/callback"]:::api
        CallbackRoute --> ExchangeToken[Exchange Code for Access & Refresh Tokens]:::agent
        ExchangeToken --> StoreTokens[("Store Tokens in fitbit_tokens DB")]:::database
    end

    subgraph Sync["Background Sync & Historical Retrieval"]
        StoreTokens --> HistoricalRoute["/api/fitbit/data"]:::api
        HistoricalRoute --> ParallelFetch{Fetch 7-Day Metrics}:::agent
        
        ParallelFetch --> Sleep["GET /sleep/date/{date}.json"]:::external
        ParallelFetch --> HR["GET /activities/heart/date/{date}/7d.json"]:::external
        ParallelFetch --> Activity["GET /activities/date/{date}.json"]:::external
        ParallelFetch --> HRV["GET /hrv/date/{date}.json"]:::external
        
        Sleep & HR & Activity & HRV --> StoreFitbitDB[("Persist Records in fitbit_data DB")]:::database
    end

    subgraph Intraday["Real-Time Intraday Vitals Pipeline"]
        ChatMessage[User Sends Chat Prompt]:::user --> IntradayRoute["/api/fitbit/intraday/wellness"]:::api
        IntradayRoute --> Fetch30Min{Fetch Last 30-Min Intraday}:::agent
        
        Fetch30Min --> IntraHR["Intraday HR (1-min granular)"]:::external
        Fetch30Min --> IntraHRV["Intraday HRV (RMSSD)"]:::external
        Fetch30Min --> IntraBreath["Breathing Rate"]:::external
        Fetch30Min --> IntraSpO2["SpO2 Blood Oxygen"]:::external
        
        IntraHR & IntraHRV & IntraBreath & IntraSpO2 --> CalcIndicators[Calculate Stress & Fatigue Indicators]:::agent
        CalcIndicators --> PromptContext[Inject Vitals Context into Summarizer]:::frontend
    end

    classDef user fill:#f3f4f6,stroke:#6b7280,stroke-width:1.5px,color:#111827;
    classDef frontend fill:#dbeafe,stroke:#3b82f6,stroke-width:1.5px,color:#1e3a8a;
    classDef api fill:#f3e8ff,stroke:#a855f7,stroke-width:1.5px,color:#581c87;
    classDef agent fill:#fef3c7,stroke:#f59e0b,stroke-width:1.5px,color:#78350f;
    classDef database fill:#dcfce7,stroke:#22c55e,stroke-width:1.5px,color:#14532d;
    classDef external fill:#ffe4e6,stroke:#f43f5e,stroke-width:1.5px,color:#881337;
```

---

## Memory System Architecture

```mermaid
flowchart TD
    subgraph MemoryRetrieval["Memory Retrieval Stage (Pre-Chat)"]
        UserPrompt[User Message Prompt]:::user --> SearchMemoriesAPI["Mem0 searchMemories() API"]:::api
        SearchMemoriesAPI --> EmbedQuery[Generate Query Embedding]:::agent
        EmbedQuery --> CosineSearch[Vector Similarity Search]:::agent
        CosineSearch --> Mem0DB[("Mem0 Vector Database")]:::database
        Mem0DB --> TopMemories[Return Top 5 Semantic Memories]:::frontend
    end
    
    TopMemories --> SummarizerEngine[Gemini 2.5 Flash Summarizer]:::agent
    
    subgraph MemoryStorage["Memory Extraction & Storage Stage (Post-Chat)"]
        ChatResponse[DeepSeek Generates Response]:::agent --> ExtractInsights[Extract Health & Personal Insights]:::agent
        ExtractInsights --> FormatInsights[formatAIInsightsForMemory]:::agent
        FormatInsights --> AddMemoryAPI["Mem0 addMemory() API"]:::api
        AddMemoryAPI --> Categorize[Auto-Categorize Memory]:::agent
        
        Categorize --> CatHealth["health"]:::external
        Categorize --> CatInsights["conversation_insights"]:::external
        Categorize --> CatPrefs["user_preferences"]:::external
        Categorize --> CatMilestones["milestones"]:::external
        
        CatHealth & CatInsights & CatPrefs & CatMilestones --> IndexStore[("Upsert Embedding into Mem0 DB")]:::database
    end

    classDef user fill:#f3f4f6,stroke:#6b7280,stroke-width:1.5px,color:#111827;
    classDef frontend fill:#dbeafe,stroke:#3b82f6,stroke-width:1.5px,color:#1e3a8a;
    classDef api fill:#f3e8ff,stroke:#a855f7,stroke-width:1.5px,color:#581c87;
    classDef agent fill:#fef3c7,stroke:#f59e0b,stroke-width:1.5px,color:#78350f;
    classDef database fill:#dcfce7,stroke:#22c55e,stroke-width:1.5px,color:#14532d;
    classDef external fill:#ffe4e6,stroke:#f43f5e,stroke-width:1.5px,color:#881337;
```

---

## Retrieval-Augmented Generation (RAG) Pipeline

```mermaid
flowchart LR
    subgraph Ingestion["Document Ingestion & Indexing"]
        PDF[PDF Upload]:::frontend --> Docling[Docling Parser Container]:::api
        Docling --> Chunks[Text Chunking & Metadata Extraction]:::agent
        Chunks --> Embed[Nomic Embed Text via Ollama]:::agent
        Embed --> PineconeDB[("Pinecone Vector DB<br/>(mental-health-rag)")]:::database
    end
    
    subgraph Retrieval["Query & Context Retrieval"]
        UserQuery[User Educational Query]:::user --> QueryEmbed[Generate Query Vector]:::agent
        QueryEmbed --> VectorSearch[Cosine Similarity Search]:::agent
        PineconeDB --> VectorSearch
        VectorSearch --> Context[Retrieve Top K Context Chunks]:::frontend
    end

    classDef user fill:#f3f4f6,stroke:#6b7280,stroke-width:1.5px,color:#111827;
    classDef frontend fill:#dbeafe,stroke:#3b82f6,stroke-width:1.5px,color:#1e3a8a;
    classDef api fill:#f3e8ff,stroke:#a855f7,stroke-width:1.5px,color:#581c87;
    classDef agent fill:#fef3c7,stroke:#f59e0b,stroke-width:1.5px,color:#78350f;
    classDef database fill:#dcfce7,stroke:#22c55e,stroke-width:1.5px,color:#14532d;
    classDef external fill:#ffe4e6,stroke:#f43f5e,stroke-width:1.5px,color:#881337;
```

---

## Crisis Detection & Safety Flow

```mermaid
flowchart TD
    Input([Incoming User Message]):::user --> Scan{Scan Crisis Keywords}:::agent
    
    Scan -->|Self-Harm / Suicidal Intent| Severe[Severe Crisis Triggered]:::external
    Scan -->|General Distress / Safe| Mild[Mild / Standard Conversation]:::frontend
    
    Severe --> Action1[Trigger Emergency Response UI Modal]:::frontend
    Severe --> Action2[Send Alert Email to Emergency Contact via Resend]:::api
    Severe --> Action3[Display 988 Suicide & Crisis Lifeline Information]:::user
    Severe --> Action4[Halt LLM Generation & Disable Input]:::external
    
    Mild --> LLM[Proceed to Multi-Agent Orchestration Pipeline]:::agent

    classDef user fill:#f3f4f6,stroke:#6b7280,stroke-width:1.5px,color:#111827;
    classDef frontend fill:#dbeafe,stroke:#3b82f6,stroke-width:1.5px,color:#1e3a8a;
    classDef api fill:#f3e8ff,stroke:#a855f7,stroke-width:1.5px,color:#581c87;
    classDef agent fill:#fef3c7,stroke:#f59e0b,stroke-width:1.5px,color:#78350f;
    classDef database fill:#dcfce7,stroke:#22c55e,stroke-width:1.5px,color:#14532d;
    classDef external fill:#ffe4e6,stroke:#f43f5e,stroke-width:1.5px,color:#881337;
```

---

## Database Entity-Relationship Schema

```mermaid
erDiagram
    users ||--o{ user_profiles : "owns"
    users ||--o{ chat_messages : "sends"
    users ||--o{ fitbit_tokens : "authorizes"
    users ||--o{ fitbit_data : "records"
    users ||--o{ emergency_contacts : "configures"

    users {
        uuid id PK
        string email
        timestamp created_at
    }

    user_profiles {
        uuid id PK
        uuid user_id FK
        string username
        string email
        string role
        timestamp created_at
    }

    chat_messages {
        uuid id PK
        uuid user_id FK
        string role
        text content
        timestamp created_at
    }

    fitbit_tokens {
        uuid id PK
        uuid user_id FK
        string fitbit_user_id
        string access_token
        string refresh_token
        timestamp expires_at
        string scope
        timestamp created_at
    }

    fitbit_data {
        uuid id PK
        uuid user_id FK
        string fitbit_user_id
        date date
        string type
        jsonb data
        timestamp created_at
    }

    emergency_contacts {
        uuid id PK
        uuid user_id FK
        string contact_name
        string contact_email
        string contact_phone
        string relationship
        timestamp created_at
    }
```
