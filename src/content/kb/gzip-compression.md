---
title: "GZIP Compression"
description: "GZIP (GNU zip) is one of the most widely used lossless data compression utilities in the history of computing."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 2
tags: ["infrastructure", "compression", "gzip", "lakehouse"]
layer: "storage"
---

# GZIP Compression

## Core Definition

GZIP (GNU zip) is one of the most widely used lossless data compression utilities in the history of computing. Created in 1992 by Jean-loup Gailly and Mark Adler, it is based on the DEFLATE algorithm, which combines LZ77 (a dictionary-based compression technique) and Huffman coding. 

In the context of the data lakehouse, GZIP is famous for achieving excellent compression ratios: drastically shrinking the size of raw text files, CSVs, and JSON logs. However, this high compression comes at a severe cost: GZIP is highly CPU-intensive, making it a frequent bottleneck in modern, high-speed analytical data pipelines.

## Diagram 1: Conceptual Architecture

![GZIP Concept](/images/kb/gzip_concept.png)

## Implementation and Operations

When an organization dumps massive amounts of raw operational data (like web server logs) into a data lake, they often use GZIP simply because every tool on earth natively supports it. 

The primary advantage is cost savings. A 100GB raw CSV file might compress down to 15GB using GZIP. When storing petabytes of data on Amazon S3, this represents a massive reduction in monthly storage bills. 

However, the operational reality of GZIP in a big data engine (like Apache Spark or Hadoop) is problematic for two main reasons:

1. **Slow Decompression:** When Spark needs to read that 15GB GZIP file, it must dedicate massive amounts of CPU cycles to decompressing it. The decompression speed of GZIP is notoriously slow compared to modern codecs like Snappy or Zstd. The query engine is forced to wait on the CPU to unpack the data before it can actually analyze it.
2. **Lack of Splittability:** This is GZIP's fatal flaw in distributed computing. A standard GZIP file cannot be easily split into independent chunks. If you have a single 10GB GZIP file, Spark cannot assign 10 different worker nodes to read 1GB each in parallel. A single worker node must read the entire 10GB file from beginning to end. This completely destroys the parallelism that makes big data systems fast.

## Diagram 2: Operational Flow

![GZIP Flow](/images/kb/gzip_flow.png)

## Summary and Tradeoffs

GZIP is a legacy tool that still serves a purpose for archival storage or transmitting data over highly constrained networks where bandwidth is significantly more expensive than CPU time. However, for active, analytical data lakehouses, GZIP is generally considered an anti-pattern. Data engineers almost always ingest raw GZIP files, decompress them once, and immediately rewrite the data into a splittable, columnar format like Parquet using a modern, faster codec like Zstandard or Snappy to ensure downstream analytical performance.

## Where Gzip Fits in a Lakehouse

Gzip implements the DEFLATE algorithm, combining LZ77 matching with Huffman coding. On typical analytical data it reaches compression ratios of roughly 3x to 4x, which is the highest of the codecs in common lakehouse use. That ratio comes at a cost that shows up in two different places, and confusing them leads to the wrong choice.

Compression throughput sits in the range of 20 to 30 MB/s per core. For a nightly job writing a few hundred gigabytes, that cost is absorbed by a batch window nobody is watching. For a streaming ingest path committing every few minutes, it becomes the bottleneck that determines your commit interval.

Decompression is far cheaper, typically 200 to 400 MB/s per core. This asymmetry is the useful property: you pay once at write time and recover the cost on every subsequent read, because fewer bytes cross the network from object storage.

### The Splittability Question

Gzip applied to a whole file is not splittable, since the decoder must start from the beginning of the stream. This was a genuine constraint in the Hadoop era, where a gzipped CSV forced a single reader over the entire file regardless of cluster size.

Inside Parquet the constraint largely disappears. Compression is applied per page within each column chunk, so an engine reading a 512 MB Parquet file with gzip pages can still assign row groups to separate tasks and decompress only the pages its predicates require. The splittability warning attached to gzip is about raw text files, not about gzip inside a columnar container.

### When to Choose It

Gzip is the right default for cold data that is written once and read rarely, where storage cost dominates and read latency is not scrutinised. Archival partitions, regulatory retention, and historical fact tables older than the active reporting window all fit.

It is the wrong default for hot data. If a partition is queried many times a day, the extra CPU spent decompressing on every read eventually exceeds the storage saved, and Zstandard at a moderate level delivers a similar ratio for a fraction of the write cost.

## Visual Architecture

![GZIP Compression Concept](/images/kb/gzip_concept.png)

![GZIP Compression Flow](/images/kb/gzip_flow.png)
