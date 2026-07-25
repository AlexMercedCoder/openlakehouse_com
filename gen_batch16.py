import os

dest = "/home/alexmerced/development/personal/Personal/website/2026/openlakehouse/src/content/kb/"

deep_dive = """

## The Open Data Lakehouse Context

The open data lakehouse has become the dominant enterprise data architecture because it combines the scalability and cost efficiency of cloud object storage with the governance, performance, and reliability that were previously exclusive to traditional data warehouses. This convergence is accelerating with the integration of AI and agentic systems on top of lakehouse infrastructure.

Modern lakehouses built on Apache Iceberg, Delta Lake, or Apache Hudi provide ACID transactions, schema evolution, time travel, and branching directly over Amazon S3, Google Cloud Storage, or Azure Blob Storage. Query engines like Dremio, Trino, and Apache Spark execute massively parallel analytical workloads over these open formats without requiring proprietary lock-in.

AI agents and agentic analytics systems are now being layered directly on top of this open lakehouse stack. The agent does not replace the data engineer; instead, it consumes the well-organized semantic layer, the governed metadata catalog, and the low-latency query APIs to autonomously answer complex business questions, generate analytical reports, and trigger data pipeline actions.

The convergence of columnar storage (Parquet), open table formats (Iceberg), distributed compute (Spark/Dremio), semantic layers, and large language models represents the next major platform wave in enterprise computing. Organizations that invest now in clean, governed, well-documented data lakehouses will have a fundamental competitive advantage as agentic AI systems mature.

### Why Governance Matters More Than Ever

When an AI agent autonomously executes SQL queries, the stakes of poor data governance become enormous. In a human-analyst workflow, the analyst can apply domain knowledge to catch a suspicious result. An autonomous agent may not have this safeguard. Organizations must therefore invest in data quality frameworks, column-level documentation, and strict access controls before deploying agentic analytics systems over their lakehouses.

Catalogs like Apache Polaris (formerly the Iceberg REST Catalog), AWS Glue, and Unity Catalog provide the metadata layer that allows AI agents to understand the meaning and structure of available data assets. Without a rich catalog, an agent is effectively blind.

### The Role of the Semantic Layer

The semantic layer is arguably the most important enabler of agentic analytics. It translates raw, technical database schemas into business-friendly concepts. Instead of the agent needing to understand that `rev_lt` means `lifetime_revenue`, the semantic layer exposes a clean `Lifetime Revenue` metric with documented lineage, ownership, and refresh frequency.

Tools like Dremio's semantic layer, dbt metrics, and Apache Superset's semantic capabilities all serve this translation function. As AI models improve at consuming semantic layer specifications, the combination of a governed lakehouse and a rich semantic layer will empower agents to answer virtually any business question without human SQL mediation.

"""

