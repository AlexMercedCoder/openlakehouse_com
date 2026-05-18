import os

images = os.listdir("public/images/kb")
articles = os.listdir("src/content/kb")

img_files = [img for img in images if img.endswith('.png')]
md_files = [art for art in articles if art.endswith('.md')]

zero_articles = []
for art in md_files:
    with open(f"src/content/kb/{art}", 'r') as f:
        if "diagrams_included: 0" in f.read():
            zero_articles.append(art)

print(f"Total articles needing images: {len(zero_articles)}")
print(f"Total images available in kb: {len(img_files)}")
