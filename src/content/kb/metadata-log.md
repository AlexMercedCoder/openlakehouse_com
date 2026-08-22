---
title: "Metadata Log"
description: "Apache Iceberg achieves ACID transactions on object storage without requiring a continuous compute engine."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 1
tags: ["metadata log", "apache iceberg", "catalog", "version control"]
layer: "table"
---

# Metadata Log

Apache Iceberg achieves ACID transactions on object storage without requiring a continuous compute engine. It accomplishes this through atomic pointer swaps managed by a Catalog. The mechanism that makes these pointer swaps possible, and tracks the complete evolutionary history of the table's state, is the **Metadata Log**.

Every time a table is modified (whether data is inserted, a column is dropped, or a partition spec is evolved) Iceberg generates a brand new metadata file, typically named something like `v12.metadata.json`.

## The Anatomy of the Metadata Log

The current `v12.metadata.json` file is the absolute source of truth for the table. It contains:
*   The current Schema Spec.
*   The current Partition Spec.
*   A pointer to the current active Snapshot (Manifest List).
*   **The Metadata Log Array**.

The Metadata Log array inside the JSON file is a strict, sequential history of every previous metadata file that ever represented the current state of the table (e.g., `v1.metadata.json`, `v2.metadata.json`... up to `v11.metadata.json`). 

Crucially, this array maps each historical metadata file to the exact timestamp it was committed.

## Why the Log Matters

If you want to read data from yesterday (Time Travel), the Iceberg query engine does not have to guess. It opens the *current* `metadata.json`, looks at the Metadata Log array, and instantly finds the exact file path of the historical metadata JSON that was active at that timestamp.

Similarly, the Metadata Log is the foundation of concurrency control. If two Spark clusters attempt to write to the table at the exact same millisecond, they both start with `v12.metadata.json`. Cluster A finishes first and tells the Catalog to swap the pointer to its new `v13.metadata.json`. When Cluster B finishes and attempts to commit its own version, the Catalog rejects it because the pointer has already moved. Cluster B is forced to read the new `v13`, reconcile its changes, and try again, ensuring perfectly linear, serializable transactions.

*(Diagram 1: The sequential chain of metadata JSON files forming the Metadata Log - Pending Generation)*
*(Diagram 2: Optimistic Concurrency Control rejecting a commit based on metadata versions - Pending Generation)*


## Visual Architecture

![Metadata Log History](/images/kb/metadata_log_history.png)