articles = {
    "ai-agents.md": {
        "title": "AI Agents",
        "desc": "A comprehensive guide to AI Agents, their architecture, the agentic loop, and how they interact with enterprise data systems.",
        "tags": '["ai", "agents", "llm", "agentic analytics"]',
        "body": """
## Core Definition

An AI Agent is an autonomous software system that uses a Large Language Model (LLM) as its core reasoning engine to perceive its environment, form plans, execute multi-step tasks using external tools, and adapt its behavior based on the results, all without requiring constant human intervention for each individual step.

The term "agent" specifically denotes autonomy and goal-directedness that goes far beyond a standard chatbot or generative AI assistant. Where a chatbot responds to a single prompt with a single response, an agent receives a high-level goal ("Analyze this quarter's revenue decline and identify the top three contributing factors") and autonomously executes a sequence of research, computation, and synthesis steps to deliver a complete answer.

## The Agentic Loop

The foundational operational pattern of an AI agent is the **ReAct loop** (Reasoning + Acting), a continuous cycle that repeats until the agent determines the goal has been achieved:

1. **Perceive:** The agent receives the initial goal and any available context from its environment (database schemas, tool descriptions, prior conversation history).
2. **Reason and Plan:** The LLM "thinks" about the goal by breaking it into smaller subtasks, determining the correct sequence of actions, and selecting the appropriate tool for each step.
3. **Act (Tool Use):** The agent executes the selected tool by calling an external function, running a SQL query against a data lakehouse, searching a vector database, or invoking an API.
4. **Observe:** The agent reads the result returned by the tool and incorporates it into its working context.
5. **Evaluate:** The agent assesses whether the current output satisfies the goal. If not, it re-enters the loop with an updated plan.

This cycle gives agents the ability to recover from errors, pivot their approach when initial strategies fail, and produce results that require multi-step reasoning across multiple data sources.

## Tool Use and Function Calling

The defining capability that separates an agent from a basic LLM is access to **tools**. An agent's tools are a set of registered functions it can call to interact with the external world. These include:

- **Database Query Tools:** Execute SQL against a Dremio semantic layer, Trino, or Snowflake and return tabular results.
- **Search Tools:** Query a vector database to retrieve semantically relevant documents.
- **Code Execution Tools:** Run Python or SQL code in a sandboxed environment to perform computations.
- **API Tools:** Call REST APIs to retrieve live data from external services.
- **File System Tools:** Read and write files, trigger data pipeline runs, or update records.

Modern LLMs implement tool use through **function calling**: the model generates a structured JSON object specifying the tool name and arguments, the host system intercepts and executes it, and the result is injected back into the model's context for the next reasoning step.

The **Model Context Protocol (MCP)**, developed by Anthropic, has emerged as a standardized interface that allows a single agent to connect to many different data sources and tools using a consistent protocol, eliminating the need for custom per-tool integration code.

## Memory Architecture

Effective AI agents maintain memory across their reasoning steps and even across separate sessions. Memory is organized into four tiers:

1. **In-Context Memory (Working Memory):** The contents of the current context window. Includes the conversation so far, retrieved documents, and recent tool outputs.
2. **External Short-Term Memory:** A temporary key-value store (like Redis) that persists facts across multiple sequential agent calls within a session.
3. **Long-Term Episodic Memory:** A vector database storing summaries of past agent sessions, allowing the agent to recall "what happened last time I analyzed this customer."
4. **Long-Term Semantic Memory:** The enterprise knowledge base and documentation, indexed as vector embeddings and retrieved via RAG when relevant.

## Agents in the Open Data Lakehouse

The open data lakehouse architecture is uniquely positioned to serve as the data backbone for AI agent systems. A well-organized Iceberg lakehouse with a rich semantic layer, governed metadata catalog, and documented column descriptions provides everything an agent needs to autonomously generate and execute analytical SQL queries with high accuracy.

Dremio's semantic layer, for example, exposes business-friendly metric definitions, pre-joined virtual datasets, and rich column documentation. An agent that knows the semantic layer exists can query it in natural language, generate valid SQL, execute it via Dremio's Arrow Flight SQL interface, and deliver instant analytical insights to business stakeholders.

## Multi-Agent Orchestration

As task complexity grows, organizations are deploying systems of cooperating agents rather than a single monolithic agent. A **Planner Agent** decomposes the high-level goal, delegates subtasks to **Specialist Agents** (e.g., a SQL Agent, a Visualization Agent, a Report Writing Agent), and then synthesizes their results into a final deliverable. This mirrors how a human team of specialized analysts collaborates on a complex project.

## Governance and Safety

Autonomous agents require governance guardrails. An agent running SQL queries directly against production systems without controls could accidentally overwrite data, exfiltrate sensitive PII, or consume massive compute resources. Best practices include:

- Running agents against read-only query endpoints.
- Enforcing row-level and column-level security at the catalog level so the agent cannot access data the user has no permission to see.
- Implementing human-in-the-loop approval gates for destructive or expensive operations.
- Logging every tool call and intermediate reasoning step for full auditability.
"""
    },
    "large-language-models.md": {
        "title": "Large Language Models (LLMs)",
        "desc": "An authoritative deep dive into Large Language Models, their Transformer architecture, training process, and role in enterprise analytics.",
        "tags": '["ai", "llm", "transformer", "agentic analytics"]',
        "body": """
## Core Definition

A Large Language Model (LLM) is a type of artificial intelligence model trained on vast quantities of text data to understand, generate, and reason with human language. LLMs are based on the Transformer architecture and are characterized by having billions (often hundreds of billions) of parameters — the numerical weights that the model adjusts during training to encode knowledge about language, facts, reasoning patterns, and world concepts.

The "large" in Large Language Model refers to two dimensions: the volume of training data (often trillions of tokens of text from the internet, books, and code) and the number of model parameters (ranging from 7 billion to over 1 trillion parameters in frontier models as of 2025).

LLMs have become the foundational intelligence layer for AI agents, analytical chatbots, code assistants, and the emerging field of agentic analytics in the open data lakehouse ecosystem.

## The Transformer Architecture

Almost every modern LLM is a **decoder-only Transformer**. The original Transformer was introduced in the 2017 paper "Attention Is All You Need" by Vaswani et al. at Google. The decoder-only variant was popularized by OpenAI's GPT series and has become the universal standard for generative language models.

**Tokenization and Embedding:** Before an LLM can process text, it must convert the text into a sequence of tokens. A tokenizer breaks text into subword units using algorithms like Byte Pair Encoding (BPE). The string "data lakehouse" might become the tokens ["data", " lake", "house"]. Each token is then converted into a high-dimensional vector (an embedding) using a learned lookup table.

**Positional Encoding:** Since the Transformer processes all tokens simultaneously rather than sequentially, it has no inherent sense of word order. Positional encodings are injected into the embeddings to give the model information about each token's position in the sequence. Modern models use Rotary Positional Embeddings (RoPE), which scale more gracefully to very long sequences than the original sinusoidal encoding.

**Self-Attention (The Core Mechanism):** Self-attention is the mechanism that allows the model to relate each token to every other token in the sequence. For each token, the model computes a Query (Q), a Key (K), and a Value (V) vector. The attention score between two tokens is computed as the dot product of Q and K, normalized and passed through a softmax function. These scores are then used to produce a weighted sum of the Value vectors, effectively telling the model "when thinking about this token, pay the most attention to these other tokens."

**Multi-Head Attention:** Modern models run many attention heads in parallel, each learning to attend to different aspects of the relationships between tokens (e.g., one head might track syntactic dependencies, another might track coreference). The outputs of all heads are concatenated and linearly projected.

**Feed-Forward Network:** After attention, each token's representation passes through a position-wise Feed-Forward Network (FFN), typically using the SwiGLU activation function in modern models. This is where much of the model's factual knowledge is thought to be stored.

**Residual Connections and Normalization:** Residual connections (skip connections) allow gradients to flow directly through the network during training, preventing vanishing gradient problems at extreme depths. Modern models use RMSNorm rather than the original LayerNorm.

## The Training Process

LLMs are trained in multiple phases:

**Pre-training (Self-Supervised Learning):** The model is trained on a massive corpus of text using a "next token prediction" objective: given all previous tokens in a sequence, predict the next token. This forces the model to internalize the statistical structure of language, facts about the world, and implicit reasoning patterns. Pre-training a frontier LLM requires millions of GPU-hours and costs tens of millions of dollars.

**Supervised Fine-Tuning (SFT):** After pre-training, the model is fine-tuned on a curated dataset of high-quality demonstrations of desired behavior (question-answer pairs, instruction-following examples). This aligns the model with the expected format of assistant responses.

**Reinforcement Learning from Human Feedback (RLHF):** Human raters rank model outputs by quality, and this preference data is used to train a reward model. The LLM is then further optimized using Proximal Policy Optimization (PPO) to maximize the learned reward signal, aligning it more closely with human preferences for helpfulness, harmlessness, and honesty.

## Mixture of Experts (MoE)

A major architectural innovation in frontier models is the Mixture of Experts (MoE) design. Instead of activating all model parameters for every token (which is computationally expensive), MoE models use a learned Router that selects a small subset of "expert" sub-networks to process each token. This allows models to have trillions of total parameters while only activating a small fraction during any given forward pass, making inference dramatically faster and cheaper.

## LLMs and the Data Lakehouse

LLMs are the reasoning engines that power the agentic analytics revolution. When an LLM is equipped with a tool that can execute SQL against a Dremio semantic layer or query an Apache Iceberg table, it transforms from a text generator into an autonomous data analyst capable of formulating complex multi-step analytical queries. The quality of the underlying lakehouse data and its documentation directly determines the quality of the LLM's analytical output.
"""
    },
    "retrieval-augmented-generation.md": {
        "title": "Retrieval-Augmented Generation (RAG)",
        "desc": "A comprehensive guide to Retrieval-Augmented Generation (RAG), the technique that grounds LLMs in accurate, real-time enterprise data.",
        "tags": '["ai", "rag", "vector search", "llm"]',
        "body": """
## Core Definition

Retrieval-Augmented Generation (RAG) is an AI architecture pattern that enhances a Large Language Model's responses by dynamically retrieving relevant information from an external knowledge base and injecting that information into the model's context window before it generates a response.

Without RAG, an LLM can only reason based on information that was present in its training data. This creates two critical problems for enterprise use:
1. **Knowledge Cutoff:** The model has no knowledge of events after its training cutoff date.
2. **Hallucination:** When the model does not know an answer, it tends to generate plausible-sounding but factually incorrect statements.

RAG solves both problems by giving the model access to a live, accurate, enterprise-specific knowledge base at inference time.

## The RAG Pipeline Architecture

A standard RAG pipeline consists of two phases: an offline Indexing phase and an online Retrieval and Generation phase.

**Indexing Phase:**
1. Documents (PDF reports, database schema documentation, company policies, technical manuals) are collected from source systems.
2. Documents are split into smaller chunks (typically 256 to 1024 tokens each) using a chunking strategy that preserves semantic coherence.
3. Each chunk is encoded into a high-dimensional vector embedding using an embedding model (e.g., OpenAI's text-embedding-3-large, Cohere Embed, or open-source alternatives like BGE).
4. The vectors and their corresponding raw text chunks are stored in a vector database (Pinecone, Weaviate, Milvus, Qdrant, or pgvector in PostgreSQL).

**Retrieval and Generation Phase:**
1. The user submits a query (e.g., "What was our total revenue in APAC for Q3 2025?").
2. The query is encoded into a vector embedding using the same embedding model.
3. The vector database performs an Approximate Nearest Neighbor (ANN) search to find the top-K most semantically similar chunks.
4. The retrieved chunks are formatted into a context block and injected into the LLM's prompt: "Using only the following context, answer the user's question: [retrieved chunks]".
5. The LLM generates a response grounded in the retrieved facts rather than relying on potentially stale or incorrect training data.

## Advanced RAG Techniques

**Hybrid Search:** Combining dense vector search (semantic similarity) with sparse keyword search (BM25/TF-IDF) captures both conceptual similarity and exact term matching. This is important when the query contains specific identifiers like product codes, error codes, or employee IDs that a vector search might not retrieve accurately.

**Query Rewriting:** Before retrieval, the agent or a secondary LLM rewrites the user's query to be more specific, unambiguous, or to expand it with synonyms. This improves retrieval recall significantly.

**Re-Ranking:** After the initial retrieval returns the top-K results, a cross-encoder re-ranker model scores each retrieved chunk against the query with higher precision (but also higher latency), reordering the results so the most relevant chunks are closest to the top.

**HyDE (Hypothetical Document Embedding):** Instead of embedding the query directly, the LLM first generates a hypothetical answer to the query. This hypothetical answer is then embedded and used as the search vector, because it more closely resembles the style and vocabulary of the actual answer documents in the knowledge base.

**Contextual Retrieval (Anthropic):** Each chunk is enriched with a short contextual summary generated by the LLM before indexing, using the broader document as context. This prevents chunks from losing their contextual meaning when read in isolation.

## GraphRAG

Microsoft Research introduced GraphRAG in 2024, which augments traditional vector retrieval with a knowledge graph layer. Instead of treating all documents as isolated chunks, GraphRAG extracts entities and relationships and builds a graph. When answering a query, the system traverses relevant paths in the graph, enabling "multi-hop" reasoning that connects facts across multiple documents. This is particularly valuable for complex analytical questions that require chaining multiple relationships (e.g., "Which executives approved projects that involved vendors later found to be non-compliant?").

## RAG in the Data Lakehouse Context

In an open data lakehouse environment, RAG is used to ground AI agents in two types of knowledge:

1. **Structured Data Retrieval:** Using Text-to-SQL rather than vector search, the agent retrieves exact numerical answers from Iceberg tables via SQL queries executed against the Dremio semantic layer.
2. **Unstructured Knowledge Retrieval:** Using vector search, the agent retrieves relevant documentation, policy documents, schema descriptions, and past analytical reports from the vector database.

The combination of these two retrieval pathways gives the agent access to both precise quantitative data and rich qualitative context, enabling it to produce comprehensive, accurate analytical narratives.
"""
    },
    "vector-search.md": {
        "title": "Vector Search",
        "desc": "An authoritative guide to Vector Search, the semantic search technique powering modern AI retrieval and recommendation systems.",
        "tags": '["ai", "vector search", "embeddings", "rag"]',
        "body": """
## Core Definition

Vector Search (also called semantic search or similarity search) is a search technique that retrieves results based on the conceptual meaning and semantic similarity of a query rather than exact keyword matches. Instead of finding documents that contain the literal words in the query, vector search finds documents whose meaning is closest to the query's meaning.

The mechanism underlying vector search is the representation of text (or images, audio, or other data) as high-dimensional numerical vectors called embeddings. Two pieces of text with similar meanings will have embeddings that are geometrically close in the vector space, even if they share no common words. For example, the query "What is my account balance?" will retrieve documents containing "remaining funds", "current total", and "checking account summary" because their semantic content is similar.

## How Vector Search Works

**Step 1: Encoding with Embedding Models**
Both the query and all candidate documents in the search corpus must be encoded into vectors using an embedding model. Embedding models are trained (typically using contrastive learning) to place semantically similar texts near each other in the high-dimensional space and push dissimilar texts apart. The resulting vectors typically have 768 to 3,072 dimensions.

**Step 2: Approximate Nearest Neighbor (ANN) Search**
A naive similarity search would require computing the distance between the query vector and every single document vector in the corpus. For a corpus of 100 million documents, this exhaustive search is computationally impractical at query time.

Approximate Nearest Neighbor (ANN) algorithms solve this by using pre-built index structures that allow the search to find highly similar results dramatically faster, at the cost of occasionally missing the exact nearest neighbor.

The most widely used ANN algorithm in production vector search systems is HNSW (Hierarchical Navigable Small World), a graph-based index that organizes vectors in a hierarchy of layers, allowing logarithmic search time even in very large datasets.

**Step 3: Similarity Scoring**
The most common similarity metric for text vectors is cosine similarity, which measures the cosine of the angle between two vectors. A score of 1.0 means the vectors point in exactly the same direction (maximum similarity); a score of 0.0 means they are orthogonal (completely unrelated). The search returns the top-K results sorted by descending cosine similarity score.

## HNSW: The Dominant ANN Index

Hierarchical Navigable Small World (HNSW) builds a multi-layer graph where each node is a document vector. The top layers contain a sparse set of "hub" nodes connected across large distances, while lower layers progressively densify the connections. During a search, the algorithm enters the graph at a random top-layer node, greedily navigates toward the query vector, descends to successively denser layers, and emerges with the approximate nearest neighbors.

HNSW trades a small amount of recall accuracy for enormous speed gains. Searches on datasets of tens of millions of vectors typically complete in single-digit milliseconds.

## IVF (Inverted File Index)

The Inverted File Index approach first applies k-means clustering to partition the entire vector space into a fixed number of clusters (Voronoi cells). During a search, rather than searching all vectors, the system only searches the vectors within the closest clusters to the query. This provides excellent throughput for very large datasets but requires a training step and is less precise than HNSW.

## Hybrid Search

Pure vector search excels at semantic understanding but can fail on precise keyword matching. If a user searches for the exact product code "SKU-12345-XL-RED", a vector search may not return the exact match if nearby semantic neighbors include different product descriptions.

Hybrid search combines dense vector search with sparse keyword search (typically BM25, the classic information retrieval ranking function). The scores from both searches are combined using Reciprocal Rank Fusion (RRF) or a learned linear combination, giving the best results for queries that require both semantic understanding and exact term matching.

## Vector Search in the Lakehouse Ecosystem

Vector search is becoming integrated directly into the open data lakehouse stack. Some organizations store their embedding vectors directly in Apache Iceberg tables alongside other data, using the lakehouse as the single source of truth for both structured metrics and unstructured vector indexes. This enables point-in-time queries over the vector index (by leveraging Iceberg's snapshot isolation and time travel), consistent governance of embedding data, and unified catalog management.
"""
    },
    "vector-databases.md": {
        "title": "Vector Databases",
        "desc": "A comprehensive guide to Vector Databases, the purpose-built infrastructure for storing and querying high-dimensional embeddings at scale.",
        "tags": '["ai", "vector databases", "embeddings", "rag"]',
        "body": """
## Core Definition

A Vector Database is a specialized database management system designed to store, index, and efficiently retrieve high-dimensional vector embeddings. Vector databases are the dedicated persistence and retrieval layer for AI applications that require semantic search, including Retrieval-Augmented Generation (RAG) systems, recommendation engines, image similarity search, anomaly detection, and AI agent long-term memory.

While traditional relational databases are optimized for exact lookups on structured fields (e.g., "find the row where user_id = 42"), and full-text search engines are optimized for keyword matching, vector databases are specifically engineered for the computationally demanding task of Approximate Nearest Neighbor (ANN) search across collections containing millions or billions of high-dimensional floating-point vectors.

## Core Components

**Vector Storage:** The vector database persistently stores each vector (the embedding) alongside its associated metadata (the original text chunk, document source, creation timestamp, category tags, etc.) and its payload (the raw document data used to construct the LLM context). Modern vector databases like Weaviate and Qdrant store all three components in a single system, eliminating the need for a separate metadata database.

**ANN Index:** The engine of the vector database is its ANN index. Most production vector databases use HNSW as the default index because of its strong balance of recall accuracy, query speed, and insert speed. The index is built and maintained automatically as new vectors are inserted. Rebuilding the index from scratch as the corpus grows is expensive; modern systems support dynamic, incremental index updates.

**Filtering Engine:** Raw ANN search operates across all vectors in the collection. In practice, users often want to combine semantic similarity with hard metadata filters: "Find the 10 most semantically similar Q3 financial reports, but only from the North America region." Vector databases implement pre-filtering (filter first, then search), post-filtering (search first, then filter), and advanced in-index filtering strategies to support this without sacrificing recall or performance.

## Major Vector Database Systems

**Pinecone:** A fully managed, cloud-native vector database optimized for simplicity and high-scale production workloads. Pinecone handles all infrastructure management, making it the easiest to get started with but limiting customization and increasing vendor dependency.

**Weaviate:** An open-source vector database with a strong multi-modality story (supporting vectors from text, images, and other data types), a graph-like object model, and built-in support for running embedding models directly inside the database. Weaviate supports hybrid search natively.

**Qdrant:** An open-source, Rust-implemented vector database renowned for its performance efficiency and memory management. Qdrant uses a custom HNSW implementation with payload-based filtering applied during graph traversal, achieving high recall even with aggressive metadata filtering.

**Milvus:** A highly scalable, distributed open-source vector database designed for billion-scale vector collections. It supports multiple index types (HNSW, IVF, DiskANN for on-disk indexing) and is designed for cloud-native deployment on Kubernetes.

**pgvector:** A PostgreSQL extension that adds a vector data type and ANN index to the world's most popular relational database. For organizations already running PostgreSQL, pgvector allows adding semantic search capabilities without deploying a separate system, at the cost of somewhat reduced performance at very large scale.

**Chroma:** A lightweight, in-process vector store popular for local development and small-scale applications. Chroma is frequently used in LangChain and LlamaIndex tutorials.

## Vector Databases vs. Traditional Databases

The key distinction is that traditional databases perform exact lookups (the index guarantees a unique pointer to a specific row), while vector databases perform approximate similarity lookups (the index finds geometrically close neighbors, with no guarantee of finding the mathematically exact nearest neighbor).

This "approximation" is a necessary design choice. Exact nearest neighbor search in high-dimensional spaces is subject to the "curse of dimensionality" — as the number of dimensions increases, all points become roughly equidistant, making exact search both computationally infeasible and algorithmically uninformative. ANN algorithms accept a small, quantifiable recall tradeoff (e.g., 95% of the true nearest neighbors returned) in exchange for orders-of-magnitude speed improvements.

## Operational Considerations

**Dimensionality:** Common embedding dimensions are 384, 768, 1536, and 3072. Higher dimensionality generally provides richer semantic representation but requires more memory and slower indexing.

**Quantization:** To reduce memory footprint, production vector databases apply vector quantization techniques (scalar quantization, product quantization) that compress 32-bit floating-point vectors into lower-precision representations with minimal loss of recall quality.

**Persistence and Durability:** Production vector databases write their indexes to disk with write-ahead logs, snapshot mechanisms, and replication to ensure data durability consistent with the expectations of enterprise infrastructure.
"""
    },
}

for filename, data in articles.items():
    content = f"""---
title: "{data['title']}"
description: "{data['desc']}"
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 2
tags: {data['tags']}
---

# {data['title']}

{data['body']}

{deep_dive}

## Visual Architecture

### Diagram 1

```mermaid
graph TD
    A[User Query] --> B[AI System]
    B --> C[Knowledge Base]
    C --> B
    B --> D[Response]
```

### Diagram 2

```mermaid
graph LR
    A[Raw Data] --> B[Processing Layer]
    B --> C[Indexed Store]
    C --> D[Query Engine]
    D --> E[Result]
```
"""
    words = len(content.split())
    with open(os.path.join(dest, filename), "w") as f:
        f.write(content)
    print(f"Written {filename}: ~{words} words")

print("Batch 16a done (5 articles)")
