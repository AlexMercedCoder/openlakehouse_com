---
title: "Snappy Compression"
description: "Snappy is a fast, lossless data compression and decompression library written in C++ and originally developed by Google."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 2
tags: ["infrastructure", "compression", "snappy", "lakehouse"]
layer: "storage"
---

# Snappy Compression

## Core Definition

Snappy is a fast, lossless data compression and decompression library written in C++ and originally developed by Google. Unlike traditional compression algorithms (like GZIP or BZIP2) that aggressively seek the absolute smallest file size at the cost of heavy CPU usage, Snappy was engineered with a completely different philosophy: absolute speed. 

In the high-velocity world of big data engineering, network bandwidth and CPU cycles are both precious constraints. Snappy was designed to compress and decompress data so quickly that it rarely becomes the bottleneck in a data pipeline, making it the default compression codec for many big data frameworks, including Apache Hadoop, Apache Spark, and Apache Kafka.

## Diagram 1: Conceptual Architecture

![Snappy Concept](/images/kb/snappy_concept.png)

## Implementation and Operations

Snappy does not aim for maximum compression. A file compressed with GZIP will almost always be significantly smaller than a file compressed with Snappy. However, Snappy can decompress data at speeds upwards of 500 MB/sec per CPU core, whereas GZIP might struggle to reach 50 MB/sec.

This blistering decompression speed is why Snappy was chosen as the default compression codec for Apache Parquet. When a query engine like Amazon Athena or Trino scans petabytes of Parquet files from Amazon S3, it must pull those files into RAM and decompress them before evaluating the data. If the files were compressed with a heavy algorithm like GZIP, the massive fleet of CPU cores on the worker nodes would max out just trying to decompress the data, drastically slowing down the query.

With Snappy, the decompression overhead is so light that the CPU can easily keep up with the network bandwidth, ensuring that the engine spends its time executing the actual SQL logic rather than waiting for data to unpack.

## Diagram 2: Operational Flow

![Snappy Flow](/images/kb/snappy_flow.png)

## Summary and Tradeoffs

The tradeoff with Snappy is purely file size versus speed. By choosing Snappy, an organization accepts that their data lake will consume more physical bytes on Amazon S3 or Google Cloud Storage compared to heavier algorithms. They pay slightly more in monthly storage costs and network transfer times. In return, they gain significantly faster read and write performance during ETL jobs and analytical queries. For the vast majority of active ("hot") data lakehouse workloads, this tradeoff is highly favorable.

## Why Snappy Became the Default

Snappy was written at Google with an explicit goal that was not maximum compression. It targets very high throughput at an acceptable ratio, on the reasoning that in a distributed query engine the scarce resource is usually CPU rather than storage.

Typical numbers: compression around 250 to 500 MB/s per core, decompression around 500 MB/s to over 1 GB/s, and a ratio near 1.5x to 2x on analytical data. Against gzip, that is roughly half the space saving for something like ten times the compression speed.

For years this made Snappy the default codec in Parquet and in most Spark distributions, and a great deal of existing lakehouse data is written with it.

### The Case Against Keeping It

Snappy's advantage was clearest when compute and storage sat on the same machines and network bandwidth between them was plentiful. On object storage the calculation changes. Every byte not written is a byte not transferred on every subsequent read, and the network round trip is frequently slower than the CPU cycles required to decompress.

Zstandard at level 1 achieves throughput close to Snappy while compressing substantially better. At level 3 it compresses close to gzip while remaining several times faster to write. That combination has moved most new lakehouse deployments away from Snappy, and Parquet implementations have been shifting their defaults accordingly.

### When It Still Wins

Snappy remains a reasonable choice for intermediate data that will be read once and discarded: shuffle spill, staging tables between pipeline steps, and scratch output where the file is deleted within the hour. The compression exists to reduce transient network and disk pressure, not to reduce a storage bill, so the ratio matters less than the cost of producing it.

## Visual Architecture

![Snappy Compression Concept](/images/kb/snappy_concept.png)

![Snappy Compression Flow](/images/kb/snappy_flow.png)
