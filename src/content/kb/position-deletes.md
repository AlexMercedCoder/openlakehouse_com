---
title: "Position Deletes"
description: "Within the Merge-on-Read (MoR) architecture of Apache Iceberg, there are two methods for creating a logical tombstone to hide a record."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 1
tags: ["position deletes", "apache iceberg", "merge-on-read", "optimization"]
layer: "table"
---

# Position Deletes

Within the Merge-on-Read (MoR) architecture of Apache Iceberg, there are two methods for creating a logical tombstone to hide a record. The most efficient method for the query engine to resolve at read-time is the **Position Delete**.

A Position Delete file is a specialized metadata file (usually written in Parquet) that explicitly identifies a deleted row using its absolute physical coordinates on disk.

## How Position Deletes Work

A Position Delete file contains two primary columns:
1.  **`file_path`**: The absolute URI to the specific Parquet data file containing the deleted record.
2.  **`pos` (Position)**: The exact ordinal row index (e.g., row number 1,405) within that specific file.

When a query engine (like Trino or Spark) executes a `SELECT` statement, it reads the data file and the associated Position Delete file simultaneously. 

Because the query engine already knows the exact index of every row it is streaming from the data file, resolving a Position Delete requires almost zero CPU overhead. The engine simply streams the rows and drops row 1,405 from the stream as it passes by in memory. There is no need to evaluate complex business logic, join keys, or compare strings. 

## The Trade-off: Write-Time Complexity

While Position Deletes are incredibly fast at *read-time*, they are harder to generate at *write-time*. 

If a user executes `DELETE FROM users WHERE account_status = 'banned'`, the writing engine cannot simply write "banned" into a file. The engine must first execute a massive `SELECT` query to scan the entire data lake, find exactly which files contain the banned users, determine the exact row index of each banned user within those files, and *then* write the Position Delete file.

Because of this write-time overhead, Position Deletes are typically used for batch `MERGE` operations, or generated in the background by Iceberg maintenance jobs to optimize the slower Equality Deletes created by streaming ingestion.

*(Diagram 1: The structure of a Position Delete File (File Path + Row Index) - Pending Generation)*
*(Diagram 2: Query engine resolving Position Deletes with minimal overhead - Pending Generation)*


## Visual Architecture

![Position Deletes Bitmap](/images/kb/position_deletes_bitmap.png)

