import os
import re

images_dir = "public/images/kb"
articles_dir = "src/content/kb"

images = [img for img in os.listdir(images_dir) if img.endswith('.png')]
md_files = [art for art in os.listdir(articles_dir) if art.endswith('.md')]

for art in md_files:
    file_path = os.path.join(articles_dir, art)
    with open(file_path, 'r') as f:
        content = f.read()
    
    if "diagrams_included: 0" in content:
        # Determine prefix
        prefix = art.replace('.md', '').replace('-', '_')
        
        # Find matching images
        matched_images = []
        for img in images:
            if img.startswith(prefix):
                matched_images.append(img)
                
        # Some prefixes might have issues if they are a subset of another, 
        # but in our case they are quite distinct. Let's make sure it matches properly.
        # Actually, sorting them so they appear consistently.
        matched_images.sort()
        
        if matched_images:
            # Update frontmatter
            content = content.replace("diagrams_included: 0", f"diagrams_included: {len(matched_images)}")
            
            # Append images at the end
            diagram_section = "\n\n## Visual Architecture\n\n"
            for i, img in enumerate(matched_images):
                # Clean up title for alt text
                title = img.replace('.png', '').replace('_', ' ').title()
                diagram_section += f"![{title}](/images/kb/{img})\n\n"
            
            content += diagram_section
            
            with open(file_path, 'w') as f:
                f.write(content)
            
            print(f"Updated {art} with {len(matched_images)} diagrams.")
        else:
            print(f"WARNING: No images found for {art} (prefix: {prefix})")

