---
title: "Remove Orphan Files"
description: "A comprehensive guide to Remove Orphan Files in Apache Iceberg, detailing how to clean up abandoned data files caused by failed jobs or network interrupts."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 0
tags: ["remove orphan files", "apache iceberg", "maintenance", "storage optimization"]
---

# Remove Orphan Files

Data lakehouse operations are inherently distributed and prone to environmental failures. A Spark cluster might be preempted by the cloud provider, a network timeout might interrupt a write operation, or a developer might aggressively kill an ETL job mid-flight.

When these failures occur, the compute engine may have already written gigabytes of physical Parquet files to the object storage (S3/GCS) *before* it had a chance to commit those files to the Iceberg metadata catalog. 

These files are effectively invisible. The Iceberg catalog doesn't know they exist, so the standard `Expire Snapshots` garbage collection will never touch them. These abandoned files are known as **Orphan Files**, and they quietly inflate object storage bills.

## The Cleanup Procedure

To reclaim storage space from these abandoned files, Iceberg provides the **Remove Orphan Files** maintenance procedure.

This procedure operates by comparing the physical reality of the storage layer against the logical truth of the metadata catalog.
1.  **Metadata Scan:** The job reads the entire Iceberg metadata tree (Manifest Lists and Manifest Files) to build an exact, comprehensive list of every single physical file currently referenced by any active or historical snapshot.
2.  **Storage Scan:** The job performs a directory-level list operation directly against the object storage (e.g., `s3://my-bucket/my-table/data/`).
3.  **Diff and Delete:** It compares the two lists. Any physical file found in the storage bucket that is *not* present in the metadata list is explicitly classified as an Orphan File and is permanently deleted.

## Safety Margins

Running a directory scan on object storage is not perfectly instantaneous, and other ETL jobs might be actively writing files to the same directory while the orphan cleanup is running. 

To prevent the `removeOrphanFiles` job from accidentally deleting files that are currently being written but haven't been committed yet, Iceberg employs a safety margin (e.g., `older_than = 3 days`). The job will only delete an unreferenced file if its physical creation timestamp is older than the safety margin, guaranteeing it is truly abandoned and not just a slow write in progress.

*(Diagram 1: Network failure creating uncommitted Orphan Files in object storage - Pending Generation)*
*(Diagram 2: Remove Orphan Files job performing a diff between metadata and physical storage - Pending Generation)*
