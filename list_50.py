import os

articles = os.listdir("src/content/kb")
md_files = [art for art in articles if art.endswith('.md')]

zero_articles = []
for art in md_files:
    with open(f"src/content/kb/{art}", 'r') as f:
        if "diagrams_included: 0" in f.read():
            zero_articles.append(art.replace('.md', ''))

print(sorted(zero_articles))
