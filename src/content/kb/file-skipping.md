---
title: "File Skipping"
description: "File Skipping is the collective term for the multi-level system of techniques that allow a data lakehouse query engine to identify and eliminate data files."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 1
tags: ["file skipping", "data skipping", "predicate pushdown", "apache iceberg", "delta lake", "query optimization", "parquet", "data lakehouse"]
layer: "compute"
---

# File Skipping

File Skipping is the collective term for the multi-level system of techniques that allow a data lakehouse query engine to identify and eliminate data files, and sub-file units like row groups, that cannot possibly contain rows satisfying a query's predicates, without reading any actual data bytes from those files. It is the primary mechanism by which large-scale analytical queries achieve sub-minute performance on petabyte-scale tables that would take hours to fully scan.

In the traditional data lake built on raw Parquet files with no table format overhead, file skipping was limited to partition-level directory filtering: queries with date predicates could skip entire date-partition directories, but any query that required filtering on non-partition columns had to scan every file. Open Table Formats (Apache Iceberg, Delta Lake, and Apache Hudi) dramatically expanded the scope of file skipping by adding multiple layers of metadata (manifest files, transaction logs, column statistics, Bloom Filters) that make fine-grained, multi-level file skipping possible for a much broader category of query predicates.

Understanding the full architecture of file skipping (all the layers at which it operates, the data it depends on, and the conditions that maximize its effectiveness) is the practical foundation of lakehouse query performance engineering.

## Why File Skipping Is the Primary Performance Lever

Before working through the mechanics, it is worth establishing the quantitative impact of file skipping on query performance.

Consider a petabyte-scale orders table with 50 trillion rows stored across 1 million Parquet files, each averaging 1GB. A typical analytical query might filter for orders from a specific country, in a specific product category, within a specific date range. If those three predicates together apply to 0.01% of the rows (5 billion rows), the ideal query would read approximately 0.01% of the files, about 100 files out of 1 million, totaling 100GB of data.

Without file skipping, the engine reads all 1 million files (1 petabyte). With full file skipping, it reads 100 files (100GB). The performance difference is 10,000x: the difference between a 30-second query and a 4-day query.

This is not a hypothetical scenario. On real production lakehouse tables at scale, the gap between a well-optimized table with effective file skipping and an unoptimized table without it is measured in orders of magnitude of query latency and compute cost. File skipping is not an optimization, at petabyte scale, it is the difference between a usable system and an unusable one.

## The File Skipping Hierarchy

File skipping in the modern lakehouse operates at five distinct levels, each more granular than the previous. A query engine traverses these levels in sequence, applying each layer's pruning before proceeding to the next. The goal is to reach the smallest possible set of actual data bytes to read.

### Level 1: Partition Pruning

Partition pruning is the coarsest and most computationally cheap form of file skipping. It operates entirely on the table's partition specification: the definition of which columns determine the physical directory structure of the data.

When a query contains a predicate that exactly matches the table's partition column (e.g., `WHERE event_date = '2026-05-18'` on a table partitioned by `event_date`), the query engine translates this into a file system path filter. Files stored under `event_date=2026-05-18/` are read. All other partition directories are completely ignored: the query engine doesn't even request a directory listing for non-matching partitions.

Partition pruning is handled differently by Iceberg and Delta Lake:

**In Iceberg**: Partition values are stored in the Manifest File entries for each data file. The query engine reads the Manifest Files and filters by partition value, without needing to consult the file system directory structure at all. This is critical for hidden partitioning (where the partition value is a transform of the source column, not the raw value) and for partition evolution (where different files were written under different partition specs).

**In Delta Lake**: Partition values appear in the `_delta_log`'s `add` action entries as the `partitionValues` field. The engine reads the transaction log (or checkpoint) and filters `add` entries by their partition values to identify the relevant file set.

### Level 2: Manifest-Level Statistics Pruning (Iceberg)

Iceberg's unique hierarchical metadata design adds a pruning level between partition pruning and file-level statistics pruning: the Manifest List.

The Manifest List (the Avro file that indexes all Manifest Files for a snapshot) stores per-Manifest summary statistics. These are aggregate statistics across all files tracked in each Manifest: the minimum and maximum value for each partition column across all data in the manifest.

