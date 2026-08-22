---
title: "LZ4 Compression"
description: "LZ4 is a lossless data compression algorithm focused on incredibly fast compression and decompression speeds."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 2
tags: ["infrastructure", "compression", "lz4", "lakehouse"]
layer: "storage"
---

# LZ4 Compression

## Core Definition

LZ4 is a lossless data compression algorithm focused on incredibly fast compression and decompression speeds. Developed by Yann Collet (the same creator of Zstandard), LZ4 sits at the extreme end of the compression spectrum: it sacrifices compression ratio (the resulting files are larger) in order to achieve speeds that push the physical limits of RAM bandwidth.

In big data and distributed systems, LZ4 is utilized when the primary goal is not saving disk space, but rather reducing network I/O or disk I/O without incurring any noticeable CPU penalty.

## Diagram 1: Conceptual Architecture

![LZ4 Concept](/images/kb/lz4_concept.png)

## Implementation and Operations

LZ4 is capable of decompression speeds exceeding multiple gigabytes per second per CPU core. This speed makes it virtually transparent to the operating system; it is often faster to read an LZ4-compressed file from a hard drive and decompress it in RAM than it is to read the uncompressed raw file from the hard drive, simply because the compressed file requires less physical disk I/O.

In the data engineering ecosystem, LZ4 is heavily used in transient, highly volatile systems:
- **Apache Kafka:** Kafka brokers use LZ4 to compress message batches. Because Kafka handles millions of messages per second, it cannot afford heavy CPU overhead. LZ4 shrinks the network payload instantly.
- **Spark Shuffle Data:** During a massive distributed `GROUP BY` or `JOIN`, Apache Spark must "shuffle" terabytes of intermediate data between worker nodes over the network. Spark frequently uses LZ4 to compress this intermediate data on the fly. The compression is so fast it doesn't slow down the computation, but it significantly reduces the amount of data traversing the network switches.

## Diagram 2: Operational Flow

![LZ4 Flow](/images/kb/lz4_flow.png)

## Summary and Tradeoffs

LZ4 is the ultimate tool for operational speed. The clear tradeoff is storage footprint. An LZ4 compressed file will be significantly larger than the same file compressed with Zstd or GZIP. Therefore, LZ4 is rarely used for long-term, persistent storage in the data lakehouse (where Zstd or Snappy are preferred for Parquet files). Instead, it is the invisible workhorse powering the high-speed network transfers and temporary disk spills that occur deep within the execution engines themselves.

## The Speed Extreme

LZ4 sits at the fast end of the compression spectrum. Compression runs at roughly 400 to 700 MB/s per core and decompression frequently exceeds 2 GB/s, fast enough that decompression is rarely the limiting step in any pipeline stage. The ratio is correspondingly modest, typically 1.5x to 2x on analytical data.

The design trade is deliberate. LZ4 performs LZ77-style matching without an entropy coding stage, which is where gzip and Zstandard spend most of their time. Removing that stage costs ratio and buys speed.

### Where the Trade Pays Off

LZ4 is a good fit anywhere data is compressed to move rather than to store:

- **Shuffle and spill.** When a query engine spills intermediate results to disk or ships partitions between executors, the data lives for seconds. Compression exists to reduce I/O pressure, and any CPU spent on ratio is wasted.
- **Network transport.** Arrow Flight and similar protocols use fast codecs so compression does not become the bottleneck it was meant to relieve.
- **Write-ahead logs and commit paths.** Latency-sensitive writes where the compression step sits on the critical path.

### Where It Does Not

For Parquet files on object storage that will be queried repeatedly over months, LZ4 is usually the wrong choice. The ratio gap against Zstandard level 3 is significant, and every additional byte is paid for on every scan and in every month of storage. The speed advantage at write time is real but is being optimized for the wrong resource.

The general rule: LZ4 for bytes in motion, Zstandard for bytes at rest.

## Visual Architecture

![LZ4 Compression Concept](/images/kb/lz4_concept.png)

![LZ4 Compression Flow](/images/kb/lz4_flow.png)
