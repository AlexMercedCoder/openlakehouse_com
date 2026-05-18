---
title: "Expire Snapshots"
description: "A comprehensive guide to Expire Snapshots in Apache Iceberg, detailing how garbage collection manages storage costs in a versioned data lakehouse."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 0
tags: ["expire snapshots", "apache iceberg", "garbage collection", "storage optimization"]
---

# Expire Snapshots

A defining feature of Apache Iceberg is its ability to create a new Snapshot for every single transaction. This enables powerful features like Time Travel, Rollback, and concurrent reader/writer isolation. 

However, this versioning comes at a physical cost. Every time you `UPDATE` or `DELETE` data (especially in a Copy-on-Write architecture), Iceberg creates new Parquet files. The old, unreferenced Parquet files are intentionally left on the hard drive so that historical queries can still read them. 

If left unchecked in a high-throughput environment, a 1-terabyte table could easily generate 50 terabytes of historical, "dead" data files in a month, leading to astronomical AWS S3 or MinIO storage bills.

The mechanism to reclaim this storage is the **Expire Snapshots** action.

## Garbage Collection

`expireSnapshots` is a maintenance procedure (usually executed via Spark or a managed catalog service) that acts as Iceberg's primary garbage collector.

When configured, a data engineer defines a retention policy (e.g., "Retain all snapshots from the last 7 days"). 

When the `expireSnapshots` job runs, it evaluates the metadata tree:
1.  **Identify Old Snapshots**: It locates all Snapshots older than the 7-day cutoff.
2.  **Check for Protections**: It checks if any of these old Snapshots are anchored by an active Branch or a permanent Tag. If they are, they are protected and skipped.
3.  **Logical Deletion**: It logically removes the unprotected old Snapshots from the active Iceberg metadata history.
4.  **Physical Deletion**: It scans the Manifests of the deleted Snapshots. Any physical Parquet or Avro data files that are *only* referenced by those deleted Snapshots (and not by any newer, active Snapshot) are permanently and physically deleted from object storage.

## Managing the Trade-off

Running `expireSnapshots` is a balance between storage cost and historical auditability. 

If you aggressively expire snapshots every 24 hours, your object storage costs will be minimized, but your analysts will only be able to Time Travel back one day. If you retain snapshots for 5 years for strict financial compliance, you must be prepared to pay the ongoing storage costs for massive amounts of historical data files.

*(Diagram 1: Expire Snapshots physically deleting Parquet files unreferenced by active snapshots - Pending Generation)*
*(Diagram 2: The trade-off between Time Travel window and Storage Costs - Pending Generation)*
