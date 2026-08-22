---
title: "Credential Vending"
description: "A definitive technical deep-dive into Credential Vending — the Iceberg REST Catalog security mechanism that replaces long-lived compute engine cloud credentials with dynamically generated, short-lived, table-scoped storage tokens, enabling true table-level access control enforced at the cloud storage layer."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 1
tags: ["credential vending", "iceberg catalog", "rest catalog", "aws sts", "security", "access control", "apache polaris", "data lakehouse"]
layer: "catalog"
---

# Credential Vending

Credential Vending is the security mechanism in the Apache Iceberg REST Catalog specification that enables catalog services to dynamically generate short-lived, table-scoped cloud storage credentials for compute engines on demand — replacing the traditional model where engines hold standing, broad IAM permissions to access the entire storage bucket where lakehouse data resides.

It is the architectural capability that makes table-level access control at the cloud storage layer possible in the open lakehouse. Without credential vending, access control can be enforced logically (the catalog can refuse to return table metadata for unauthorized tables), but the storage layer itself remains accessible to any entity with bucket-level IAM permissions. With credential vending, even if an engine somehow bypassed the catalog API, it would have no credentials to read the storage objects — because the credentials for each table are generated transiently and never stored in the compute engine.

## The Problem Credential Vending Solves

### The Traditional Storage Access Model

In the conventional open data lake architecture, security is enforced through a two-layer model:

**Layer 1 — Catalog access control**: The catalog service returns or denies table metadata based on the caller's identity and RBAC policies. An unauthorized caller cannot get the table's metadata file URI.

**Layer 2 — Storage-level access**: The compute engine (Spark, Trino, Flink) uses standing cloud IAM credentials (an EC2 instance role, a Kubernetes service account, a static access key) to read and write objects in the storage bucket.

The critical weakness of this model is that Layer 2 permissions are typically granted at the bucket or prefix level — far coarser than the table level. A Spark cluster with `s3:GetObject` permission on `s3://data-lake-bucket/*` can read any object under that bucket, regardless of which table it belongs to. If an engineer knows the S3 path of a table they are not authorized to access in the catalog, they can read it directly from S3 with the Spark cluster's credentials, completely bypassing the catalog's access control.

This bucket-level storage permission model has several compounding problems:

**Over-privileged compute**: The principle of least privilege — granting only the minimum access necessary — is violated by design. A Spark cluster running a single customer's ETL job has IAM access to every table in the warehouse, even tables belonging to other customers or business units.

**Credential theft impact radius**: If a Spark cluster's IAM credentials are compromised (e.g., through an SSRF attack against the EC2 instance metadata endpoint, a credential leak in logs, or a supply chain attack on a cluster library), the attacker gains access to the entire warehouse bucket — all tables, all customers' data, all historical data — not just the specific table the cluster was processing.

**Audit gaps**: When a Spark cluster accesses S3 directly using its IAM role, the S3 access log records "the Spark cluster read object X" but not "user Y submitted query Z that caused the cluster to read object X." The user-level audit trail requires correlating S3 logs with application logs — a complex, error-prone process that many compliance frameworks consider insufficient.

**No per-table revocation**: Revoking a specific user's access to a specific table when using bucket-level IAM permissions requires either revoking the entire cluster's S3 access (disrupting all other jobs on the cluster) or restructuring the S3 prefix hierarchy so the table lives in a separate prefix with a separate IAM policy.

### What Credential Vending Eliminates

Credential Vending eliminates all of these problems by making the catalog the sole issuer of storage credentials:

- Compute engines hold zero standing cloud storage permissions.
- Each credential set is scoped to the specific S3 prefix (or ADLS container path, or GCS prefix) of the specific table being accessed.
- Credentials expire automatically (typically 15 minutes to 1 hour), limiting the impact window of any credential theft.
- Credential issuance is logged by the catalog, providing a complete audit trail of who accessed what table, when, and from which compute identity.
- Revoking a user's access to a table takes effect within one credential TTL period — no IAM policy changes required.

