import os

mapping = {
    "apache-spark.md": ["apache_spark_architecture.png"],
    "apache-flink.md": ["apache_flink_streaming.png"],
    "trino.md": ["trino_federation.png"],
    "presto.md": ["presto_architecture.png"],
    "starrocks.md": ["starrocks_caching.png"],
    "clickhouse.md": ["clickhouse_mergetree.png"],
    "duckdb.md": ["duckdb_in_process.png"],
    "apache-doris.md": ["apache_doris_federation.png"],
    "snowflake.md": ["snowflake_architecture.png"],
    "databricks.md": ["databricks_lakehouse.png"]
}

articles_dir = "src/content/kb"

for art, matched_images in mapping.items():
    file_path = os.path.join(articles_dir, art)
    with open(file_path, 'r') as f:
        content = f.read()
    
    if "diagrams_included: 0" in content:
        content = content.replace("diagrams_included: 0", f"diagrams_included: {len(matched_images)}")
        
        diagram_section = "\n\n## Visual Architecture\n\n"
        for img in matched_images:
            title = img.replace('.png', '').replace('_', ' ').title()
            diagram_section += f"![{title}](/images/kb/{img})\n\n"
        
        content += diagram_section
        
        with open(file_path, 'w') as f:
            f.write(content)
        
        print(f"Updated {art}")

