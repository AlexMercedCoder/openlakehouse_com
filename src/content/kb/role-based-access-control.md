---
title: "Role-Based Access Control (RBAC)"
description: "Role-Based Access Control is the dominant access management model in enterprise data infrastructure: a system that grants permissions to named roles, and."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 1
tags: ["rbac", "role-based access control", "data governance", "iceberg catalog", "apache polaris", "unity catalog", "lake formation", "data lakehouse"]
layer: "catalog"
---

# Role-Based Access Control (RBAC)

Role-Based Access Control is the dominant access management model in enterprise data infrastructure: a system that grants permissions to named roles, and then assigns roles to users and service accounts, rather than granting permissions directly to individual identities. RBAC's core insight is that enterprise organizations have stable, recurring job functions (data analyst, ETL engineer, data scientist, catalog administrator) whose access requirements are consistent across all users performing that function. By encoding permissions in reusable role definitions rather than per-user grants, RBAC makes large-scale access policy management administratively tractable.

In the data lakehouse context, RBAC governs who can read, write, or modify which tables, schemas, and catalogs, and critically, it is enforced by the Iceberg catalog service rather than by individual query engines. This catalog-side enforcement means that the same RBAC policy applies whether a user queries through Spark, Trino, Dremio, or Python: the catalog evaluates permissions identically for all callers.

## The Fundamental RBAC Model

Every RBAC system has three core building blocks:

**Subjects**: The entities to which access is granted: users (human identities), service accounts (machine identities for compute engines), and groups (collections of users managed by an identity provider).

**Objects**: The resources being protected, in the lakehouse context, catalogs, namespaces, tables, views, volumes, and functions.

**Privileges**: The specific operations permitted on objects: `SELECT` (read table data), `INSERT` / `MODIFY` (write data), `CREATE TABLE` (DDL), `DROP` (delete), `ALTER` (schema change), `MANAGE` (administration).

RBAC adds **Roles** as an intermediate layer between subjects and privileges: a role is a named collection of (object, privilege) pairs. Subjects are assigned roles; roles grant privileges on objects. The access evaluation for a specific operation is: "does any role assigned to this subject include a privilege for this operation on this object?"

The critical operational advantage of this indirection is that when a job function's access requirements change (e.g., analysts now need access to the new marketing catalog), the administrator updates one role definition, and all users with that role automatically inherit the new access. Without roles, the administrator would need to update the grants for every individual user individually.

## Hierarchical RBAC in Lakehouse Catalogs

Lakehouse catalogs (Polaris, Unity Catalog, Lake Formation) implement hierarchical RBAC, where privileges granted at higher levels of the namespace hierarchy cascade downward unless explicitly overridden.

### The Namespace Hierarchy

A typical Iceberg namespace hierarchy:

```
Catalog: analytics
  Namespace: finance
    Namespace: finance.revenue
      Table: finance.revenue.orders
      Table: finance.revenue.refunds
    Namespace: finance.forecasting
      Table: finance.forecasting.quarterly_projections
  Namespace: marketing
    Table: marketing.campaigns
    Table: marketing.conversion_events
```

With hierarchical RBAC:

- A `SELECT` grant at the **catalog level** (`analytics`) grants read access to every table in the catalog.
- A `SELECT` grant at the **namespace level** (`analytics.finance`) grants read access to every table in the `finance` namespace and all its child namespaces.
- A `SELECT` grant at the **table level** (`analytics.finance.revenue.orders`) grants read access only to that specific table.

This hierarchy enables efficient policy management for large table estates: instead of granting access to 10,000 tables individually, an administrator grants access at the catalog or namespace level, and all tables inherit it automatically. Exceptions (tables that specific roles should NOT access despite the namespace-level grant) are handled with explicit `REVOKE` grants at the table level.

### Apache Polaris RBAC Implementation

Polaris implements a two-layer RBAC model:

**Principal Roles**: Named groupings of service principals (compute engine identities, user identities). A principal role (e.g., `etl_engineers`) defines which principals share the same access profile.

