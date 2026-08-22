---
title: "Serialization"
description: "Serialization is the process of translating data structures or object state into a format that can be stored (for example, in a file or memory buffer) or."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 2
tags: ["infrastructure", "serialization", "data engineering", "lakehouse"]
layer: "compute"
---

# Serialization

## Core Definition

Serialization is the process of translating data structures or object state into a format that can be stored (for example, in a file or memory buffer) or transmitted (for example, across a network connection link) and reconstructed later (possibly in a different computer environment). In the context of big data and the open data lakehouse, serialization is a fundamental concept because data must constantly move between different systems, programming languages, and storage mediums.

When an application written in Java (like Apache Spark) needs to write a complex object (like a User record containing a string name, an integer ID, and an array of past purchases) to a hard drive or send it over the network to another node, the physical hardware cannot simply accept the "Java Object." The object must be serialized into a flat stream of bytes. 

The reverse process, extracting a data structure from a series of bytes, is called deserialization.

## Diagram 1: Conceptual Architecture

![Serialization Concept](/images/kb/serialization_concept.png)

## Implementation and Operations

In traditional web development, JSON (JavaScript Object Notation) is the most common serialization format. It is human-readable, widely supported, and easy to debug. However, for big data workloads processing petabytes of information, JSON is disastrously inefficient. It is slow to parse, lacks a strict schema, and consumes massive amounts of storage space because it stores the key names repetitively for every single record.

Data engineering relies on highly optimized, binary serialization formats.
Apache Avro, for example, is a row-oriented binary serialization framework heavily used in the Hadoop ecosystem and streaming applications like Apache Kafka. Avro serializes data compactly because it relies on an independent schema (defined in JSON) to dictate the structure of the binary data. When the data is written, the schema is written alongside it. When the data is read, the system uses the schema to interpret the raw bytes.

Columnar formats like Apache Parquet and ORC also employ complex serialization techniques, organizing the bytes by column rather than by row to enable massive compression and vectorization.

## Diagram 2: Operational Flow

![Serialization Flow](/images/kb/serialization_flow.png)

## Summary and Tradeoffs

Choosing the right serialization format is critical. The tradeoff is always between human-readability/flexibility (JSON, CSV) and machine-efficiency/performance (Avro, Parquet, Protobuf). For modern analytical lakehouses, binary formats are strictly required to minimize storage costs and maximize query performance.

## The Cost Nobody Measures Directly

Serialization rarely appears as a line item in a query profile, which is why it is frequently the largest cost in a distributed job without anyone noticing. It shows up as time attributed to shuffle, to network, or simply to a stage taking longer than its input size suggests.

The reason it is expensive is that it is not a copy. Converting an in-memory object graph into a byte sequence means walking references, encoding types, and writing fields one at a time, with a corresponding walk to rebuild on the other side. For a shuffle moving a few hundred gigabytes between executors, that walk happens for every row twice.

### Where It Happens in a Lakehouse Job

Four points in a typical pipeline, in rough order of cost:

1. **Shuffle boundaries.** Data leaving one executor for another is serialized, transmitted, and deserialized. This is usually the dominant cost.
2. **Spill to disk.** When a stage exceeds available memory, the same encoding happens on the way out and back.
3. **Reading Parquet.** Decoding pages into the engine's in-memory representation.
4. **Returning results to a client.** Frequently overlooked, and significant when a query returns many rows to a BI tool over a row-oriented protocol.

### Why Arrow Changes the Calculation

Apache Arrow's contribution is a memory layout that is also a wire format. Because the in-memory representation is already a defined byte layout, moving data between processes becomes a transfer of bytes rather than an encode and decode cycle.

The practical effect appears most sharply at system boundaries. Reading query results into a Python dataframe traditionally meant the engine serializing rows, the client deserializing them, and constructing objects. With Arrow on both sides, the buffer received is the buffer used.

This is the substance behind the claim that Arrow eliminates a serialization tax. It does not make serialization free everywhere. It removes it specifically where two systems that both speak Arrow exchange data.

### A Practical Signal

When a job's runtime is dominated by a stage whose input and output sizes are similar and whose logic is simple, serialization across a shuffle boundary is the first thing to examine. Reducing the number of shuffle boundaries usually helps more than tuning the codec.

## Visual Architecture

![Serialization Concept](/images/kb/serialization_concept.png)

![Serialization Flow](/images/kb/serialization_flow.png)
