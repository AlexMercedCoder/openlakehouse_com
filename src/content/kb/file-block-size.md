---
title: "File Block Size"
description: "File Block Size (also referred to as row group size or split size) is a critical physical configuration parameter in big data storage systems."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 2
tags: ["infrastructure", "performance", "block size", "lakehouse"]
layer: "storage"
---

# File Block Size

## Core Definition

File Block Size (also referred to as row group size or split size) is a critical physical configuration parameter in big data storage systems. It dictates the maximum size of the logical chunks into which a massive dataset is divided before being written to disk or object storage. 

In distributed computing frameworks like Apache Hadoop, Apache Spark, and open table formats like Apache Iceberg, data is not processed as one giant monolithic file. A 1 Terabyte table is broken down into hundreds or thousands of smaller "blocks" or "files" (e.g., 128 MB or 256 MB each). The size of these blocks fundamentally dictates how the cluster allocates worker nodes and reads data, making it one of the most important tuning levers for data engineers.

## Diagram 1: Conceptual Architecture

![Block Size Concept](/images/kb/block_size_concept.png)

## Implementation and Operations

The concept originated with the Hadoop Distributed File System (HDFS), where the default block size was typically 64 MB or 128 MB. If you wrote a 1GB file to HDFS, it physically split it into eight 128 MB blocks distributed across eight different servers. When a query ran, the coordinator assigned eight separate CPU tasks to process those blocks in parallel.

In the modern open data lakehouse, the concept applies primarily to the internal structure of columnar files like Apache Parquet. A Parquet file is divided internally into "Row Groups". 

**The Small File Problem:**
If the block size (or physical file size) is configured too small (e.g., 10 KB), a 10 GB table will consist of one million tiny files. When an engine like Trino tries to query this table, the network overhead of opening, reading metadata from, and closing one million separate HTTP connections to Amazon S3 completely overwhelms the system. The query will crawl to a halt.

**The Giant File Problem:**
Conversely, if the block size is too large (e.g., 10 GB), a 10 GB table is just one massive file. Spark cannot easily split this file. Only a single worker node will be assigned to read it, while the other 99 nodes in the cluster sit completely idle. Furthermore, massive block sizes require massive amounts of RAM on the worker node to hold the uncompressed data in memory, frequently causing Out Of Memory (OOM) crashes.

## Diagram 2: Operational Flow

![Block Size Flow](/images/kb/block_size_flow.png)

## Summary and Tradeoffs

Tuning the file block size is an exercise in finding the "Goldilocks zone." For modern data lakehouses utilizing Parquet on cloud object storage (like S3 or GCS), the industry standard best practice is to aim for a file size/block size between 128 MB and 512 MB. This size is large enough to ensure excellent compression ratios and minimize S3 API call overhead, but small enough to ensure that massive distributed clusters can easily divide the workload among thousands of parallel CPU cores without blowing out the RAM of individual worker nodes. Open table formats like Apache Iceberg provide built-in maintenance procedures (like `RewriteDataFiles`) specifically to compact small files and enforce these optimal block sizes automatically.

## Row Group Size and Target File Size Are Different Decisions

These two settings are frequently conflated, and tuning the wrong one is a common cause of disappointing results.

**Target file size** governs how much data lands in one object. It is the setting compaction works toward, usually between 128 MB and 1 GB. It determines how many objects exist, and therefore how many requests an engine must issue and how much metadata the catalog tracks.

**Row group size** governs how a single Parquet file is internally divided. Each row group holds a horizontal slice of rows with per-column statistics, and it is the smallest unit an engine can assign to a task. It determines read parallelism within a file and the memory a writer must hold.

A 1 GB file with one row group cannot be read by more than one task. A 1 GB file with eight 128 MB row groups can be read by eight. The file size is identical, the parallelism differs eightfold.

### Choosing the Row Group Size

The writer buffers a full row group in memory before flushing, because per-column statistics cannot be finalised until every row is seen. A 512 MB row group across a wide table can therefore require several gigabytes of heap in the writing executor, and out-of-memory failures during writes are frequently traced back to this rather than to the query itself.

Between 128 MB and 256 MB suits most workloads. Below roughly 64 MB, per-row-group metadata overhead grows and statistics become less selective. Above 512 MB, memory pressure at write time rises and parallelism falls.

### The Object Storage Consideration

On object storage the cost model differs from HDFS, where block size was aligned to a physical block. Here the relevant cost is per request and per byte, and range requests let an engine fetch a single column chunk without reading the file.

This favours larger files than HDFS-era guidance suggested, because the penalty for a large file is small when engines can read parts of it, while the penalty for many small files is paid on every listing and every planning cycle. Large files with moderate row groups is generally the right shape: few objects to enumerate, plenty of units to parallelise across.

## Visual Architecture

![File Block Size Concept](/images/kb/block_size_concept.png)

![File Block Size Flow](/images/kb/block_size_flow.png)
