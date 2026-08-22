/**
 * The architecture layers of an open lakehouse.
 *
 * This is the site's organising idea, so it lives in one place: the knowledge
 * base groups by it, the reference architecture draws it, and each entry
 * declares which layer it belongs to.
 *
 * `order` runs bottom to top, the way the stack is assembled. Each layer owns a
 * hue used as a small identifying mark, never as a background wash, and every
 * hue has a value tuned for each theme so it stays legible on both grounds.
 */

export interface Layer {
  id: string;
  label: string;
  order: number;
  /** One sentence: what this layer is responsible for. */
  role: string;
  /** The question this layer answers in the architecture. */
  question: string;
  /** Representative technologies, for the architecture diagram. */
  exemplars: string[];
  hue: { light: string; dark: string };
}

export const LAYERS: Layer[] = [
  {
    id: 'foundation',
    label: 'Foundations',
    order: 0,
    role: 'The architectural ideas the rest of the stack assumes: what a lakehouse is, and how it differs from a lake or a warehouse.',
    question: 'What kind of system are we building?',
    exemplars: ['Lakehouse', 'Data lake', 'Data warehouse', 'Medallion'],
    hue: { light: '#5A6472', dark: '#9AA6B6' },
  },
  {
    id: 'storage',
    label: 'Storage format',
    order: 1,
    role: 'How bytes are laid out on object storage, and how they are encoded and compressed for analytical reads.',
    question: 'How is the data physically written down?',
    exemplars: ['Apache Parquet', 'ORC', 'Avro', 'Object storage'],
    hue: { light: '#1F6E7B', dark: '#63BECC' },
  },
  {
    id: 'table',
    label: 'Table format',
    order: 2,
    role: 'The metadata that turns a directory of files into a table with transactions, schema evolution, and time travel.',
    question: 'What makes those files behave like a table?',
    exemplars: ['Apache Iceberg', 'Delta Lake', 'Apache Hudi', 'Apache Paimon'],
    hue: { light: '#2A5FA5', dark: '#7FAEE8' },
  },
  {
    id: 'catalog',
    label: 'Catalog',
    order: 3,
    role: 'The service that tracks which tables exist, where their metadata lives, and who is allowed to touch them.',
    question: 'How do engines find and govern those tables?',
    exemplars: ['Apache Polaris', 'Iceberg REST', 'Nessie', 'Glue', 'Unity'],
    hue: { light: '#6D4A9C', dark: '#B79BE4' },
  },
  {
    id: 'compute',
    label: 'Compute',
    order: 4,
    role: 'The engines that plan and execute queries, and the optimisations that make them fast over object storage.',
    question: 'What actually runs the query?',
    exemplars: ['Spark', 'Trino', 'Flink', 'DuckDB', 'Dremio'],
    hue: { light: '#A8433A', dark: '#EC8F84' },
  },
  {
    id: 'interchange',
    label: 'Interchange',
    order: 5,
    role: 'The in-memory format and wire protocols that move results between systems without paying serialisation costs.',
    question: 'How does data move between systems?',
    exemplars: ['Apache Arrow', 'Arrow Flight', 'Flight SQL'],
    hue: { light: '#8F5410', dark: '#E0A452' },
  },
  {
    id: 'pipeline',
    label: 'Movement',
    order: 6,
    role: 'How data arrives and keeps arriving: ingestion, transformation, orchestration, and streaming.',
    question: 'How does data get in, and stay current?',
    exemplars: ['Airflow', 'dbt', 'Dagster', 'CDC', 'Streaming'],
    hue: { light: '#7A6420', dark: '#CFB35C' },
  },
  {
    id: 'semantic',
    label: 'Semantics',
    order: 7,
    role: 'The layer that maps physical tables to business meaning, so queries are written against concepts rather than schemas.',
    question: 'What does this data mean?',
    exemplars: ['Semantic layer', 'Metrics', 'Ontology', 'Modeling'],
    hue: { light: '#3E6B2B', dark: '#8CC46F' },
  },
  {
    id: 'ai',
    label: 'Agents & AI',
    order: 8,
    role: 'How language models and agents consume governed lakehouse data, and what they need from the layers beneath.',
    question: 'How do agents use any of this safely?',
    exemplars: ['Agentic analytics', 'RAG', 'Text-to-SQL', 'Vector search'],
    hue: { light: '#96376C', dark: '#E28BBB' },
  },
];

export const LAYER_BY_ID: Record<string, Layer> = Object.fromEntries(
  LAYERS.map((l) => [l.id, l])
);

/** Layers that form the canonical stack, excluding surrounding concerns. */
export const STACK_LAYER_IDS = ['storage', 'table', 'catalog', 'compute', 'interchange', 'semantic'];
