import os

articles_dir = "src/content/kb"

mapping = {
    "project-nessie.md": ["nessie_branching.png"],
    "column-level-statistics.md": ["column_stats_puffin.png"],
    "remove-orphan-files.md": ["orphan_files_cleanup.png"],
    "open-table-formats.md": ["open_table_format_comparison.png"],
    "min-max-statistics.md": ["min_max_stats_pruning.png"],
    "role-based-access-control.md": ["rbac_hierarchy.png"],
    "dynamic-catalogs.md": ["dynamic_catalog_topology.png"],
    "bloom-filters.md": ["bloom_filter_mechanism.png"],
    "fine-grained-access-control.md": ["fgac_row_column_mask.png"],
    "format-interoperability.md": ["format_interop_rest_catalog.png"]
}

for art, matched_images in mapping.items():
    file_path = os.path.join(articles_dir, art)
    with open(file_path, 'r') as f:
        content = f.read()
    
    if "diagrams_included: 0" in content:
        # Update frontmatter
        content = content.replace("diagrams_included: 0", f"diagrams_included: {len(matched_images)}")
        
        # Append images at the end
        diagram_section = "\n\n## Visual Architecture\n\n"
        for i, img in enumerate(matched_images):
            title = img.replace('.png', '').replace('_', ' ').title()
            diagram_section += f"![{title}](/images/kb/{img})\n\n"
        
        content += diagram_section
        
        with open(file_path, 'w') as f:
            f.write(content)
        
        print(f"Updated {art} with {len(matched_images)} diagrams.")