For a query with a predicate `WHERE sale_date BETWEEN '2026-05-01' AND '2026-05-31'`, the query engine reads the Manifest List and eliminates any Manifest whose `sale_date` max is before 2026-05-01 or whose `sale_date` min is after 2026-05-31. It then reads only the surviving Manifests to get individual file-level statistics.

This Manifest-level pruning can eliminate large fractions of the metadata read overhead for broad temporal queries on large tables with many Manifest Files.

### Level 3: File-Level Statistics Pruning

This is the primary file skipping level for most queries. After partition pruning and manifest-level pruning (in Iceberg), the engine has a set of candidate data files. For each candidate file, it reads the per-file column statistics (stored in Iceberg Manifest File entries or in Delta Lake's transaction log `add` actions) and evaluates the query predicates against those statistics.

For each file, for each query predicate:

- If the file's min value for the predicate column is greater than the predicate's upper bound: **skip this file**. All values in the file are too large.
- If the file's max value for the predicate column is less than the predicate's lower bound: **skip this file**. All values in the file are too small.
- If the file's null_count equals the file's row count and the predicate requires non-null values: **skip this file**. No non-null values exist.
- Otherwise: **mark this file for reading**.

The effectiveness of this pruning depends entirely on how tight the per-file statistics are, which, in turn, depends on how the data is physically ordered within the file. A file containing a contiguous range of `sale_date` values will have tight statistics. A file containing random `sale_date` values will have wide, overlapping statistics that prune poorly.

### Level 4: Bloom Filter Pruning

After Level 3 identifies the set of files with potentially matching rows based on range statistics, a second pass applies Bloom Filter pruning for equality predicates on high-cardinality columns.

For a predicate `WHERE customer_id = 7,842,913`:
- Level 3 range pruning cannot help: `customer_id` 7,842,913 likely falls within every file's min-max range if the data is not ordered by `customer_id`.
- Level 4 Bloom Filter pruning consults the per-file (or per-row-group) Bloom Filter for `customer_id`. Files whose Bloom Filter returns "definitely not" for value 7,842,913 are eliminated. Only files returning "probably yes" are read.

In the Iceberg context, Bloom Filters stored in Puffin files provide file-level Bloom Filter pruning before any data file is opened. In the Parquet context, Bloom Filters stored in each Parquet file's footer provide row-group-level Bloom Filter pruning after the file is opened but before any row group data is read.

### Level 5: Row Group Pruning (Within Files)

For files that survive all preceding levels of pruning, the query engine opens the Parquet file and reads the file footer, which contains per-column statistics for each individual row group. The same predicate evaluation logic from Level 3 is applied, but at the row group level rather than the file level.

A row group that passes range statistics but fails Bloom Filter (or whose row group Bloom Filter also passes) is read, decompressed, decoded, and evaluated at the record level.

Row group pruning operates entirely within the Parquet format layer. It is invisible to the table format (Iceberg or Delta): it is performed by the Parquet reader itself, based only on the Parquet footer statistics. All table formats benefit from row group pruning equally, as long as the query engine's Parquet reader implements this optimization (all major engines do: Spark, Trino, Presto, Flink, DuckDB).

## The Role of Data Ordering in File Skipping Effectiveness

As emphasized throughout the statistics-related articles, the effectiveness of all statistics-based file skipping is governed by the physical ordering of data.

The correlation is direct: tighter statistics → more files skipped → faster queries → lower compute cost.

Tighter statistics occur when data is physically co-located by the predicate column's values: all rows with `sale_date = 2026-05-01` in the same file, all rows with `customer_id` in range [1M, 2M] in the same file. Sorting, partitioning, Z-Ordering, and Hilbert Clustering all serve the same ultimate goal: creating tight, selective min-max statistics that allow the query engine to skip the maximum number of files.

### The Performance Impact of Data Layout Choices

| Layout Strategy | Predicate Type | Skipping Effectiveness |
|---|---|---|
| No ordering (random) | Range on sort column | Near zero |
| Sorted by date | Range on date | Excellent (>95%) |
| Partitioned by date | Point on date | Perfect (100%) |
| Z-Ordered by (user_id, region) | Multi-predicate compound | Good (50-90%) |
| Bloom Filter on user_id | Point on user_id | Very good (95-99%) |
| Sorted by date + Z-Ordered by user_id | Date range + user_id equality | Excellent |

The combination of partitioning (for the primary temporal dimension), Z-Ordering or Hilbert Clustering (for secondary analytical dimensions), and Bloom Filters (for high-cardinality point lookup columns) covers the full spectrum of query predicates that real analytical workloads use. A table designed with all three mechanisms applied appropriately can achieve file skipping rates exceeding 98% for typical query patterns.

## Dynamic File Pruning: Runtime File Skipping

Static file skipping (the levels described above) uses pre-computed statistics to prune files before execution begins. Dynamic File Pruning (DFP), also called Dynamic Filtering, extends file skipping to use runtime information discovered during query execution to eliminate additional files that static statistics couldn't exclude.

The classic DFP scenario is a join:

```sql
SELECT * FROM large_fact_table f
JOIN small_dimension_table d ON f.customer_id = d.customer_id
WHERE d.country = 'US'
```

Static analysis of `large_fact_table` cannot directly use the `WHERE d.country = 'US'` predicate to prune `large_fact_table` files: the predicate is on the dimension table, not the fact table. However, at runtime, after the dimension table is scanned and filtered, the query engine knows the exact set of `customer_id` values that satisfy `country = 'US'`. It can inject these values back into the fact table scan as a dynamic predicate: "only read fact table files that contain these customer_ids."

Delta Lake's Dynamic File Pruning feature (available in Databricks Runtime) implements exactly this pattern. After building the hash table from the dimension side of a join, Databricks injects the distinct join keys as a dynamic file filter against the fact table's file statistics. Files whose `customer_id` min-max range doesn't overlap with any of the dimension's customer_ids are skipped dynamically, even though those files couldn't be statically pruned.

Apache Iceberg's query planning supports a similar concept through dynamic partition filtering in engines like Trino (via `DynamicFilteringStrategy`) and Spark with Iceberg's integration.

## The Cost of File Skipping Itself

File skipping is not free: reading and evaluating the statistics layer has its own cost. For a query against a table with 10 million files (not uncommon for a petabyte-scale table), the engine must read statistics for all 10 million files to determine which to skip. This statistics-reading operation itself requires:

- **For Iceberg**: Listing the Manifest List, reading all Manifest Files (each potentially several MB), and evaluating per-file statistics. For 10 million files across 10,000 Manifest Files, this could mean reading several hundred MB of Manifest data.
- **For Delta Lake**: Reading the transaction log checkpoint (a large Parquet file) and potentially several MB of JSON commit files to reconstruct the complete current file set with statistics.

For very large tables, the statistics read cost itself becomes non-trivial and can take seconds to minutes. Iceberg's metadata hierarchy (Manifest List → Manifest Files → Data Files) enables hierarchical pruning that limits the number of Manifest Files that need to be fully read, providing more scalable statistics access than Delta's flat transaction log for very large table-file-count scenarios.

This is why metadata caching (caching the transaction log, checkpoint, and Manifest File data in the query engine's memory or in a metadata cache layer) is critical for consistently fast query planning on large lakehouse tables.

## Conclusion

File Skipping is the architectural foundation of all high-performance lakehouse query execution. Its five-level hierarchy (partition pruning, manifest-level pruning, file-level statistics pruning, Bloom Filter pruning, and row-group pruning) works from coarsest to finest granularity, progressively eliminating irrelevant data at each level until only the truly necessary bytes are read. Its effectiveness is determined by the quality of the underlying statistics, which is itself determined by the physical ordering of the data. Engineers who understand file skipping architecture (who design their table layout, statistics collection, and clustering strategies to maximize the effectiveness of each pruning level) will achieve dramatically better query performance and lower compute costs than those who treat the underlying data files as unstructured blobs. File skipping is where data layout meets query planning, and mastering it is the hallmark of expert lakehouse engineering.


## Visual Architecture

![File Skipping Statistics](/images/kb/file_skipping_statistics.png)

