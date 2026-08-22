---
title: "Staged Commits"
description: "A comprehensive guide to Staged Commits in Apache Iceberg, detailing how WAP implementations write isolated metadata to prevent premature data exposure."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 1
tags: ["staged commits", "apache iceberg", "wap", "data engineering"]
layer: "table"
---

# Staged Commits

The Write-Audit-Publish (WAP) pattern is the gold standard for maintaining data quality in a lakehouse. The premise is simple: write the data, test the data, and only publish it if it passes.

While Branching is the most modern and intuitive way to implement WAP in Iceberg, there is a lower-level, programmatic method that is heavily used by data engineering frameworks: **Staged Commits** (often referred to as the WAP Workflow via snapshot properties).

## Writing Without Publishing

When a standard Spark job finishes writing Parquet files to an Iceberg table, it automatically performs a catalog commit to update the `main` branch pointer. The new data instantly becomes visible.

A Staged Commit intentionally interrupts this final step.

When a job is configured to use a Staged Commit (often by setting a Spark session property like `spark.wap.id`), the engine writes all the Parquet files and generates all the necessary Iceberg metadata (Manifests and Manifest Lists). It even generates the new Snapshot ID. 

However, it *does not* ask the Catalog to update the active pointer.

The new Snapshot is physically written to object storage, but it remains disconnected from the active metadata tree. It is effectively "staged."

## The Audit and Fast-Forward

Because the Snapshot exists but is not published, a Data Quality engine can explicitly target that specific, staged Snapshot ID to run its validation tests. It evaluates the exact data files that the ETL job just wrote, entirely isolated from the `main` production traffic.

If the tests fail, the staged Snapshot is simply abandoned. The active table is completely unaffected, and the abandoned files will eventually be cleaned up by the `Remove Orphan Files` process.

If the tests pass, the pipeline executes a programmatic `fast-forward` or `cherry-pick` procedure. It tells the Iceberg Catalog to officially link the staged Snapshot ID into the main metadata tree, instantly publishing the fully-audited data to end-users.

*(Diagram 1: The Staged Commit process writing snapshots without updating the main pointer - Pending Generation)*
*(Diagram 2: Data Quality engine explicitly querying a staged snapshot ID - Pending Generation)*


## Visual Architecture

![Staged Commits Wap](/images/kb/staged_commits_wap.png)

