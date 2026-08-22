---
title: "Dictionary Encoding"
description: "Dictionary Encoding is a highly effective data compression technique predominantly used in columnar storage formats like Apache Parquet and Apache ORC."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 2
tags: ["infrastructure", "compression", "dictionary encoding", "lakehouse"]
layer: "storage"
---

# Dictionary Encoding

## Core Definition

Dictionary Encoding is a highly effective data compression technique predominantly used in columnar storage formats like Apache Parquet and Apache ORC. It is designed to significantly reduce the storage footprint of columns that contain a limited number of unique values (low cardinality data) by replacing long, repetitive data strings with small, compact integer references.

Consider a database table containing a hundred million rows of customer data, including a column for "State". The words "California", "New York", and "Texas" might appear millions of times each. Storing the literal string "California" (which consumes 10 bytes) ten million times requires 100 megabytes of storage just for that single word.

## Diagram 1: Conceptual Architecture

![Dictionary Encoding Concept](/images/kb/dictionary_encoding_concept.png)

## Implementation and Operations

Dictionary encoding solves this inefficiency by creating a lookup table (the "dictionary") for the column block. The dictionary assigns a unique, small integer to each distinct value. 
For example:
- 0 = "California"
- 1 = "New York"
- 2 = "Texas"

Instead of writing the full string to the main data stream, the storage engine simply writes the corresponding integer (0, 1, or 2). Because these integers can be stored using just a few bits (e.g., a 2-bit integer can represent 4 unique states), the storage requirement drops astronomically. 

The physical block of data now consists of two parts: the small Dictionary Page (containing the mapping) and the Data Page (containing millions of highly compressed integers).

This encoding not only saves massive amounts of disk space and network bandwidth, but it also accelerates query processing. Query engines like Trino can evaluate predicates directly on the dictionary. If the query is `WHERE State = 'California'`, the engine checks the dictionary, finds that 'California' is `0`, and then simply scans the highly compressed integer stream for `0` using rapid vectorized CPU instructions, rather than performing millions of slow string comparisons.

## Diagram 2: Operational Flow

![Dictionary Encoding Flow](/images/kb/dictionary_encoding_flow.png)

## Summary and Tradeoffs

Dictionary encoding is the secret weapon of columnar formats, turning massive, repetitive datasets into tiny, fast-to-scan byte arrays. The primary tradeoff occurs when the cardinality (the number of unique values) of a column is very high (e.g., a column of unique User IDs). In such cases, the dictionary becomes so massive that it consumes more memory than it saves, and the encoding process slows down write performance. Modern formats like Parquet handle this by dynamically monitoring the dictionary size during ingestion and automatically falling back to plain encoding if the cardinality threshold is exceeded.

## The Cardinality Threshold

Dictionary encoding replaces each value with an integer index into a dictionary of distinct values. On a column of country codes or status strings, this converts variable-length text into small integers that then compress extremely well under run-length and bit-packing.

The mechanism has a hard limit that determines whether it applies at all. Parquet builds the dictionary per column chunk while writing, and if the dictionary exceeds a size threshold, commonly 1 MB by default, the writer abandons dictionary encoding for that chunk and falls back to plain encoding. This fallback is silent.

The practical consequence is a cliff rather than a slope. A column with a few thousand distinct values encodes beautifully. A column with several million distinct values, such as a UUID or a free-text field, exceeds the threshold, falls back to plain encoding, and produces files several times larger than an engineer expecting dictionary encoding would predict.

### Diagnosing the Fallback

When a table is unexpectedly large, inspecting whether high-cardinality columns are dictionary encoded is one of the higher-yield checks available. Most Parquet tooling exposes the encodings used per column chunk. A column showing `PLAIN` where `RLE_DICTIONARY` was expected explains a great deal of unexplained storage.

The remedies are the usual ones: drop the column if nothing queries it, move it to a separate table joined on demand, or reduce cardinality by splitting a compound value into components that each repeat.

### Why It Helps Query Performance, Not Only Size

Dictionary encoding also enables an optimization at read time. Because the dictionary page is stored ahead of the data pages, an engine evaluating `WHERE country = 'PT'` can read the dictionary, discover that `'PT'` does not appear in it, and skip the entire column chunk without decoding a single value.

This makes dictionary encoding a data-skipping mechanism as well as a compression one, operating at a finer grain than partition pruning and on columns that are not partition keys.

## Visual Architecture

![Dictionary Encoding Concept](/images/kb/dictionary_encoding_concept.png)

![Dictionary Encoding Flow](/images/kb/dictionary_encoding_flow.png)