**Catalog Roles**: Named sets of privileges defined within a specific catalog. A catalog role specifies which operations are permitted on which catalog resources.

**Grant bindings**: A grant binding connects a principal role to a catalog role: "the `etl_engineers` principal role is assigned the `etl_write_access` catalog role in the `analytics` catalog." All principals in `etl_engineers` thereby receive the privileges of `etl_write_access`.

**Privilege types** in Polaris:
- `CATALOG_MANAGE_CONTENT`: Full DDL and DML, including creating/dropping tables.
- `CATALOG_MANAGE_ACCESS`: Administering RBAC policies (assigning roles, granting privileges).
- `NAMESPACE_CREATE`, Creating new namespaces.
- `TABLE_READ_DATA`: Reading table data.
- `TABLE_WRITE_DATA`: Writing table data (INSERT, UPDATE, DELETE, MERGE).
- `TABLE_READ_PROPERTIES`: Reading table metadata (schema, partition spec).
- `TABLE_WRITE_PROPERTIES`: Writing table properties.
- `VIEW_CREATE`, `VIEW_READ`, etc. for views.

### Unity Catalog RBAC Implementation

Unity Catalog uses a similar hierarchy but with richer permission types:

**Data privileges**: `SELECT`, `MODIFY`, `READ VOLUME`, `WRITE VOLUME`.
**DDL privileges**: `CREATE TABLE`, `CREATE SCHEMA`, `CREATE CATALOG`, `CREATE VOLUME`, `CREATE FUNCTION`, `CREATE MODEL`.
**Administration**: `USE CATALOG`, `USE SCHEMA` (required to see catalog/schema existence), `APPLY TAG`.
**Ownership**: Every object has an owner who has full control by default.

Unity Catalog's `BROWSE` permission allows a role to see that a catalog/schema/table exists in the data catalog browser without having `SELECT` access: enabling discoverability without data access (users can see "this table exists and has these columns" without reading any data).

Row-level security (row filters) and column masking in Unity Catalog extend RBAC to sub-table granularity, as described in the Unity Catalog article.

### AWS Lake Formation RBAC

Lake Formation's RBAC model works differently from catalog-native RBAC: it sits as a separate governance layer on top of the AWS Glue Data Catalog, intercepting API calls and evaluating permissions independently of the Glue catalog's own metadata.

Lake Formation permissions are granted on Glue catalog objects (databases, tables, columns) to IAM principals (users, groups, roles). The permissions are evaluated by Lake Formation when an engine calls Glue to load table metadata or when an engine calls S3 with credentials vended by Lake Formation's credential vending system.

**Table-level Lake Formation permissions**: `SELECT`, `INSERT`, `DELETE`, `DESCRIBE`, `ALTER`, `DROP`.
**Column-level Lake Formation permissions**: `SELECT` on specific column lists, excluding unauthorized columns from query results.
**Row-level Lake Formation filters**: SQL predicate conditions that restrict which rows a specific IAM principal can access.

Lake Formation's hybrid access mode allows organizations to mix Lake Formation permissions with bucket-level IAM permissions during migration, enabling gradual adoption of fine-grained governance without a big-bang cutover.

## The Separation of Authentication and Authorization

RBAC in the lakehouse context depends on a clear separation between authentication (who is this?) and authorization (what can they do?):

**Authentication** is handled by the identity layer: OAuth 2.0 tokens issued by the identity provider (Okta, Azure Active Directory, AWS IAM Identity Center), verified by the catalog on every API call. The catalog extracts the caller's identity from the validated token.

**Authorization** is handled by the RBAC layer: the catalog evaluates the caller's identity against the role assignments and privilege definitions to determine what operations are permitted.

This separation means that the catalog doesn't need to manage user credentials directly: it delegates authentication to a trusted identity provider and focuses on authorization. Any identity provider that can issue OAuth 2.0 tokens can integrate with RBAC-capable catalogs (Polaris, Unity Catalog).

