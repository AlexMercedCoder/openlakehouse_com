/**
 * Assigns every knowledge-base entry to exactly one architecture layer and
 * writes that layer into the entry's frontmatter.
 *
 * The layer taxonomy is the site's spine: it turns 200 alphabetical entries
 * into a map of how an open lakehouse is actually assembled. Running this is
 * idempotent; it rewrites the `layer` key rather than appending.
 *
 * Fails loudly if any entry is unclassified or claimed by two layers, so the
 * taxonomy can never silently drift out of sync with the content.
 *
 * Run: npm run layers
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const KB = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'kb');

/** Ordered as the stack is built, bottom to top. Order drives the UI. */
export const LAYERS = {
  foundation: [
    'open-lakehouse', 'data-lakehouse', 'data-lake', 'data-warehouse', 'data-mesh', 'data-fabric',
    'data-swamp', 'data-gravity', 'medallion-architecture', 'bronze-layer',
    'silver-layer', 'gold-layer', 'lambda-architecture', 'kappa-architecture',
    'separation-of-compute-and-storage', 'polyglot-persistence', 'zero-etl',
  ],
  storage: [
    'object-storage', 'storage-layer', 'amazon-s3', 'azure-blob-storage',
    'google-cloud-storage', 'minio', 's3-api-compatibility', 'parquet-format',
    'orc-format', 'avro-format', 'columnar-formats', 'row-oriented-formats',
    'file-format', 'data-file', 'file-block-size', 'target-file-size',
    'small-file-problem', 'gzip-compression', 'snappy-compression',
    'lz4-compression', 'zstandard', 'run-length-encoding', 'dictionary-encoding',
    'bloom-filters', 'min-max-statistics', 'column-level-statistics',
  ],
  table: [
    'open-table-formats', 'table-format', 'apache-iceberg', 'delta-lake',
    'apache-hudi', 'apache-paimon', 'apache-xtable', 'delta-uniform',
    'acid-transactions', 'snapshot', 'snapshot-isolation', 'time-travel',
    'rollback', 'schema-evolution', 'schema-spec', 'partition-evolution',
    'partition-spec', 'hidden-partitioning', 'sort-order-spec', 'manifest-file',
    'manifest-list', 'metadata-layer', 'metadata-log', 'metadata-pointer',
    'transaction-log', 'copy-on-write', 'merge-on-read', 'position-deletes',
    'equality-deletes', 'delete-files', 'sequence-number', 'table-uuid',
    'branching-wap', 'write-audit-publish', 'tagging-iceberg', 'commit-iceberg',
    'staged-commits', 'occ', 'compaction', 'expire-snapshots',
    'remove-orphan-files', 'rewrite-data-files', 'rewrite-manifests',
    'table-maintenance', 'strict-metrics', 'read-amplification',
    'write-amplification', 'format-conversion', 'format-interoperability',
    'metadata-translation',
  ],
  catalog: [
    'iceberg-catalog', 'rest-catalog', 'polaris-catalog', 'project-nessie',
    'unity-catalog', 'aws-glue-data-catalog', 'hive-metastore', 'jdbc-catalog',
    'hadoop-catalog', 'dynamic-catalogs', 'catalog-migration', 'dremio-arctic',
    'tabular', 'credential-vending', 'role-based-access-control',
    'attribute-based-access-control', 'fine-grained-access-control',
  ],
  compute: [
    'compute-engine', 'apache-spark', 'apache-flink', 'trino', 'presto',
    'duckdb', 'clickhouse', 'starrocks', 'apache-doris', 'dremio', 'databricks',
    'snowflake', 'google-bigquery', 'amazon-athena', 'mpp', 'distributed-compute',
    'query-execution', 'query-planning', 'vectorized-execution',
    'predicate-pushdown', 'projection-pushdown', 'pushdown-optimization',
    'partition-pruning', 'data-skipping', 'file-skipping', 'cost-based-optimizer',
    'rule-based-optimizer', 'join-strategies', 'hash-join', 'sort-merge-join',
    'broadcast-join', 'shuffle', 'data-skew', 'spilling-to-disk',
    'out-of-memory-errors', 'caching', 'indexing-data-lakes',
    'materialized-views', 'z-ordering', 'hilbert-curves', 'sql-dialects',
    'serialization', 'deserialization',
  ],
  interchange: ['apache-arrow', 'arrow-flight', 'arrow-flight-sql'],
  semantic: [
    'semantic-layer', 'ontology', 'knowledge-graphs', 'data-modeling',
    'dimensional-modeling', 'star-schema', 'snowflake-schema', 'fact-table',
    'dimension-table', 'slowly-changing-dimensions', 'data-lineage',
    'data-quality',
  ],
  pipeline: [
    'etl', 'elt', 'data-pipeline', 'orchestration', 'apache-airflow', 'dagster',
    'prefect', 'dbt', 'directed-acyclic-graph', 'batch-processing',
    'streaming-data', 'micro-batching', 'change-data-capture',
    'eventual-consistency', 'strong-consistency',
  ],
  ai: [
    'agentic-analytics', 'agentic-workflows', 'ai-agents', 'autonomous-analytics',
    'multi-agent-systems', 'large-language-models', 'context-window',
    'prompt-engineering', 'retrieval-augmented-generation', 'vector-databases',
    'vector-search', 'semantic-search', 'text-embeddings', 'text-to-sql',
    'model-fine-tuning', 'tool-use', 'hallucination-mitigation',
    'observability-ai-systems',
  ],
};

const layerOf = new Map();
const dupes = [];
for (const [layer, slugs] of Object.entries(LAYERS)) {
  for (const slug of slugs) {
    if (layerOf.has(slug)) dupes.push(`${slug} (${layerOf.get(slug)} and ${layer})`);
    layerOf.set(slug, layer);
  }
}

const files = readdirSync(KB).filter((f) => f.endsWith('.md'));
const slugs = files.map((f) => f.replace(/\.md$/, ''));

const unclassified = slugs.filter((s) => !layerOf.has(s));
const phantom = [...layerOf.keys()].filter((s) => !slugs.includes(s));

const problems = [];
if (dupes.length) problems.push(`Claimed by two layers: ${dupes.join(', ')}`);
if (unclassified.length) problems.push(`Unclassified entries: ${unclassified.join(', ')}`);
if (phantom.length) problems.push(`Taxonomy names entries that do not exist: ${phantom.join(', ')}`);

if (problems.length) {
  console.error('\nLayer taxonomy is out of sync with the knowledge base:\n');
  for (const p of problems) console.error('  - ' + p);
  console.error('');
  process.exit(1);
}

let changed = 0;
for (const file of files) {
  const slug = file.replace(/\.md$/, '');
  const path = join(KB, file);
  const text = readFileSync(path, 'utf-8');
  const layer = layerOf.get(slug);

  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) {
    console.error(`No frontmatter: ${file}`);
    process.exit(1);
  }

  let fm = m[1];
  const next = /^layer:.*$/m.test(fm)
    ? fm.replace(/^layer:.*$/m, `layer: "${layer}"`)
    : `${fm}\nlayer: "${layer}"`;

  if (next === fm) continue;
  writeFileSync(path, text.replace(m[0], `---\n${next}\n---`), 'utf-8');
  changed++;
}

const counts = Object.entries(LAYERS).map(([k, v]) => `${k} ${v.length}`);
console.log(`layers assigned: ${changed} file(s) updated`);
console.log(`  ${counts.join(', ')}`);
console.log(`  total ${slugs.length} entries across ${Object.keys(LAYERS).length} layers`);
