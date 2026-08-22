---
title: "Time Travel"
description: "In traditional relational databases, querying the past is extremely difficult."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 2
tags: ["time travel", "apache iceberg", "snapshots", "machine learning"]
layer: "table"
---

# Time Travel

In traditional relational databases, querying the past is extremely difficult. If a record was updated yesterday, the old value is overwritten and permanently lost unless you explicitly engineered complex Change Data Capture (CDC) or Slowly Changing Dimension (SCD) pipelines.

Apache Iceberg natively supports querying the historical state of a table right out of the box. This feature is known as **Time Travel**.

Because Iceberg uses a Snapshot-based architecture, every single commit creates a new, immutable Snapshot of the table. The old Parquet files are not immediately deleted; they are simply no longer referenced by the *current* Snapshot. However, they remain perfectly intact and accessible on disk.

## Querying the Past

To time travel in Iceberg, an analyst simply adds an `AS OF` clause to their standard SQL query. 

You can time travel using a specific Timestamp (e.g., `SELECT * FROM users FOR SYSTEM_TIME AS OF '2026-05-15 10:00:00'`) or by using a specific Snapshot ID (e.g., `SELECT * FROM users FOR SYSTEM_VERSION AS OF 123456789`).

When the engine executes this query, it does not look at the current active metadata. It traverses the Iceberg metadata tree backward until it finds the exact JSON file representing the Snapshot that was active at that specific time. It then reads the Manifests and Parquet files precisely as they existed in that moment, completely ignoring any data that was inserted, updated, or deleted afterward.

## Diagram 1: The Concept of Time Travel

![Time travel query bypassing current state to read historical snapshot](/images/kb/time_travel_concept.png)

## Core Use Cases

Time Travel is not just a parlor trick; it solves three massive enterprise data challenges:

**1. Auditing and Compliance:**
If a financial regulator asks, "What exactly did this financial report look like at 9:00 AM on March 1st?" you do not need to restore backups from tape drives. You simply execute a Time Travel query for that exact timestamp to prove exactly what data was visible to the business at that moment.

**2. Rollback and Disaster Recovery:**
Human error happens. If a data engineer accidentally drops all the records for your most important customer, it is no longer a catastrophe. Using the Iceberg CLI or a stored procedure, you can instantly rollback the table's active pointer to the Snapshot that existed five minutes before the mistake. 

**3. Machine Learning Reproducibility:**
Data science models are notoriously difficult to reproduce because the underlying training data constantly changes. With Time Travel, a data scientist can train a model on `Snapshot ID 999`. Six months later, if they need to debug why the model made a specific prediction, they can retrain the model `AS OF Snapshot 999`, guaranteeing they are feeding the algorithm the exact same bytes it saw the first time.

## Diagram 2: Time Travel Use Cases

![Three panels showing Auditing, Rollback, and Reproducibility use cases](/images/kb/time_travel_use_cases.png)
