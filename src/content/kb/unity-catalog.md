---
title: "Unity Catalog"
description: "A definitive technical deep-dive into Unity Catalog — Databricks' open-source universal governance layer for structured data, unstructured data, and AI assets, covering its hierarchical RBAC model, Delta UniForm Iceberg interoperability, credential vending, and its 2024 open-source release under LF AI & Data."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 1
tags: ["unity catalog", "databricks", "delta lake", "apache iceberg", "rbac", "governance", "credential vending", "data lakehouse"]
---

# Unity Catalog

Unity Catalog is Databricks' enterprise governance layer for the lakehouse — a centralized metadata, access control, and data discovery service that manages structured tables (Delta Lake and Apache Iceberg), unstructured data (files and volumes), and AI assets (ML models, registered functions) under a unified governance model. In June 2024, Databricks open-sourced Unity Catalog under the Apache 2.0 license and donated it to the Linux Foundation's LF AI & Data foundation, positioning it as a vendor-neutral, community-governed universal catalog standard rather than a proprietary Databricks product.

This open-source release was a watershed moment in the lakehouse catalog landscape. For the first time, organizations can deploy Unity Catalog independently of a Databricks subscription, using it as the governance backbone for heterogeneous compute environments that span Spark, Trino, Flink, dbt, and Snowflake — not just Databricks Runtime. Combined with Unity Catalog's implementation of the Apache Iceberg REST Catalog API and its support for Delta UniForm, the open-source release positions Unity Catalog as a serious competitor to Apache Polaris for the role of universal open lakehouse catalog standard.

## The Architecture: Three-Tier Metastore Hierarchy

Unity Catalog organizes all governed assets into a three-tier hierarchical namespace that maps directly to the SQL dotted-notation: `catalog.schema.table`.

**Metastore**: The top-level container for a Unity Catalog deployment. A metastore is associated with a specific cloud region and a specific cloud provider storage location (e.g., an AWS S3 bucket or an Azure ADLS container) that serves as the default storage for managed tables. An organization typically has one metastore per cloud region.

**Catalog**: The second-tier organizational unit within a metastore. A metastore can contain multiple catalogs (analogous to databases in traditional data warehouses or to top-level namespaces in Iceberg). Catalogs provide the primary organizational boundary for separating business domains (`analytics`, `marketing`, `finance`) or environments (`production`, `staging`, `development`).

**Schema**: The third tier, equivalent to a database schema or an Iceberg namespace. Schemas organize tables, views, volumes, and functions within a catalog.

**Table**: An individual data table — either a managed Delta Lake table (with both metadata and data managed by Unity Catalog), an external table (metadata in Unity Catalog, data in user-specified storage), or an Iceberg external table (accessed through the Iceberg REST Catalog API).

**Volume**: An unstructured data path registered in Unity Catalog, allowing governance policies (RBAC, audit logging) to be applied to directories of files (PDFs, images, JSON files) rather than just structured tables.

**Model**: An ML model version registered in MLflow and governed through Unity Catalog, enabling fine-grained access control on trained models alongside the data used to train them.

**Function**: A registered user-defined function (UDF) or AI function, governed and shareable across the organization through Unity Catalog.

## The RBAC Model: Hierarchical Permissions

Unity Catalog implements a hierarchical RBAC model where permissions can be granted at any level of the namespace hierarchy and propagate downward (with explicit override capability at any level).

### Permission Types

Unity Catalog defines a rich set of privilege types:

**Data privileges**: `SELECT` (read table data), `MODIFY` (INSERT, UPDATE, DELETE, MERGE on tables), `READ VOLUME` (read files from a volume), `WRITE VOLUME` (write files to a volume), `ALL PRIVILEGES` (all privileges at the granted scope).

**DDL privileges**: `CREATE TABLE`, `CREATE SCHEMA`, `CREATE CATALOG`, `CREATE VOLUME`, `CREATE FUNCTION`, `CREATE MODEL`.

**Metadata privileges**: `BROWSE` (view the existence of a table in the catalog browser without reading its data), `APPLY TAG` (annotate objects with tags).