## The Technical Mechanism

### Step 1: Compute Engine Authentication

The compute engine authenticates with the REST Catalog service using OAuth 2.0 bearer tokens (the primary mechanism) or other supported authentication schemes. The engine's identity is established: it is running as service principal `spark-etl-cluster` with OAuth token `eyJ...`.

### Step 2: Table Load Request

The compute engine calls the REST Catalog's Load Table endpoint:

```
GET /v1/{prefix}/namespaces/{namespace}/tables/{table}
```

The request includes the engine's bearer token in the `Authorization` header.

### Step 3: RBAC Evaluation

The catalog validates the bearer token, identifies the caller as service principal `spark-etl-cluster`, determines the principal roles assigned to this service principal (e.g., `etl_writers`), evaluates the catalog roles assigned to those principal roles for the requested namespace/table, and determines whether the caller has the required privilege (`TABLE_READ` or `TABLE_WRITE`) for the requested table.

If the caller is unauthorized: return HTTP 403 Forbidden. No credentials are issued and no table metadata is returned.

### Step 4: Credential Generation

If the caller is authorized, the catalog service uses its own server-side cloud credentials (a privileged IAM role or service account that the catalog operates under) to call the cloud provider's token service:

**AWS (S3)**: The catalog calls `AWS STS AssumeRole` with a dynamically generated, in-line IAM policy that restricts access to the specific S3 paths of the table's data files:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
    "Resource": "arn:aws:s3:::data-lake-bucket/warehouse/analytics/orders/*"
  }, {
    "Effect": "Allow",
    "Action": "s3:ListBucket",
    "Resource": "arn:aws:s3:::data-lake-bucket",
    "Condition": {
      "StringLike": {"s3:prefix": "warehouse/analytics/orders/*"}
    }
  }]
}
```

STS returns a temporary credential set: `AccessKeyId`, `SecretAccessKey`, `SessionToken`, and an `Expiration` timestamp.

**Azure (ADLS Gen2)**: The catalog calls Azure's token service to generate a Shared Access Signature (SAS) token or uses Managed Identity delegation to produce a scoped bearer token valid for specific ADLS container paths.

**Google Cloud (GCS)**: The catalog uses GCP Service Account impersonation to generate a short-lived access token scoped to specific GCS bucket paths via the GCP IAM `generateAccessToken` or `signBlob` APIs.

### Step 5: Credential Return

The catalog returns the Load Table response, which includes both the Iceberg table metadata (the current `metadata.json` content) and the vended storage credentials:

```json
{
  "metadata-location": "s3://data-lake-bucket/warehouse/.../v25.metadata.json",
  "metadata": { ... },
  "config": {
    "s3.access-key-id": "ASIA...",
    "s3.secret-access-key": "...",
    "s3.session-token": "...",
    "s3.path-style-access": "false"
  }
}
```

The `config` section contains the vended credentials. The compute engine uses these credentials — not its IAM role — to access the table's S3 objects.

### Step 6: Credential Refresh

When the vended credentials approach expiration, the compute engine calls the catalog again (either re-loading the table or calling a dedicated credentials refresh endpoint) to receive a fresh credential set. The catalog re-evaluates the caller's authorization at refresh time: if the user's access has been revoked since the initial load, the refresh returns HTTP 403, and the engine can no longer access the table's storage objects.

This refresh-time re-evaluation is the mechanism for effective access revocation: once existing credentials expire (within one TTL period), the revoked user cannot get fresh ones.

## Remote Signing: The Alternative Mode

An alternative to issuing temporary credentials directly to the compute engine is **Remote Signing**, where the catalog retains the credentials server-side and signs individual storage requests on behalf of the engine.

In remote signing mode:

1. The compute engine identifies that it needs to fetch a specific S3 object.
2. Instead of using its own credentials (it has none), it sends the unsigned request to the catalog's signing endpoint.
3. The catalog signs the request using its privileged credentials and returns the signed URL or signed request headers.
4. The compute engine uses the signed URL/headers to fetch the S3 object directly.

Remote signing provides even tighter security than credential vending: the engine never possesses the credentials, even transiently. However, it requires the engine to make a round-trip to the catalog for every storage I/O operation — a significant performance overhead for data-intensive queries. Remote signing is appropriate for environments with extremely strict credential security requirements (where even transient credential possession is unacceptable) but is not the preferred mode for high-throughput analytical workloads.

## Cloud Provider Implementations

### AWS S3 + STS AssumeRole

AWS's Security Token Service (STS) is the most mature and widely used credential vending backend. The catalog service operates under an IAM role with permission to `sts:AssumeRole` into a "vending role" and attach inline session policies.

Key configuration for Polaris on AWS:
- The Polaris service's IAM role needs `sts:AssumeRole` permission for the vending role.
- The vending role needs `s3:GetObject`, `s3:PutObject`, and `s3:ListBucket` on the warehouse bucket.
- The inline session policy (generated per-request) further restricts access to the specific table prefix.

STS credentials have a minimum lifetime of 15 minutes and maximum of 12 hours (for `AssumeRole`). Typical vending configurations use 1-hour TTLs as a balance between security (short enough to limit compromise impact) and refresh frequency (low enough to not cause performance issues for normal queries).

### Azure ADLS Gen2 + SAS Tokens

Azure Shared Access Signatures (SAS) provide table-scoped access to ADLS Gen2 containers. A SAS token is a signed URL parameter that embeds the permissions, resource scope, and expiry time into a cryptographically signed token.

Service SAS tokens can be scoped to a specific container and blob prefix, matching the table's ADLS path. The catalog generates the SAS using the storage account's access key or a user delegation key (preferred, as it ties the SAS to the catalog service's Azure AD identity rather than a static storage key).

### GCP GCS + Short-Lived Tokens

Google Cloud's credential vending for GCS uses Service Account impersonation or Workload Identity Federation to generate short-lived access tokens scoped to specific GCS bucket paths.

## The Security Impact: A Quantitative Perspective

To quantify the security improvement of credential vending over bucket-level IAM permissions, consider a data lake with 10,000 tables across 5 business units. In the traditional model:

- A Spark cluster's IAM role has access to all 10,000 tables.
- If the cluster's credentials are compromised, the attacker accesses all 10,000 tables.
- Revoking access requires IAM policy changes for the cluster's role — affecting all jobs running on the cluster.

With credential vending:

- The Spark cluster's IAM role has access to zero S3 objects (no standing permissions).
- A specific ETL job receives credentials for the 3 tables it reads and the 1 table it writes.
- If the job's vended credentials are compromised, the attacker can access only those 4 tables for the duration of the credential TTL (at most 1 hour).
- Revoking access requires a RBAC policy change in the catalog — effective within 1 TTL period, with no disruption to other jobs on the cluster.

The compromise blast radius reduction is from 10,000 tables (full warehouse) to 4 tables (the specific job's access), and from unlimited duration (credential rotation required) to 1 hour (TTL-bounded automatic expiry).

## Conclusion

Credential Vending is the linchpin of the Iceberg REST Catalog's security architecture — the mechanism that transforms table-level RBAC from a logical guarantee (the catalog won't tell you where the table is) into a physical enforcement (you literally cannot read the table's storage objects without the catalog's authorization). By generating dynamic, scoped, short-lived cloud credentials as part of the table load workflow, credential vending achieves the principle of least privilege at the table level, eliminates standing over-privileged compute engine credentials, provides meaningful access revocation within bounded time windows, and delivers a centralized, engine-agnostic audit trail for all data access. It is one of the most consequential security capabilities introduced by the open lakehouse ecosystem, and its availability in Polaris, Unity Catalog, and Glue (via Lake Formation) is increasingly a baseline requirement for enterprise data lakehouse deployments.


## Visual Architecture

![Credential Vending Flow](/images/kb/credential_vending_flow.png)

