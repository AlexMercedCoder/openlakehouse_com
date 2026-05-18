---
title: "Delete Files"
description: "A comprehensive guide to Delete Files in Apache Iceberg, explaining how metadata-tracked delta files enable Merge-on-Read architectures."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 0
tags: ["delete files", "apache iceberg", "merge-on-read", "data engineering"]
---

# Delete Files

In an immutable storage layer like Amazon S3, you cannot open a Parquet file, locate a specific row, and hit the "delete" key. The only way to remove a row is to rewrite the entire file (Copy-on-Write) or to use a logical tombstone mechanism. 

In Apache Iceberg, these logical tombstones are known as **Delete Files**.

Introduced in the Iceberg V2 specification to enable Merge-on-Read (MoR) capabilities, Delete Files are specialized Parquet or Avro files that exist alongside standard data files. However, instead of containing business data, they contain explicit instructions on which rows in the data files should be ignored during a query.

## The Role in the Metadata Tree

Delete files are strictly tracked by the Iceberg metadata layer, specifically within the Manifest Files. 

When a query engine plans a query, it reads the Manifests. The Manifest will indicate: "Here is Data File A. Also, please note that Delete File X and Delete File Y must be applied to Data File A." 

This explicit mapping is critical. The query engine does not have to blindly scan a folder looking for random tombstones. It knows exactly which Delete Files apply to which Data Files before it even begins reading the physical bytes, ensuring optimal query planning.

## Types of Delete Files

To handle different types of analytical and streaming workloads, Iceberg supports two distinct types of Delete Files:

1.  **Position Deletes:** These files define a deletion based on the exact physical location of a row within a specific data file (e.g., "Delete row index 15,402 in `file_A.parquet`"). These are extremely fast to resolve at read time but require the writing engine to know exactly where the row lives.
2.  **Equality Deletes:** These files define a deletion based on a logical predicate (e.g., "Delete any row where `customer_id = 99`"). These are very fast to write for streaming CDC engines, but require more CPU overhead to resolve during a read query.

Together, these Delete Files allow Iceberg to absorb rapid row-level mutations without suffering the catastrophic write amplification inherent in legacy lakehouse architectures.

*(Diagram 1: Delete Files tracked alongside Data Files in Manifests - Pending Generation)*
*(Diagram 2: Comparison of Position vs Equality Delete structures - Pending Generation)*