**Metastore admin privileges**: `CREATE CATALOG` at the metastore level, `MANAGE ALLOWLIST` for network policy.

### The Inheritance Model

Permissions granted at higher levels cascade downward. Granting `SELECT` on a catalog grants `SELECT` on all schemas in that catalog and all tables in those schemas, unless overridden by an explicit `REVOKE` at a lower level. This inheritance model simplifies governance for large table estates: instead of granting `SELECT` on each of 10,000 tables individually, an administrator grants `SELECT` on the parent catalog and every table inherits the permission automatically.

Permissions can be granted to:
- **Users**: Individual Databricks workspace users or external identity provider users.
- **Groups**: Named collections of users managed by the identity provider (Azure Active Directory, Okta, AWS IAM Identity Center) or defined within Databricks.
- **Service Principals**: Machine identities for automation pipelines, compute clusters, and API integrations.

### Row and Column Level Security

Unity Catalog extends RBAC beyond table-level permissions to row-level and column-level filtering:

**Row-level security**: Implemented through **Row Filters** — SQL functions that are attached to a table and evaluate whether the current session's user is permitted to see each row. For example, a row filter on a `sales` table might be `WHERE region = current_user_region()`, ensuring each user only sees data for their own region.

**Column masking**: Implemented through **Column Masks** — SQL functions attached to specific columns that transform the column's value based on the caller's identity. Sensitive columns (e.g., `ssn`, `credit_card`) can be masked to `NULL`, partially redacted (e.g., returning only the last four digits of an SSN), or fully returned — based on the caller's group membership.

These row and column security features make Unity Catalog the most granular governance layer available for open lakehouse tables, providing data access controls that previously required complex, custom Spark code or expensive commercial DLP tools.

## Delta Lake and Apache Iceberg Interoperability

Unity Catalog is the governance layer for Databricks' entire table format ecosystem, supporting both Delta Lake (Databricks' native format) and Apache Iceberg through two complementary mechanisms.

### Delta UniForm: Iceberg Metadata for Delta Tables

As described in the Delta UniForm article, Delta tables in Unity Catalog can have UniForm enabled, which causes Delta to asynchronously generate Iceberg-compatible metadata files alongside the standard Delta `_delta_log`. External Iceberg-native engines (Trino, Snowflake, Flink, Dremio) can then read Unity Catalog-managed Delta tables as Iceberg tables without any data conversion.

When UniForm is enabled on a Unity Catalog-managed table, the table is simultaneously a first-class Delta Lake table (for Databricks and Spark) and a first-class Iceberg table (for any Iceberg-compatible engine). The RBAC policies in Unity Catalog apply to both interfaces — the same `SELECT` permission grants controls both the Databricks-native access and the Iceberg REST Catalog access.

### The Iceberg REST Catalog Endpoint

Unity Catalog implements the Apache Iceberg REST Catalog API, exposing a standard REST endpoint that any Iceberg-compatible engine can configure as its catalog. Through this endpoint:

- External engines discover Unity Catalog-managed tables through the standard REST `GET /tables` and `GET /tables/{table}` endpoints.
- External engines load table metadata (the Iceberg metadata file URI) through the REST load table endpoint.
- External engines receive vended storage credentials scoped to the specific table's storage paths.
- External engines commit new table states through the REST commit endpoint's compare-and-swap protocol.

This means that configuring Trino to access Unity Catalog is as simple as setting `iceberg.catalog.type=rest` and pointing to Unity Catalog's REST endpoint URL — no Databricks-specific connector, no custom Hive Metastore client, and no broad S3 IAM permissions needed on the Trino cluster.

## Credential Vending

Unity Catalog's credential vending mechanism works on the same principles as Polaris's: when an engine requests access to a table, Unity Catalog generates short-lived, scoped cloud storage credentials that are valid only for the specific storage paths of that table.

For AWS-backed Unity Catalog deployments, credential vending generates AWS STS temporary credentials (access key + secret key + session token) via `AssumeRole` with a restrictive IAM policy condition scoped to the specific S3 prefix. The credentials expire after 15 minutes to 1 hour, and the engine must call Unity Catalog again to refresh them for longer-running queries.

