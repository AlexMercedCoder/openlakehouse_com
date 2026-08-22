---
title: "Zstandard (Zstd)"
description: "Zstandard, commonly abbreviated as Zstd, is a fast, lossless data compression algorithm developed by Yann Collet at Facebook (Meta)."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 2
tags: ["infrastructure", "compression", "zstd", "lakehouse"]
layer: "storage"
---

# Zstandard (Zstd)

## Core Definition

Zstandard, commonly abbreviated as Zstd, is a fast, lossless data compression algorithm developed by Yann Collet at Facebook (Meta). Introduced in 2015, Zstd represents a massive generational leap in compression technology. For decades, data engineers had to make a painful choice: use GZIP for good compression but terrible speed, or use Snappy/LZ4 for blistering speed but mediocre compression. Zstd effectively shatters this dichotomy, offering compression ratios comparable to (or better than) GZIP, while delivering decompression speeds closer to Snappy.

As a result, Zstandard is rapidly becoming the new gold standard for big data storage, increasingly replacing Snappy as the preferred default codec for open table formats and analytical engines.

## Diagram 1: Conceptual Architecture

![Zstd Concept](/images/kb/zstd_concept.png)

## Implementation and Operations

The magic of Zstd lies in its highly tunable architecture and its use of Finite State Entropy (FSE) coding. 

Unlike older algorithms that have a narrow operating window, Zstd offers a vast range of compression levels (from 1 to 22, plus negative levels for extreme speed). 
- At lower levels (e.g., Level 1), Zstd acts like Snappy: it compresses and decompresses at gigabytes per second, making it perfect for real-time streaming pipelines (like Apache Kafka).
- At standard levels (e.g., Level 3), it offers the perfect "Lakehouse" balance: file sizes significantly smaller than Snappy, but with decompression speeds that do not bottleneck query engines like Trino or StarRocks.
- At maximum levels (Level 22), it achieves archival-grade compression, crushing data into the smallest possible footprint for long-term cold storage.

Another groundbreaking feature of Zstd is its support for Dictionary Compression. When compressing many small, similar files (like millions of small JSON log messages), standard algorithms struggle because they don't have enough data in a single file to build a good compression map. Zstd allows engineers to pre-train a "dictionary" on sample data. This dictionary is then shared across all files, resulting in massive compression gains on micro-files.

## Diagram 2: Operational Flow

![Zstd Flow](/images/kb/zstd_flow.png)

## Summary and Tradeoffs

Zstandard is currently the ultimate "no-compromise" compression algorithm for the open data lakehouse. By migrating from Snappy to Zstd, organizations often see a 20-30% reduction in their total Amazon S3 storage bills and faster network transfer times, without suffering any noticeable CPU penalty during query execution. The only real tradeoff is that because it is newer, very legacy data systems might lack native libraries for Zstd, requiring minor infrastructure updates. However, in the modern stack (Iceberg, Delta, Spark, Trino), Zstd is natively and heavily supported.

## Choosing a Zstandard Level

Zstandard's distinguishing feature is a compression level dial running from 1 to 22, which lets one codec serve roles that previously required choosing between two. The level changes compression cost substantially while leaving decompression speed roughly constant, which is what makes it well suited to write-once read-many analytical data.

As rough guidance on analytical workloads:

- **Level 1** compresses at speeds comparable to Snappy while achieving a noticeably better ratio. Suitable for streaming ingest where write latency is the constraint.
- **Level 3**, the library default, is the common lakehouse choice. It approaches gzip's ratio at several times gzip's write throughput.
- **Levels 9 to 12** buy further ratio at meaningfully lower write speed. Worth considering for data compacted once and then read for years.
- **Levels above 15** are rarely justified for Parquet. The additional ratio is small and the write cost climbs steeply.

Decompression stays in the range of 600 MB/s to over 1 GB/s per core across levels, so a higher level does not penalise your readers. This is the property that makes raising the level during compaction attractive: the rewrite is a batch job whose cost you pay once, and every query afterwards benefits from the smaller footprint.

### Dictionary Compression

Zstandard supports training a dictionary on sample data and reusing it across many small inputs. Because compression algorithms work by referencing earlier occurrences, small inputs normally compress poorly, having little history to reference. A shared dictionary supplies that history.

This matters less inside Parquet, where pages are large enough to build their own context, and more for the many small values in metadata and message payloads. It is worth knowing about when the small-file problem is being addressed at the ingestion layer rather than through compaction.

### A Practical Default

For most lakehouse tables, Zstandard at level 3 for freshly ingested data and level 9 during compaction gives a good balance: ingestion stays fast, and data that has settled gets compacted into a denser form once it stops changing.

## Visual Architecture

![Zstandard (Zstd) Concept](/images/kb/zstd_concept.png)

![Zstandard (Zstd) Flow](/images/kb/zstd_flow.png)
