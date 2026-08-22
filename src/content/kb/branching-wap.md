---
title: "Branching (WAP)"
description: "A comprehensive guide to Branching in Apache Iceberg and how it enables the Write-Audit-Publish (WAP) pattern to guarantee data quality before user exposure."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 2
tags: ["branching", "wap", "apache iceberg", "data quality", "git-for-data"]
layer: "table"
---

# Branching (WAP)

Software engineering relies heavily on version control systems like Git. Developers create branches, write code, test it in isolation, and only merge it into the `main` production branch when it passes all quality checks. 

Historically, data engineering did not have this luxury. When an ETL job wrote data to a Hive table, the data was immediately live. If the ETL job wrote corrupt data or dropped millions of rows by accident, downstream reports and dashboards were instantly broken.

Apache Iceberg introduces Git-like semantics directly into the data lakehouse through **Branching**. 

## The Concept of Branching

Because Iceberg tables are defined by a linear chain of Snapshots, it is trivial to "fork" that chain.

You can create an `audit-branch` that diverges from the `main` branch. When your ETL pipelines write new data, they write exclusively to the `audit-branch`. They create new Snapshots that are completely isolated. 

During this time, if an end-user runs a `SELECT *` query against the table, the catalog directs them to the `main` branch. They see exactly what the table looked like before the ETL job started. They are completely shielded from the incomplete or potentially corrupted data being written in the background.

## Diagram 1: Branching in Apache Iceberg

![Iceberg branching isolating ETL writes from main production queries](/images/kb/branching_concept.png)

## The Write-Audit-Publish (WAP) Workflow

Branching is the foundational technology that enables the **Write-Audit-Publish (WAP)** pattern, a gold standard for data quality engineering.

1. **Write:** The ETL pipeline executes, transforming data and writing it to the isolated `audit-branch`.
2. **Audit:** A Data Quality engine (like Great Expectations or dbt tests) runs a suite of tests against the `audit-branch`. It checks for null values, schema violations, row counts, and anomaly detection. 
3. **Publish:** If the tests fail, the pipeline alerts the engineering team, and the `audit-branch` can simply be discarded or investigated. If the tests pass, a simple `fast-forward` operation merges the `audit-branch` pointer into the `main` branch.

At the exact moment of the fast-forward publish, the new, fully-audited data becomes instantaneously visible to all downstream consumers. The WAP pattern guarantees that no user will ever query corrupted or incomplete data.

## Diagram 2: The WAP Workflow

![The Write-Audit-Publish workflow utilizing Iceberg branching](/images/kb/wap_workflow.png)
