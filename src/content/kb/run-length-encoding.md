---
title: "Run-Length Encoding (RLE)"
description: "Understanding Run-Length Encoding (RLE), a foundational compression algorithm for sorted columnar data."
author: "Alex Merced"
date: 2026-05-18
diagrams_included: 2
tags: ["infrastructure", "compression", "rle", "lakehouse"]
layer: "storage"
---

# Run-Length Encoding (RLE)

## Core Definition

Run-Length Encoding (RLE) is a simple, lossless data compression algorithm that excels at shrinking repetitive sequences of identical values. In the context of the open data lakehouse and columnar file formats (like Apache Parquet and ORC), RLE is frequently combined with Dictionary Encoding to achieve astronomical compression ratios, particularly on data that has been intentionally sorted.

The fundamental concept of RLE is to replace a "run" (a sequence of consecutive identical data points) with a single instance of the data value and a count of how many times it repeats.

## Diagram 1: Conceptual Architecture

![RLE Concept](/images/kb/rle_concept.png)

## Implementation and Operations

Imagine a columnar dataset representing the hourly status of an IoT sensor over a week. The status might be the string "ACTIVE" repeated 5,000 times sequentially, followed by "INACTIVE" 10 times, followed by "ACTIVE" another 5,000 times.

Instead of storing 10,010 individual strings, RLE compresses this into three simple pairs:
1. ("ACTIVE", 5000)
2. ("INACTIVE", 10)
3. ("ACTIVE", 5000)

This takes a massive block of data and reduces it to a few bytes. 

In modern big data formats, RLE is almost never used on raw strings. Instead, it is used on the integer streams produced by Dictionary Encoding. If a column is dictionary encoded, and the data is sorted by that column, the resulting integer stream will look like `0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 2`. 

Applying RLE to this integer stream results in `(0, 5), (1, 3), (2, 4)`. This combination of Dictionary Encoding followed by RLE is why sorting your data before writing it to a data lake (using techniques like Z-Ordering or simple `ORDER BY` clauses during ETL) is one of the most critical performance tuning steps a data engineer can take.

## Diagram 2: Operational Flow

![RLE Flow](/images/kb/rle_flow.png)

## Summary and Tradeoffs

RLE is incredibly powerful but highly situational. The primary tradeoff is that RLE is completely useless, and can actually increase file sizes, if the data is highly varied and not sorted. If a column alternates values rapidly (e.g., `0, 1, 0, 1, 0, 1`), RLE will attempt to store it as `(0,1), (1,1), (0,1)`, effectively doubling the required storage. Therefore, Parquet and ORC writers use sophisticated heuristics to determine on the fly whether RLE will be beneficial for a specific data page, applying it only when profitable.

## Why Sorting Multiplies the Benefit

Run-length encoding replaces consecutive repeated values with the value and a count. Its effectiveness is therefore entirely determined by how the data is ordered, which makes it the encoding most directly under an engineer's control.

Consider a `status` column with three distinct values across ten million rows. Unsorted, the values interleave and runs average perhaps two or three rows, so RLE saves little. Sorted by `status`, the column becomes three runs, and ten million values collapse to three pairs of value and count.

This is the concrete mechanism behind the advice to sort tables on low-cardinality columns. The gain is not only in min/max statistics enabling file skipping; it is also that RLE compresses the sorted column by orders of magnitude. A table sorted on the right column can shrink dramatically without changing a single value.

### How Parquet Actually Uses It

Parquet applies RLE in a hybrid scheme combined with bit-packing, and it appears in three places that are easy to conflate:

1. **Definition and repetition levels.** These track nulls and nesting structure. They are drawn from a very small range and are highly repetitive, so RLE handles them almost perfectly. This is why nullable columns cost far less than an extra byte per row would suggest.
2. **Dictionary indices.** When a column is dictionary encoded, the stored values are small integers pointing into the dictionary. Those indices are then RLE and bit-packed, which is where much of Parquet's compression on categorical columns comes from.
3. **Boolean columns.** Stored as bit-packed runs.

The practical consequence is that RLE is rarely something you select directly. You influence it by choosing a sort order and by keeping cardinality low enough for dictionary encoding to stay active.

### Interaction With Compression Codecs

RLE runs before the block compression codec. A column already collapsed by RLE presents little redundancy for Zstandard to find, so the codec's contribution on that column is small. This is expected and not a sign of misconfiguration. Encoding and compression address different kinds of redundancy, and the encoding layer is where the large structural wins occur.

## Visual Architecture

![Run-Length Encoding (RLE) Concept](/images/kb/rle_concept.png)

![Run-Length Encoding (RLE) Flow](/images/kb/rle_flow.png)