## Role Design Patterns for Lakehouse Environments

### Pattern 1: Environment-Based Roles

Separate roles for separate environments:
- `prod_read`: Read access to production tables.
- `prod_write`: Write access to production tables.
- `staging_read_write`: Read and write access to staging tables.
- `dev_all`: Full access to development tables.

Data engineers are assigned `dev_all` and `staging_read_write`; production ETL service accounts are assigned `prod_write`; BI tools are assigned `prod_read`.

### Pattern 2: Domain-Based Roles

Roles aligned with data mesh domain ownership:
- `finance_owner`: Full access to the finance domain catalog.
- `finance_reader`: Read-only access to finance tables.
- `marketing_owner`: Full access to the marketing domain catalog.
- `cross_domain_analyst`: Read-only access to all domain catalogs for cross-domain analysis.

### Pattern 3: Function-Based Roles

Roles aligned with job functions:
- `etl_engineer`: Write access to raw and silver layer tables; read access to bronze sources.
- `data_scientist`: Read access to gold layer curated datasets; write access to ML experiment tables.
- `bi_analyst`: Read access to gold layer tables and semantic layer virtual datasets.
- `catalog_admin`: Full catalog management (create/drop tables, manage RBAC policies).
- `ml_pipeline`: Write access to feature store tables; read access to training data.

### Combining Patterns

Real-world lakehouse RBAC combines all three: domain-specific functions in environment-specific catalogs. A role like `finance_etl_engineer_prod` represents a finance domain ETL engineer in the production environment. This specificity enables precise audit trails (the audit log shows which role, mapped to which domain and function, accessed which table).

## Operational RBAC Governance

### The Principle of Least Privilege

Effective RBAC governance requires disciplined application of least privilege: every principal receives only the minimum privileges required to perform its function. This principle is violated when administrators grant broad privileges (catalog-level `ALL`) for convenience and forget to narrow them later, or when service accounts are granted human-level access (including DDL) when they only need DML.

Quarterly privilege audits, reviewing all role assignments and privilege grants to identify and revoke excess permissions, are a governance hygiene practice that prevents privilege accumulation from eroding the security boundary over time.

### RBAC and Credential Vending Interaction

As described in the Credential Vending article, RBAC and credential vending work together as a two-layer enforcement mechanism. RBAC determines what the catalog will authorize; credential vending determines what storage access the engine physically receives. The combination means:

1. RBAC prevents unauthorized callers from receiving table metadata (catalog-layer enforcement).
2. Credential vending restricts authorized callers' storage access to only the tables they are authorized for (storage-layer enforcement).

Neither layer alone is sufficient; both are required for the strongest security posture.

### Role Proliferation Management

A common RBAC anti-pattern is role proliferation: over time, administrators create too many fine-grained roles, making the overall policy difficult to audit and maintain. If a lakehouse ends up with 5,000 roles for 200 tables, something has gone wrong: the role model has become more complex than the underlying access policy it is trying to represent.

Good RBAC hygiene limits the number of roles to a manageable set (typically tens to hundreds, not thousands) by using hierarchical namespace grants to represent broad access and table-level grants only for specific exceptions.

## Conclusion

Role-Based Access Control is the foundational access governance model for enterprise data lakehouse deployments. Its ability to encode access policy in reusable role definitions, assigned to principals through a managed identity system and enforced by the catalog on every API call, makes it the only practical approach to governing access at the scale of a modern data estate (hundreds of tables, dozens of business units, hundreds or thousands of users and service accounts). The hierarchical RBAC implementations in Apache Polaris, Unity Catalog, and AWS Lake Formation each bring catalog-native enforcement that applies uniformly across query engines. Combined with credential vending's physical storage-layer enforcement, RBAC provides the complete access governance model that enterprise lakehouse security demands.


## Visual Architecture

![Rbac Hierarchy](/images/kb/rbac_hierarchy.png)

