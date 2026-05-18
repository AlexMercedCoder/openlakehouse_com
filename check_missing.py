import os

images = os.listdir("public/images/kb")
articles = os.listdir("src/content/kb")

# We want to match article filenames like "acid-transactions.md" to image filenames like "acid_transactions_*.png"

generated_base_names = set()
for img in images:
    if img.endswith('.png'):
        # Just grab the prefix before the last underscore, or something.
        # Let's be simple: check if any generated image name contains the article name without hyphens.
        pass

for article in articles:
    if article.endswith('.md'):
        with open(f"src/content/kb/{article}", 'r') as f:
            content = f.read()
            if "diagrams_included: 0" in content:
                article_base = article.replace('-', '_').replace('.md', '')
                found = False
                for img in images:
                    if img.startswith(article_base):
                        found = True
                        break
                if not found:
                    print(f"Missing image for: {article}")

