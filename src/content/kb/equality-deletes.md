---
title: "Equality Deletes"
description: "A comprehensive guide to Equality Deletes in Apache Iceberg, detailing how predicate-based logical tombstones enable high-velocity streaming writes."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 0
tags: ["equality deletes", "apache iceberg", "merge-on-read", "streaming"]
---

# Equality Deletes

When dealing with high-velocity streaming data, such as a Change Data Capture (CDC) pipeline ingesting thousands of database updates per second, data engineering pipelines do not have time to scan historical files to find the exact physical location of a row. 

To support these extreme write-velocity use cases within a Merge-on-Read (MoR) architecture, Apache Iceberg utilizes **Equality Deletes**.

## Logical, Predicate-Based Deletions

An Equality Delete file is a specialized metadata file that defines a deletion using business logic rather than physical file coordinates. 

If a CDC stream indicates that customer `12345` was deleted from the source database, the Flink or Spark streaming engine simply writes an Equality Delete file containing: `id = 12345`. 

The writing engine does not know—and does not care—which specific Parquet file holds the record for customer `12345`. It simply writes the logical predicate and instantly moves on to process the next incoming event. This completely eliminates the write-time overhead required by Position Deletes or Copy-on-Write architectures.

## The Cost at Read Time

Because Equality Deletes are so cheap to write, the computational cost is deferred entirely to the query engine at read-time.

When an analyst runs a `SELECT` query, the query engine (like Trino) must read the data files and the Equality Delete files simultaneously. As the engine streams the data into memory, it must actively evaluate the predicate (`id = 12345`) against *every single row* to determine if that row should be discarded. 

This requires the query engine to perform an expensive hash lookup or join operation in memory. If a table accumulates millions of Equality Deletes, query performance will rapidly degrade to an unacceptable level.

## Lifecycle Management

Equality Deletes are designed to be temporary shock absorbers for high-velocity streams. They are not meant to exist permanently in the data lakehouse.

A healthy Iceberg deployment will run frequent maintenance jobs that convert Equality Deletes into highly efficient Position Deletes, or completely remove them by performing a full Compaction rewrite on the underlying data files.

*(Diagram 1: The structure of an Equality Delete file containing logical predicates - Pending Generation)*
*(Diagram 2: Streaming ingest generating Equality Deletes to absorb high-velocity writes - Pending Generation)*
