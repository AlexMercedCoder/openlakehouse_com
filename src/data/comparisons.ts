/**
 * Comparison data.
 *
 * Kept as data rather than markup so every comparison renders with the same
 * table-first shape: a lead table that answers the question, then the nuance.
 * Tables are disproportionately quoted by answer engines, so the table carries
 * the actual answer rather than a teaser.
 */

export interface Comparison {
  slug: string;
  title: string;
  question: string;
  description: string;
  layer: string;
  /** The one-sentence answer, stated before any table. */
  answer: string;
  columns: string[];
  rows: { label: string; cells: string[] }[];
  /** Short guidance keyed to a reader's situation. */
  choose: { when: string; pick: string }[];
  caveats: string[];
  related: { label: string; href: string }[];
}

export const COMPARISONS: Comparison[] = [
  {
    slug: 'lakehouse-vs-warehouse-vs-lake',
    title: 'Lakehouse vs warehouse vs data lake',
    question: 'What is the actual difference between a data lake, a data warehouse, and a lakehouse?',
    description:
      'A side-by-side comparison of data lakes, data warehouses, and open lakehouses across storage, transactions, schema, engine choice, and cost.',
    layer: 'foundation',
    answer:
      'A data lake gives you cheap storage without guarantees, a warehouse gives you guarantees without engine choice, and a lakehouse adds the guarantees to the lake so you keep both.',
    columns: ['Data lake', 'Data warehouse', 'Open lakehouse'],
    rows: [
      {
        label: 'Where data lives',
        cells: [
          'Files in your object storage',
          'Inside the warehouse, proprietary internal format',
          'Files in your object storage',
        ],
      },
      {
        label: 'ACID transactions',
        cells: ['No', 'Yes', 'Yes, via the table format'],
      },
      {
        label: 'Schema enforcement',
        cells: ['On read, if at all', 'On write, strict', 'On write, via the table format'],
      },
      {
        label: 'Engine choice',
        cells: ['Any engine that reads files', 'The warehouse engine', 'Any engine implementing the format'],
      },
      {
        label: 'Concurrent writers',
        cells: ['Unsafe, silent corruption', 'Safe', 'Safe, snapshot isolation'],
      },
      {
        label: 'Time travel and rollback',
        cells: ['No', 'Varies, often limited retention', 'Yes, snapshot based'],
      },
      {
        label: 'Storage cost',
        cells: ['Lowest', 'Highest', 'Lowest, same as a lake'],
      },
      {
        label: 'Cost of leaving',
        cells: ['Near zero', 'High, requires export and conversion', 'Near zero'],
      },
      {
        label: 'Typical failure mode',
        cells: ['Becomes a data swamp', 'Becomes a bottleneck and a bill', 'Under-maintained tables and small files'],
      },
    ],
    choose: [
      { when: 'You need cheap retention and will process with your own code', pick: 'A lake is sufficient, and you accept no guarantees' },
      { when: 'You have one team, one engine, and value operational simplicity above all', pick: 'A warehouse is the least work, and you accept the lock-in' },
      { when: 'Several engines or teams need the same governed data', pick: 'A lakehouse, because engine choice is the whole point' },
      { when: 'You already have a lake with correctness problems', pick: 'A lakehouse, since a table format retrofits over data you already have' },
    ],
    caveats: [
      'Warehouses increasingly read and write open table formats, which narrows this gap considerably. The distinction is becoming about where the data lives by default rather than what the system can technically read.',
      'A lakehouse moves work rather than removing it. Compaction, snapshot expiry, and file sizing are your responsibility in a way they are not in a managed warehouse.',
    ],
    related: [
      { label: 'What is an open lakehouse?', href: '/what-is-an-open-lakehouse' },
      { label: 'Data lakehouse', href: '/kb/data-lakehouse' },
      { label: 'Data warehouse', href: '/kb/data-warehouse' },
      { label: 'Data lake', href: '/kb/data-lake' },
    ],
  },

  {
    slug: 'table-formats',
    title: 'Iceberg vs Delta Lake vs Hudi vs Paimon',
    question: 'Which open table format should sit at the table layer?',
    description:
      'A comparison of Apache Iceberg, Delta Lake, Apache Hudi, and Apache Paimon across engine support, update strategy, partitioning, and catalog requirements.',
    layer: 'table',
    answer:
      'Iceberg has the widest multi-engine support, Delta is strongest inside the Databricks ecosystem, Hudi is built around upserts and incremental reads, and Paimon targets streaming-first workloads.',
    columns: ['Apache Iceberg', 'Delta Lake', 'Apache Hudi', 'Apache Paimon'],
    rows: [
      {
        label: 'Primary strength',
        cells: ['Multi-engine neutrality', 'Databricks integration', 'Upserts and incremental pulls', 'Streaming ingestion'],
      },
      {
        label: 'Engine breadth',
        cells: ['Widest', 'Broad and growing', 'Moderate', 'Narrower, Flink-centric'],
      },
      {
        label: 'Update strategy',
        cells: ['Copy-on-write and merge-on-read', 'Copy-on-write and deletion vectors', 'Copy-on-write and merge-on-read', 'Merge-on-read, LSM structured'],
      },
      {
        label: 'Partitioning',
        cells: ['Hidden partitioning, evolvable', 'Directory based', 'Directory based', 'Directory based'],
      },
      {
        label: 'Schema evolution',
        cells: ['Full, by field ID', 'Full', 'Full', 'Full'],
      },
      {
        label: 'Catalog requirement',
        cells: ['Required, several options', 'Optional, path based works', 'Optional', 'Required in practice'],
      },
      {
        label: 'Governance model',
        cells: ['Delegated to the catalog', 'Unity Catalog when managed', 'Delegated', 'Delegated'],
      },
    ],
    choose: [
      { when: 'You expect several engines to read and write the same tables', pick: 'Iceberg, for the breadth of independent implementations' },
      { when: 'Your platform is centred on Databricks', pick: 'Delta, since the integration advantages are real' },
      { when: 'Your workload is dominated by upserts and incremental consumption', pick: 'Hudi, which was designed around exactly that' },
      { when: 'You are building streaming-first pipelines on Flink', pick: 'Paimon, for its LSM-oriented design' },
    ],
    caveats: [
      'Apache XTable and Delta UniForm both let one physical dataset present as more than one format, which makes this choice less permanent than it once was.',
      'Engine support changes quickly. Verify the specific combination you plan to run, especially for concurrent writes, rather than trusting a general compatibility claim.',
    ],
    related: [
      { label: 'Open table formats', href: '/kb/open-table-formats' },
      { label: 'Apache Iceberg', href: '/kb/apache-iceberg' },
      { label: 'Copy-on-write', href: '/kb/copy-on-write' },
      { label: 'Merge-on-read', href: '/kb/merge-on-read' },
    ],
  },

  {
    slug: 'catalogs',
    title: 'Comparing lakehouse catalogs',
    question: 'Which catalog should govern the tables?',
    description:
      'A comparison of Apache Polaris, Project Nessie, AWS Glue, Unity Catalog, Hive Metastore, and Lakekeeper across API openness, access control, credential vending, and multi-engine support.',
    layer: 'catalog',
    answer:
      'The catalog choice is mostly a governance decision: all of them can point engines at tables, but they differ sharply in how they handle permissions, credential vending, and whether their API is open enough to swap later.',
    columns: ['Open API', 'Access control', 'Credential vending', 'Best suited to'],
    rows: [
      {
        label: 'Apache Polaris',
        cells: ['Iceberg REST, open source', 'Role based, fine grained', 'Yes', 'Multi-engine estates wanting an open governed catalog'],
      },
      {
        label: 'Project Nessie',
        cells: ['Iceberg REST plus its own API', 'Basic', 'Limited', 'Teams that want Git-style branching over data'],
      },
      {
        label: 'AWS Glue Data Catalog',
        cells: ['Proprietary, with an Iceberg REST endpoint', 'IAM and Lake Formation', 'Via Lake Formation', 'Estates already committed to AWS'],
      },
      {
        label: 'Unity Catalog',
        cells: ['Open sourced, Databricks led', 'Rich, unified across assets', 'Yes', 'Databricks-centred platforms'],
      },
      {
        label: 'Hive Metastore',
        cells: ['Thrift, ubiquitous but dated', 'Minimal', 'No', 'Legacy compatibility rather than new builds'],
      },
      {
        label: 'Lakekeeper',
        cells: ['Iceberg REST, open source', 'Role based', 'Yes', 'Lightweight self-hosted deployments'],
      },
    ],
    choose: [
      { when: 'Several engines from different vendors need the same tables', pick: 'An Iceberg REST catalog such as Polaris or Lakekeeper' },
      { when: 'Everything runs inside one cloud provider', pick: 'That provider\'s managed catalog, accepting the coupling' },
      { when: 'You need experimentation branches over production data', pick: 'Nessie, for its branching model' },
      { when: 'You are migrating off Hive', pick: 'An Iceberg REST catalog, and plan the migration as its own project' },
    ],
    caveats: [
      'Credential vending is the feature that most often decides this in practice. Without it, every engine needs its own long-lived storage credentials, which undoes much of the governance benefit.',
      'The Iceberg REST specification is what makes catalogs swappable. A catalog that implements it can usually be replaced; one that does not, cannot.',
    ],
    related: [
      { label: 'Iceberg catalog', href: '/kb/iceberg-catalog' },
      { label: 'REST catalog', href: '/kb/rest-catalog' },
      { label: 'Apache Polaris', href: '/kb/polaris-catalog' },
      { label: 'Credential vending', href: '/kb/credential-vending' },
    ],
  },
];

export const COMPARISON_BY_SLUG: Record<string, Comparison> = Object.fromEntries(
  COMPARISONS.map((c) => [c.slug, c])
);
