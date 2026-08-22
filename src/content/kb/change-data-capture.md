---
title: "Change Data Capture (CDC)"
description: "Change Data Capture (CDC) is a set of software design patterns and technologies used to determine and track the data that has changed within a source."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 2
tags: ["data engineering", "cdc", "streaming", "lakehouse"]
layer: "pipeline"
---

# Change Data Capture (CDC)

## Core Definition

Change Data Capture (CDC) is a set of software design patterns and technologies used to determine and track the data that has changed within a source database, so that action can be taken using the changed data. In modern data architectures, CDC is the mechanism that powers real-time and near-real-time data replication from transactional databases (like PostgreSQL, MySQL, or Oracle) into analytical data lakehouses (like Apache Iceberg).

Instead of running a heavy batch process every night at 2:00 AM that runs a massive `SELECT * FROM users` query to see what changed, a CDC system continuously monitors the database and emits a stream of tiny events every time an `INSERT`, `UPDATE`, or `DELETE` occurs.

## Implementation and Operations

There are several ways to implement CDC, but **Log-Based CDC** is the undisputed industry standard for enterprise architectures.

Every modern relational database utilizes a Write-Ahead Log (WAL) or transaction log. Before the database actually updates the physical tables on disk, it writes the exact details of the transaction to this sequential log file. This is how databases recover from sudden power failures.

Tools like **Debezium** (an open-source distributed platform built on top of Apache Kafka) act as "Log Readers." Debezium disguises itself as a replica database. It connects to the primary PostgreSQL database and asks to read the WAL. As the database writes to the log, Debezium instantly reads the log, translates the raw binary database events into standard JSON payloads (containing both the "before" state and the "after" state of the row), and publishes those payloads to an Apache Kafka topic.

**Tradeoffs and Benefits:**
The massive advantage of log-based CDC is that it has near-zero performance impact on the source operational database. Because Debezium reads the log file asynchronously, it doesn't execute any heavy SQL queries against the production tables. It provides true real-time streaming replication, allowing the data lakehouse to remain perfectly synchronized with production systems with only milliseconds of latency.

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
    A[Operational DB] -->|Writes to| B[(Transaction Log / WAL)]
    B -->|Reads Log| C[CDC Tool: Debezium]
    C -->|Streams Event| D[Apache Kafka]
    D -->|Consumes Event| E[Lakehouse / Apache Iceberg]
```

### Diagram 2: Operational Flow

```mermaid
sequenceDiagram
    participant App as Application
    participant DB as Database
    participant CDC as CDC Engine
    App->>DB: UPDATE user SET age=30
    DB->>DB: Write to WAL
    CDC->>DB: Monitor WAL
    CDC-->>CDC: Detect UPDATE
    CDC->>Kafka: Publish JSON {before: 29, after: 30}
```
