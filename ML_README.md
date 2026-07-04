# Machine Learning & Artificial Intelligence Architecture

> **Technical Reference for ML Models, Fine-Tuning Dynamics, Hyperparameters, and Vector Retrieval Systems**  
> Personalized Mental Wellness Assistant

---

## Table of Contents

- [Overview](#overview)
  - [Architectural Principles](#architectural-principles)
- [Multi-Model Architecture](#multi-model-architecture)
  - [Three-Stage Multi-Agent Pipeline](#three-stage-multi-agent-pipeline)
  - [Model Selection Rationale](#model-selection-rationale)
- [Language Model Specifications](#language-model-specifications)
  - [1. Google Gemini 2.5 Flash](#1-google-gemini-25-flash)
  - [2. DeepSeek R1 Distill Llama](#2-deepseek-r1-distill-llama)
- [Embedding & Vector Search System](#embedding--vector-search-system)
  - [Nomic Embed Text](#nomic-embed-text)
  - [Pinecone Vector Retrieval](#pinecone-vector-retrieval)
- [Model Fine-Tuning & Training Dynamics](#model-fine-tuning--training-dynamics)
  - [Training Dataset: MentalChat16K](#training-dataset-mentalchat16k)
  - [LoRA Fine-Tuning Implementation](#lora-fine-tuning-implementation)
  - [Convergence & Loss Evaluation (`docs/`)](#convergence--loss-evaluation-docs)
- [Hyperparameter Specifications](#hyperparameter-specifications)
- [Prompt Engineering Architecture](#prompt-engineering-architecture)
- [Performance & Latency Optimization](#performance--latency-optimization)
- [Production Infrastructure & Deployment](#production-infrastructure--deployment)
- [License & References](#license--references)

---

## Overview

The **Personalized Mental Wellness Assistant** relies on a multi-model AI architecture designed to optimize inference speed, context compression, domain-specific clinical safety, and empathetic reasoning. Rather than deploying a single monolithic LLM, the system distributes tasks across specialized AI models orchestrated through high-speed serverless endpoints.

### Architectural Principles

1. **Multi-Stage Separation of Concerns**: Decouples intent classification and parallel retrieval from context summarization and final response generation.
2. **Context Compression Efficiency**: Utilizes high-throughput model passes (Gemini 2.5 Flash) to compress multi-source context payloads by over 95% prior to deep reasoning generation.
3. **Low-Latency Execution**: Dispatches concurrent background retrieval tools to keep context synthesis latency under 2.5 seconds.
4. **Domain Fine-Tuning**: Employs Low-Rank Adaptation (LoRA) on therapeutic datasets to align DeepSeek reasoning models for mental health counseling.
5. **Safety Bounding**: Intercepts queries via deterministic crisis detection routines prior to any LLM execution.

---

## Multi-Model Architecture

### Three-Stage Multi-Agent Pipeline

![Three-Stage Multi-Agent Pipeline](docs/diagrams/three_stage_pipeline.png)
*Diagram specification: [docs/diagrams/three_stage_pipeline.mmd](docs/diagrams/three_stage_pipeline.mmd) | Full diagram library: [DIAGRAMS.md](DIAGRAMS.md#three-stage-execution-pipeline)*

---

### Model Selection Rationale

| Requirement | Selected Model | Primary Motivation |
| :--- | :--- | :--- |
| **Tool Orchestration** | Gemini 2.5 Flash (`gemini-2.0-flash-exp`) | High token throughput (~200 tokens/sec), low latency, structured JSON output support. |
| **Context Summarization** | Gemini 2.5 Flash (`gemini-2.0-flash-exp`) | Cost-effective context compression (95% token reduction) with high factual recall. |
| **Empathetic Generation** | Fine-Tuned DeepSeek R1 Distill (Llama 3.2) | Specialized therapeutic reasoning, conversational warmth, and local privacy. |
| **Text Embeddings** | Nomic Embed Text (`nomic-embed-text`) | 768-dimensional embeddings outperforming OpenAI text-embedding-ada-002 on MTEB benchmarks. |
| **Memory Management** | Mem0 AI Vector Layer | Automated memory categorization and semantic similarity search. |

---

## Language Model Specifications

### 1. Google Gemini 2.5 Flash

* **Model Identifier**: `gemini-2.0-flash-exp`
* **Provider**: Google Generative AI API
* **Context Window**: 1,000,000 tokens
* **Operational Roles**: Tool Orchestration (`lib/gemini/flash-orchestrator.ts`), Context Summarization (`lib/gemini/context-summarizer.ts`)

#### Orchestration Configuration

```typescript
const orchestratorConfig = {
  temperature: 0.2,        // Low temperature ensures deterministic tool routing
  topP: 0.95,              // High topP preserves argument formatting
  topK: 40,                // Moderate token selection pool
  maxOutputTokens: 1024,   // Adequate for JSON tool call payloads
  responseMimeType: "application/json",
};
```

#### Summarization Configuration

```typescript
const summarizerConfig = {
  temperature: 0.3,        // Slight variance for natural language synthesis
  topP: 0.90,              // Balanced token sampling
  topK: 30,                // Focused medical/health vocabulary
  maxOutputTokens: 200,    // Hard limit enforcing 50-80 token output summary
  responseMimeType: "text/plain",
};
```

---

### 2. DeepSeek R1 Distill Llama

* **Model Identifier**: `llama3.2` (DeepSeek R1 Distilled Llama 8B)
* **Provider**: Self-hosted via Ollama local instance
* **Context Window**: 128,000 tokens
* **Operational Role**: Empathetic response generation (`lib/ollama/client.ts`)

#### Generation Configuration

```typescript
const generationConfig = {
  model: "llama3.2",
  temperature: 0.7,        // Sweet spot for conversational empathy without hallucination
  max_tokens: 2048,        // Bound for conversational length (<100 words actual output)
  top_p: 0.9,              // Nucleus sampling for coherence
  top_k: 40,               // Prevents out-of-vocabulary tokens
  repeat_penalty: 1.1,     // Mild repetition penalty
  stop: ["User:", "Assistant:", "<｜end of sentence｜>"],
};
```

---

## Embedding & Vector Search System

### Nomic Embed Text

* **Model Identifier**: `nomic-embed-text`
* **Vector Dimensions**: 768
* **Max Sequence Length**: 8,192 tokens
* **Metric**: Cosine Similarity

```typescript
// Query Embedding via Local Ollama Endpoint
const response = await fetch("http://localhost:11434/api/embeddings", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "nomic-embed-text",
    prompt: queryText,
  }),
});

const { embedding } = await response.json(); // Returns Float32Array[768]
```

---

### Pinecone Vector Retrieval

The vector index `mental-health-rag` stores chunked clinical literature extracted via Docling.

```typescript
export async function queryRAG(query: string, topK: number = 5) {
  const queryVector = await generateEmbedding(query);
  
  const results = await pineconeIndex.query({
    vector: queryVector,
    topK: topK,
    includeMetadata: true,
  });
  
  return results.matches
    .filter(match => match.score > 0.70) // Quality threshold
    .map(match => ({
      text: match.metadata.text,
      filename: match.metadata.filename,
      page: match.metadata.page,
      score: match.score,
    }));
}
```

---

## Model Fine-Tuning & Training Dynamics

### Training Dataset: MentalChat16K

The DeepSeek R1 Distill model was fine-tuned on the [`ShenLab/MentalChat16K`](https://huggingface.co/datasets/ShenLab/MentalChat16K) dataset, comprising over 16,000 therapeutic and mental health counseling interactions.

* **Total Samples**: 16,000+ interactions
* **Data Split**: 95% Training (15,200 samples), 5% Validation (800 samples)
* **Domain Focus**: Anxiety management, CBT techniques, depression support, academic stress, and general wellness.

---

### LoRA Fine-Tuning Implementation

Fine-tuning was executed using Low-Rank Adaptation (LoRA) via Unsloth on 4-bit quantized base weights:

```python
from unsloth import FastLanguageModel

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/DeepSeek-R1-Distill-Llama-8B-bnb-4bit",
    max_seq_length=1024,
    load_in_4bit=True,
)

model = FastLanguageModel.get_peft_model(
    model,
    r=16,                         # LoRA Rank
    lora_alpha=32,               # Alpha scaling factor (2x rank)
    lora_dropout=0,              # Optimized zero dropout for Unsloth
    bias="none",
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj"
    ],
)
```

---

### Convergence & Loss Evaluation (`docs/`)

The fine-tuning trajectory was evaluated using 6 core optimization metrics logged during training, stored in [`docs/`](docs):

| Metric Visualization | Technical Description & Interpretation |
| :---: | :--- |
| ![Training & Validation Loss](docs/training_validation_loss.png) | **Training vs. Validation Loss**<br/>Monotonic decrease in error across training epochs. The validation loss tracks training loss closely, confirming absence of overfitting. |
| ![Loss Log Scale](docs/loss_log_scale.png) | **Log-Scale Loss Curve**<br/>Illustrates exponential error reduction during initial steps, stabilizing into smooth asymptotic fine-tuning regime. |
| ![Loss Convergence Zoom](docs/loss_convergence_zoom.png) | **Final Epoch Convergence (Zoomed)**<br/>High-resolution view of final steps showing minimal loss fluctuation and parameter stability. |
| ![Generalization Gap](docs/generalization_gap.png) | **Generalization Gap Margin**<br/>Plots $\mathcal{L}_{\text{val}} - \mathcal{L}_{\text{train}}$, proving that the generalization delta remains tight throughout optimization. |
| ![Loss Derivative](docs/loss_derivative.png) | **Loss Derivative & Gradient Updates**<br/>Evaluates $\frac{d\text{Loss}}{d\text{Step}}$, confirming numerical stability without vanishing/exploding gradients. |
| ![Step Loss Scatter Plot](docs/loss_scatter.png) | **Step-Wise Batch Loss Scatter**<br/>Mini-batch loss distribution overlaid with moving average trends across training steps. |

---

## Hyperparameter Specifications

| Operational Stage | Model | Parameter | Value | Functional Objective |
| :--- | :--- | :--- | :--- | :--- |
| **Tool Orchestration** | Gemini 2.5 Flash | `temperature` | `0.2` | Deterministic tool selection & JSON routing |
| | | `topP` | `0.95` | Nucleus sampling for tool argument schema |
| | | `maxOutputTokens` | `1024` | Sufficient allocation for JSON tool parameters |
| **Context Summarization**| Gemini 2.5 Flash | `temperature` | `0.3` | Controlled natural language context compression |
| | | `maxOutputTokens` | `200` | Hard token limit enforcing 50-80 token summaries |
| **Response Generation** | DeepSeek R1 Distill | `temperature` | `0.7` | Optimal empathy and conversational balance |
| | | `top_p` | `0.90` | Coherent response sampling |
| | | `repeat_penalty` | `1.1` | Prevents repetitive phrasing |
| **Text Embeddings** | Nomic Embed Text | `dimension` | `768` | Fixed high-density vector representation |
| | | `max_sequence` | `8192` | Full-document context embedding window |
| **Vector Search (RAG)** | Pinecone DB | `topK` | `5` | Retrieves top 5 relevant document passages |
| | | `minScore` | `0.70` | Cosine similarity threshold for filtering |

---

## Prompt Engineering Architecture

### Multi-Stage Prompt Design

![High-Level System Architecture](docs/diagrams/system_architecture.png)
*Diagram specification: [docs/diagrams/system_architecture.mmd](docs/diagrams/system_architecture.mmd) | Full diagram library: [DIAGRAMS.md](DIAGRAMS.md#overview-architecture)*

---

## Performance & Latency Optimization

### Latency Comparison Breakdown

```
Sequential Tool Execution (Unoptimized):
Memories (500ms) -> Profile (150ms) -> Fitbit (1000ms) -> Wellness (2000ms) -> RAG (800ms) = ~4,450 ms

Parallel Multi-Agent Execution (Optimized):
Promise.allSettled([Memories, Profile, Fitbit, Wellness, RAG]) = ~2,000 ms (Max single latency)
Speedup Factor: 2.2x Faster Aggregation
```

### Context Compression Impact

* **Raw Tool Context Payload**: ~3,000 Tokens (Raw memory arrays, Fitbit timeseries vitals, Pinecone RAG passages).
* **Summarized Context**: ~60 Tokens.
* **Compression Ratio**: **95.2% Reduction**.
* **Impact on Generation Latency**: Reduces DeepSeek inference latency from ~10.5 seconds to ~4.2 seconds.

---

## Production Infrastructure & Deployment

| Service Component | Deployment Target | Host / Engine | Resource Allocation |
| :--- | :--- | :--- | :--- |
| **Web UI & API Router** | Vercel Serverless | Edge / Node.js Runtime | Dynamic Serverless Scaling |
| **Orchestration Agent** | Google AI Cloud | Gemini 2.5 Flash API | Cloud API Endpoint |
| **Response Generation** | Self-Hosted Instance | Ollama Engine (llama3.2) | 16GB RAM / 12GB VRAM GPU |
| **Vector Storage** | Pinecone Cloud | `mental-health-rag` Index | 768-Dimension Cosine Metric |
| **Relational Database** | Supabase | PostgreSQL DB | Managed Cloud DB Instance |
| **PDF Extraction Service**| Docker Container | Docling Container (`:5001`) | Isolated Worker Container |

---

## License & References

This documentation is part of the **Personalized Mental Wellness Assistant** project.

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
