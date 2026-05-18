---
title: "Dremio Arctic"
description: "A definitive technical deep-dive into Dremio Arctic — the managed Nessie-backed catalog service that brought Git-like data versioning, Write-Audit-Publish workflows, automated Iceberg table maintenance, and multi-engine open catalog access to the Dremio Cloud platform, and its evolution into Dremio's open catalog strategy."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 0
tags: ["dremio arctic", "dremio", "nessie", "iceberg catalog", "data-as-code", "write-audit-publish", "apache iceberg", "branching", "data lakehouse"]
---

# Dremio Arctic

Dremio Arctic was a managed, cloud-hosted catalog service for Apache Iceberg tables, built on Project Nessie's Git-like versioned catalog engine and integrated directly into the Dremio Cloud platform. It was Dremio's commercial manifestation of the "data-as-code" vision that motivated Nessie's architectural design: a fully managed, highly available catalog service that brought Git-like operations — branching, tagging, multi-table atomic commits, time travel, and rollback — to data engineering teams without requiring them to operate any catalog infrastructure themselves.

Arctic represented the commercial implementation of the Nessie open-source project, with Dremio providing the managed hosting, availability guarantees, automated table maintenance, security integrations, and user-facing interfaces that transform an open-source catalog engine into a production-ready, enterprise-grade service. It served as the default catalog for Dremio Cloud projects, making Git-like data versioning a native, zero-configuration feature for every Dremio Cloud user.

As of 2025, Dremio transitioned the "Arctic" branding as part of a broader catalog strategy evolution, integrating open standard capabilities — including Apache Polaris-compatible REST Catalog endpoints — into what became Dremio's unified Open Catalog offering. The core capabilities Arctic pioneered (Nessie-backed versioning, automated maintenance, multi-engine REST Catalog access) were preserved and enhanced in this evolution. Additionally, in May 2026, SAP announced its acquisition of Dremio, further integrating Dremio's lakehouse capabilities — including its catalog technology — into the SAP Business Data Cloud.

## The Nessie Foundation

Arctic's technical architecture was built on Project Nessie, which Dremio originally created and continues to maintain as an open-source CNCF sandbox project. As described in the Project Nessie article, Nessie models the entire catalog as a versioned repository: every table metadata pointer update creates an immutable Commit in a directed acyclic graph, named branches are mutable pointers to commit chain tips, and tags are immutable pointers to specific commits.

Arctic provided Nessie's capabilities as a fully managed service:

- **No infrastructure to operate**: Dremio ran and managed the Nessie server infrastructure, backing database, and availability. Users simply configured their compute engines (Spark, Flink, Trino, Dremio itself) to point at their Arctic REST Catalog endpoint.
- **Guaranteed availability**: Arctic ran on Dremio Cloud's multi-region infrastructure with SLA-backed uptime guarantees, providing the reliability appropriate for production data lakehouse catalog services.
- **Security integration**: Arctic integrated with enterprise identity providers (OAuth 2.0, SAML) and Dremio Cloud's RBAC system, ensuring that catalog access was governed by the organization's existing identity management infrastructure.

## The Data-as-Code Workflow

The central philosophy of Arctic — and by extension Nessie — is that data pipelines should be managed with the same rigor, isolation, and version control discipline that software engineering applies to code. The analogy is complete: just as developers use Git branches to develop features in isolation from the main codebase, data engineers can use Arctic/Nessie branches to develop and validate data transformations in isolation from the production data lakehouse.

### The Write-Audit-Publish (WAP) Pattern

The most practically significant workflow enabled by Arctic's Git-like catalog is the **Write-Audit-Publish (WAP)** pattern — a data quality assurance methodology that eliminates the "publish-then-fix" problem endemic to traditional ETL pipelines.

In a traditional ETL pipeline, the pipeline writes transformed data directly to the production table. If the transformation has a bug — incorrect business logic, a schema mismatch, unexpected null values — the error is published directly to the production table and is immediately visible to all downstream consumers. Fixing the error requires either overwriting the bad data (risky, potentially losing good data) or rolling back to the previous state (complex, potentially missing new incoming data).

With the WAP pattern using Arctic:

**Write**: The ETL pipeline creates a new Arctic branch from `main` and writes the transformed data to the target tables on this branch. From the branch, the new data files are written to S3 and the table metadata is updated — but only on the branch. The `main` branch is completely unaffected.

**Audit**: Data quality validation queries run against the branch's version of the tables — checking row counts, null rates, referential integrity, business logic assertions, and other quality metrics. These validations examine the actual data that will be published, not a sample or a simulated result.

**Publish**: If all validations pass, the branch is merged into `main`. The merge advances `main`'s table metadata pointers to include the new data files. The transformation's results are now visible to all consumers of the `main` branch. If validations fail, the branch is simply discarded — no cleanup of `main` is required, because `main` was never modified.

The WAP pattern eliminates an entire category of data quality incidents: bad data cannot reach production consumers because it is validated in isolation before the merge that makes it visible. This transforms data quality assurance from a reactive ("detect and fix after publishing") problem to a proactive ("prevent bad data from reaching production") process.

### Multi-Table Atomic Commits

As described in the Project Nessie article, because Arctic tracks the state of the entire catalog in each commit, a single commit can atomically update the metadata pointers of multiple tables simultaneously. Arctic surfaced this capability through Dremio's SQL interface with multi-table merge operations and through the Nessie REST API for programmatic access.

For ETL pipelines that need to maintain referential integrity across multiple tables — for example, updating a sales fact table and its associated product, customer, and time dimension tables as part of a single ETL run — Arctic's multi-table atomic commit ensures that either all five tables advance to their new states simultaneously, or none do. No downstream query ever sees the fact table in a "new" state while a dimension table is in an "old" state.

