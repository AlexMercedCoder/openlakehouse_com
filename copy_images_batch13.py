import os
import shutil

prefixes = [
    "serialization_concept",
    "serialization_flow",
    "deserialization_concept",
    "deserialization_flow",
    "dictionary_encoding_concept",
    "dictionary_encoding_flow",
    "rle_concept",
    "rle_flow",
    "snappy_concept",
    "snappy_flow",
    "zstd_concept",
    "zstd_flow",
    "gzip_concept",
    "gzip_flow",
    "lz4_concept",
    "lz4_flow",
    "block_size_concept",
    "block_size_flow"
]

artifacts_dir = "/home/alexmerced/.gemini/antigravity/brain/e5f23733-8444-49a0-84b4-f7b3f4f40778/"
dest_images_dir = "/home/alexmerced/development/personal/Personal/website/2026/openlakehouse/public/images/kb/"

def get_latest_file(prefix):
    files = [f for f in os.listdir(artifacts_dir) if f.startswith(prefix) and f.endswith(".png")]
    if not files:
        return None
    return sorted(files)[-1]

for prefix in prefixes:
    actual_img = get_latest_file(prefix)
    if actual_img:
        src = os.path.join(artifacts_dir, actual_img)
        dest_name = f"{prefix}.png"
        dest = os.path.join(dest_images_dir, dest_name)
        shutil.copy2(src, dest)
        print(f"Copied {prefix} -> {dest_name}")
    else:
        print(f"Warning: Image for {prefix} not found!")