For Azure-backed deployments, credential vending generates Azure Shared Access Signature (SAS) tokens scoped to the ADLS Gen2 container paths. For GCP-backed deployments, Unity Catalog generates GCS service account access tokens.

The security implication is identical to Polaris's credential vending: no compute engine (Spark cluster, Trino worker, DuckDB process) needs standing cloud storage credentials. All storage access is mediated through Unity Catalog's credential vending, which enforces the RBAC policies at the moment of credential generation.

## Delta Sharing: Cross-Organization Data Sharing

Unity Catalog is the control plane for **Delta Sharing** — an open protocol for sharing live data across organizational boundaries without copying the data.

A data provider (an organization with data in Unity Catalog) creates a Share — a collection of table snapshots or live table references — and grants access to data recipients (other organizations or external users). The recipient uses the Delta Sharing client (available for Spark, Pandas, Tableau, Power BI, and other tools) to access the shared data using credentials issued by the provider's Unity Catalog instance.

Delta Sharing provides:
- **Zero-copy cross-org data sharing**: Recipients access the provider's data directly (with scoped credentials), without the provider copying the data to the recipient's environment.
- **Vendor-neutral access**: The Delta Sharing protocol is open and implemented by clients for Spark, pandas, R, and BI tools — recipients don't need a Databricks subscription.
- **Fine-grained access control**: The provider can share specific tables, specific snapshots (point-in-time), or specific partitions, with RBAC controlling which recipients can access which shared resources.

## Audit Logging

Every data access event through Unity Catalog is logged to a centralized audit log: who accessed what table, when, from which compute resource, with what result (success or permission denied). The audit log is written to the metastore's root storage location as Parquet files, making it queryable by any engine with access to the storage location.

The audit log enables:
- **Access pattern analysis**: Identify which tables are queried most frequently, by which users, and from which compute resources.
- **Compliance reporting**: Demonstrate to regulators that only authorized users accessed sensitive data during a specific time period.
- **Security forensics**: Investigate unauthorized access patterns or anomalous data access events.

## Unity Catalog vs. Apache Polaris

Unity Catalog and Apache Polaris are currently the two leading candidates for the role of universal open lakehouse catalog standard. Their positioning is meaningfully different:

| Dimension | Unity Catalog | Apache Polaris |
|---|---|---|
| Primary backer | Databricks / LF AI & Data | Apache Software Foundation (donated by Snowflake) |
| Native format | Delta Lake (with Iceberg via UniForm) | Apache Iceberg (native) |
| AI/ML assets | Native (models, functions, volumes) | Not included |
| Row/column security | Native (row filters, column masks) | Not included (delegated to query engine) |
| Cross-org sharing | Delta Sharing native | Not included |
| REST Catalog compliance | Full Iceberg REST API | Full Iceberg REST API |
| Credential vending | AWS + Azure + GCP | AWS + Azure + GCP |

Organizations deeply invested in Databricks and Delta Lake will naturally gravitate toward Unity Catalog for its native Delta integration, AI asset governance, and row/column security. Organizations building engine-neutral Iceberg-first lakehouses will find Polaris's simpler, more focused catalog model a better fit. Both will continue to gain features and adoption as the open lakehouse catalog ecosystem matures.

## Conclusion

Unity Catalog's 2024 open-source release fundamentally changed the lakehouse governance landscape. By making its comprehensive RBAC model, credential vending infrastructure, Iceberg REST Catalog compatibility, and Delta UniForm interoperability available under an open-source license, Databricks transformed Unity Catalog from a proprietary feature of the Databricks platform into a public infrastructure component that the entire industry can build on. For organizations running Databricks-centric lakehouses with Delta Lake as their primary format, Unity Catalog is the natural, best-integrated governance layer. For organizations prioritizing engine neutrality and Iceberg-first architectures, it is increasingly a viable and capable alternative to Apache Polaris. The convergence of both toward the Iceberg REST Catalog standard as the interoperability protocol ensures that whichever catalog an organization chooses, they will have access to the growing ecosystem of engines, tools, and services that speak the common language of the open data lakehouse.


## Visual Architecture

![Unity Catalog Architecture](/images/kb/unity_catalog_architecture.png)

