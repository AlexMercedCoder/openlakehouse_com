---
title: "Arrow Flight"
description: "Arrow Flight is an open-source, high-performance Remote Procedure Call (RPC) framework developed as part of the Apache Arrow project."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 1
tags: ["infrastructure", "network", "apache arrow", "flight", "lakehouse"]
layer: "interchange"
---

# Arrow Flight

Arrow Flight is an open-source, high-performance Remote Procedure Call (RPC) framework developed as part of the Apache Arrow project. It is specifically designed to transfer massive analytical datasets over a network at maximum speed. By combining the highly optimized, columnar memory layout of Apache Arrow with the efficient transport layer of gRPC, Arrow Flight eliminates the massive serialization bottlenecks that plague legacy data transfer protocols like ODBC, JDBC, and standard REST APIs.

## The Problem with Legacy Protocols

Historically, when a client application (like a Python data science notebook or a BI tool) needed to retrieve millions of rows from a remote database, it relied on protocols like ODBC (Open Database Connectivity) or JDBC (Java Database Connectivity).

These protocols were designed decades ago for row-oriented transactional data, and they suffer from severe structural inefficiencies when applied to modern big data:
1. **Serialization Overhead:** The database engine executes the query and generates the results in its internal format. It then must serialize this data: converting it cell-by-cell into the row-based format required by ODBC/JDBC.
2. **Deserialization Overhead:** The data is sent over the network. The receiving client must then deserialize the row-based byte stream back into its own internal format (e.g., a Pandas DataFrame).

This constant converting, encoding, and decoding often means that the network transfer takes significantly longer than actually executing the query itself. For analytical workloads transferring gigabytes of data, these protocols choke the pipeline.

## The Arrow Flight Solution

Arrow Flight bypasses this entire process by establishing a contract between the client and the server: both sides agree to speak Apache Arrow natively.

When a client makes a request via Arrow Flight, the server executes the query and materializes the results in its RAM as Apache Arrow RecordBatches. Because the Arrow format is exactly the same in memory as it is on the wire, **no serialization or deserialization is required.** 

The server simply takes the raw block of memory containing the Arrow data and pushes it directly into the network socket using gRPC (Google's high-performance HTTP/2 RPC framework). When the data arrives at the client, the client reads the raw bytes directly into memory. It is instantly ready for mathematical processing or analysis. 

This "Zero-Copy" network transfer allows Arrow Flight to achieve throughput speeds that easily saturate high-end 10Gbps or 100Gbps network interfaces, making it orders of magnitude faster than ODBC/JDBC.

## Arrow Flight Architecture

An Arrow Flight deployment consists of three main components:
1. **Flight Client:** The application requesting the data (e.g., a Python script using the `pyarrow.flight` library).
2. **Flight Server:** The database or service providing the data (e.g., Dremio or InfluxDB).
3. **Flight Endpoints:** A single query might return a massive dataset that is distributed across multiple worker nodes in a cluster. Arrow Flight supports parallel data transfers. The server can return a list of "Endpoints," telling the client to connect directly to the various worker nodes to stream the data in parallel, drastically reducing bottlenecks on the coordinator node.

## Arrow Flight in the Lakehouse

In the open data lakehouse architecture, data is increasingly decentralized. A data scientist might need to pull massive datasets from a central query engine (like Trino) down to their local laptop for model training. 

Arrow Flight is becoming the standard mechanism for this data movement. Instead of relying on slow JDBC connections, data science tools can use Flight to stream massive datasets directly from the lakehouse into local memory in seconds, maintaining the high-performance columnar format every step of the way.

## Summary and Tradeoffs

Arrow Flight represents a shift in approach in data transfer. By eliminating the serialization tax of legacy protocols, it makes possible the true speed of modern networks and CPUs for distributed data processing. 

The primary tradeoff with Arrow Flight is maturity and adoption. While it is incredibly fast, it does not natively provide the standardized SQL semantics of ODBC/JDBC (a client just requests "a dataset," not necessarily sending a SQL string, though this is solved by the Arrow Flight SQL extension). Furthermore, many legacy BI tools and applications are hardcoded to use ODBC/JDBC and will require driver updates or middleware to take advantage of Arrow Flight's speed. However, for modern data engineering and machine learning pipelines, it is rapidly becoming the gold standard.

## Visual Architecture

![Arrow Flight Rpc](/images/kb/arrow_flight_rpc.png)