### Rollback and Time Travel

Arctic's Nessie-backed commit history provides two distinct time travel capabilities:

**Iceberg snapshot time travel**: Querying a table at a specific Iceberg snapshot ID accesses the data as it existed at that snapshot. This is the standard Iceberg time travel, available in all Iceberg-compatible engines:

```sql
SELECT * FROM orders FOR VERSION AS OF 12345;
SELECT * FROM orders FOR TIMESTAMP AS OF '2026-04-01 00:00:00';
```

**Arctic catalog-level rollback**: Rolling back the entire catalog to a previous commit state — effectively undoing all table changes made since a specific commit hash or tag. This is done by resetting a branch pointer:

```sql
ASSIGN BRANCH main TO TAG pre_migration_snapshot;
```

After this operation, every table in the catalog returns to its pre-migration state. Files written by the migration are orphaned (no longer referenced by any snapshot) and will be cleaned up by Arctic's orphan file maintenance. This is a qualitatively different capability from Iceberg snapshot time travel: it rolls back the entire catalog simultaneously rather than one table at a time.

## Automated Table Maintenance

Like Tabular, Arctic provided fully automated Iceberg table maintenance as a core managed service capability. The distinction between Arctic and Tabular in this regard was primarily in the maintenance's integration with Arctic's versioned catalog architecture: maintenance operations in Arctic were themselves commits on the `main` branch, fully versioned and rollback-capable.

**Compaction**: Arctic monitored each table's file size distribution and automatically triggered compaction jobs to merge small files. Compaction committed a new Iceberg snapshot with the merged files, advancing the table's `main` branch metadata pointer.

**Snapshot expiry**: Arctic enforced configurable snapshot retention policies, automatically expiring snapshots beyond the retention window. Expired snapshots' data files were eligible for orphan file cleanup.

**Orphan file cleanup**: Arctic periodically compared the active files referenced in the current snapshot's Manifest Files against the complete list of files in the table's S3 prefix, identifying and deleting files that were never committed or whose snapshots had been expired.

**Metadata compaction**: Arctic periodically merged Manifest Files and optimized the Manifest List structure to keep query planning metadata reads fast.

All maintenance operations ran automatically in the background on Dremio's managed infrastructure, without user scheduling or monitoring.

## Multi-Engine Access via REST Catalog

Arctic exposed the Apache Iceberg REST Catalog API, allowing any Iceberg REST Catalog-compatible engine to access Arctic-managed tables:

**Apache Spark**:
```python
spark = SparkSession.builder \
  .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
  .config("spark.sql.catalog.arctic", "org.apache.iceberg.spark.SparkCatalog") \
  .config("spark.sql.catalog.arctic.catalog-impl", "org.apache.iceberg.rest.RESTCatalog") \
  .config("spark.sql.catalog.arctic.uri", "https://nessie.dremio.cloud/...") \
  .config("spark.sql.catalog.arctic.credential", "<token>") \
  .getOrCreate()
```

**Apache Flink**, **Trino**, and other engines supported equivalent REST Catalog configurations.

The branch awareness was surfaced through the REST Catalog's `prefix` mechanism: configuring the catalog with a specific branch name as the prefix caused the engine to read and write to that specific Nessie branch rather than `main`. An ETL pipeline job running its development iterations on the `etl/feature-branch` branch would use a catalog configuration with `prefix=etl/feature-branch`, ensuring all its reads and writes were isolated from production.

## The Evolution: Arctic to Dremio Open Catalog

Dremio's catalog strategy evolved from Arctic (Nessie-backed) toward a broader open catalog offering that incorporates Apache Polaris compatibility. This evolution reflected the industry's convergence on the Iceberg REST Catalog specification as the universal catalog protocol:

- Arctic's Nessie-backed REST Catalog API was already REST Catalog compliant.
- Dremio extended its catalog capabilities to include Polaris-compatible endpoints, enabling organizations whose other tools connect to Polaris to also use Dremio's catalog without separate configuration.
- The Dremio Open Catalog strategy positioned Dremio as a catalog-neutral engine that works with any compliant catalog (including Polaris, Nessie/Arctic, Glue, and Unity Catalog) while also providing its own managed catalog option.

## The SAP Acquisition Context

In May 2026, SAP announced the acquisition of Dremio, integrating Dremio's lakehouse technology — including its catalog, query engine, and governance capabilities — into the SAP Business Data Cloud. The Arctic/Open Catalog technology becomes part of SAP's data platform, extending SAP's governance reach into the open lakehouse ecosystem and providing SAP customers with the Git-like data versioning and multi-engine interoperability that Arctic pioneered.

## Conclusion

Dremio Arctic demonstrated that the "data-as-code" philosophy — treating data pipelines with the same Git-like version control discipline applied to software development — is not merely a conceptual framework but a practically implementable, operationally valuable managed service. Its Write-Audit-Publish pattern eliminated an entire category of data quality incidents. Its multi-table atomic commits resolved cross-table consistency problems that single-table ACID semantics leave unaddressed. Its fully automated table maintenance freed data engineering teams from the operational overhead of self-managing Iceberg compaction, snapshot expiry, and orphan file cleanup. And its REST Catalog API compatibility made all of these capabilities accessible to the full ecosystem of Iceberg-compatible engines. The capabilities Arctic pioneered are now considered table stakes for enterprise-grade managed Iceberg catalog services, a testament to how fundamentally Dremio Arctic shaped the expectations of what a production data lakehouse catalog should deliver.
