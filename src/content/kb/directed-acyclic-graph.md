---
title: "Directed Acyclic Graph (DAG)"
description: "A Directed Acyclic Graph (DAG) is a conceptual mathematical model heavily utilized in computer science, specifically within the area of data engineering and."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 2
tags: ["data engineering", "orchestration", "dag"]
layer: "pipeline"
---

# Directed Acyclic Graph (DAG)

## Core Definition

A Directed Acyclic Graph (DAG) is a conceptual mathematical model heavily utilized in computer science, specifically within the area of data engineering and workflow orchestration. Breaking down the term:
- **Graph:** A collection of nodes (representing tasks or data entities) connected by edges (relationships).
- **Directed:** The edges have a specific direction. They are not two-way streets. An arrow points from Node A to Node B, indicating that A must happen before B.
- **Acyclic:** There are no cycles or loops. If you follow the arrows from any node, you can never return to that same node.

In the context of the open data lakehouse and modern data pipelines, a DAG represents a data workflow. Each node in the DAG is a specific computational task (e.g., "Extract CSV from S3," "Run Spark SQL Transform," "Publish to Apache Iceberg table"). The directed edges represent the dependencies between these tasks. The acyclic nature guarantees that the pipeline has a clear beginning and end, preventing infinite execution loops.

## Implementation and Operations

When an orchestration engine like Apache Airflow, Dagster, or Prefect executes a data pipeline, it essentially traverses the DAG. The engine identifies nodes that have no incoming dependencies (the "Start" tasks) and executes them in parallel. As those tasks complete, the engine traverses the directed edges, enabling and executing the subsequent dependent tasks.

If a task in the DAG fails (for example, due to a network timeout when connecting to a database), the orchestrator marks that node as "Failed." Because it is a directed graph, the orchestrator instantly knows exactly which downstream tasks rely on that failed node, and it halts their execution (often marking them "Upstream Failed") while allowing unrelated, parallel branches of the DAG to continue running to completion.

## How This Fits the Wider Platform

To fully appreciate this concept, it is essential to understand the modern data engineering field, the challenges it solves, and the advanced architectural paradigms that support it. The transition from legacy monolithic architectures to modern, distributed open data lakehouses has fundamentally altered how data is modeled, orchestrated, and maintained.

### The Evolution of Data Architecture
Historically, data engineering was synonymous with Extract, Transform, Load (ETL). Teams used heavy, proprietary, on-premises tools like Informatica to pull data, transform it on specialized intermediate servers, and load it into rigid, heavily normalized Enterprise Data Warehouses (like Oracle or Teradata). This approach was brittle. If the business wanted a new column, it required weeks of database administration, schema alterations, and ETL pipeline rewrites.

The advent of cloud computing and the separation of compute and storage led to the Extract, Load, Transform (ELT) paradigm. Today, engineers extract raw data (JSON, CSV, API payloads) and load it directly into cheap cloud object storage (Amazon S3, Google Cloud Storage). The transformation happens *after* the load, utilizing the massive, elastic compute power of the cloud data warehouse (Snowflake) or lakehouse engine (Trino, Dremio, Spark). This allows teams to store everything and only pay for the compute required to transform the data when it is actually needed.

### The Critical Role of Orchestration
As pipelines grew from dozens of scripts to thousands of interdependent tasks, orchestration became the central nervous system of data engineering. A modern orchestrator (like Apache Airflow, Dagster, or Prefect) does far more than schedule jobs. It manages:
*   **Dependency Resolution:** Ensuring that a downstream sales dashboard does not update until *all* upstream data extraction and transformation tasks for that day have successfully completed.
*   **Idempotency and Backfilling:** Designing tasks so that if a pipeline fails and is rerun, it produces the exact same result without duplicating data. If a bug is discovered in last month's transformation logic, the orchestrator handles the "backfill," automatically rerunning the pipeline for the last 30 days of historical data.
*   **Alerting and Observability:** Integrating with PagerDuty, Slack, and Datadog to instantly notify on-call engineers when a data quality test fails or a source API goes down.

### Data Modeling in the Lakehouse Era
While the physical storage mechanisms have changed (from proprietary blocks on hard drives to open source Apache Parquet files on S3), the logical business requirements have not. Ralph Kimball's Dimensional Modeling techniques remain the absolute gold standard for analytical data presentation.

However, the implementation of these models has evolved. In an open data lakehouse utilizing Apache Iceberg:
1. **The Bronze Layer (Raw):** Data lands exactly as it arrived from the source. It is append-only and highly volatile.
2. **The Silver Layer (Cleaned & Normalized):** Data is parsed, deduplicated, and cast to correct data types. PII is masked. It resembles a normalized (3NF) operational database.
3. **The Gold Layer (Dimensional/Business):** Data is heavily denormalized into Star Schemas (Fact and Dimension tables) explicitly designed for high-performance querying by BI tools and executives.

### Best Practices for Pipeline Reliability
To maintain these complex systems, data engineers have adopted practices from traditional software engineering:
*   **Data Quality Testing:** Utilizing frameworks like Great Expectations or dbt tests to automatically assert that data is not null, primary keys are unique, and values fall within accepted ranges *before* the data is published to production.
*   **Write-Audit-Publish (WAP):** Utilizing the branching capabilities of formats like Apache Iceberg (similar to Git branching) to write data to a hidden branch, run audit queries against it, and only merge it to the main production branch if it passes all quality checks. This guarantees that consumers never see corrupted or partial data.
*   **CI/CD for Data:** Storing all SQL transformations (dbt models), Python orchestration code (Airflow DAGs), and infrastructure configuration (Terraform) in Git. Changes are reviewed via Pull Requests, and automated CI/CD pipelines deploy the changes to staging and production environments.

### Conclusion
These concepts are not isolated techniques. Designing a Star Schema, setting the block size of a Parquet file, and writing the DAG that orchestrates the workflow all serve one goal: delivering reliable, performant data the business can act on.

## Visual Architecture

### Diagram 1: Conceptual Architecture

```mermaid
graph TD
    A[Extract API Data] --> B[Clean User Data]
    A --> C[Clean Product Data]
    B --> D[Join Data]
    C --> D
    D --> E[Load to Iceberg]
```

### Diagram 2: Operational Flow

```mermaid
graph LR
    A((Start)) --> B((Task 1))
    A --> C((Task 2))
    B --> D((End))
    C --> D
    %% No cycles allowed
```
