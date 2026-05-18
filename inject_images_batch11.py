import os
import shutil

mapping = {
    "amazon-athena.md": ["amazon_athena_serverless"],
    "google-bigquery.md": ["google_bigquery_architecture"],
    "sql-dialects.md": ["sql_dialects_translation"],
    "pushdown-optimization.md": ["pushdown_optimization_filter"],
    "distributed-compute.md": ["distributed_compute_cluster"],
    "mpp.md": ["mpp_architecture"],
    "vectorized-execution.md": ["vectorized_execution_simd"],
    "cost-based-optimizer.md": ["cost_based_optimizer"],
    "rule-based-optimizer.md": ["rule_based_optimizer"],
    "object-storage.md": ["object_storage_architecture"]
}

artifacts_dir = "/home/alexmerced/.gemini/antigravity/brain/e5f23733-8444-49a0-84b4-f7b3f4f40778/"
dest_images_dir = "/home/alexmerced/development/personal/Personal/website/2026/openlakehouse/public/images/kb/"
articles_dir = "/home/alexmerced/development/personal/Personal/website/2026/openlakehouse/src/content/kb/"

def get_latest_file(prefix):
    files = [f for f in os.listdir(artifacts_dir) if f.startswith(prefix) and f.endswith(".png")]
    if not files:
        return None
    return sorted(files)[-1]

for art, img_prefixes in mapping.items():
    file_path = os.path.join(articles_dir, art)
    
    with open(file_path, 'r') as f:
        content = f.read()
        
    diagram_section = "\n\n## Visual Architecture\n\n"
    
    for prefix in img_prefixes:
        actual_img = get_latest_file(prefix)
        if actual_img:
            src = os.path.join(artifacts_dir, actual_img)
            dest_name = f"{prefix}.png"
            dest = os.path.join(dest_images_dir, dest_name)
            shutil.copy2(src, dest)
            
            title = dest_name.replace('.png', '').replace('_', ' ').title()
            diagram_section += f"![{title}](/images/kb/{dest_name})\n\n"
        else:
            print(f"Warning: Image for {prefix} not found!")

    if "## Visual Architecture" not in content:
        content += diagram_section
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"Injected into {art}")
