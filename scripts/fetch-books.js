import fs from 'fs';
import path from 'path';

const BOOKS_FILE = path.resolve('./src/data/books.json');
const IMAGES_DIR = path.resolve('./public/images/books');

async function downloadImage(url, filename) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(path.join(IMAGES_DIR, filename), buffer);
    return `/images/books/${filename}`;
  } catch (err) {
    console.error(`Failed to download image ${url}:`, err.message);
    return url; // fallback to external url
  }
}

async function fetchBooks() {
  console.log('Fetching books from books.alexmerced.com...');
  try {
    const res = await fetch('https://books.alexmerced.com');
    const text = await res.text();
    
    // Extract JSON-LD
    const match = text.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!match) {
      throw new Error('Could not find JSON-LD on books.alexmerced.com');
    }

    const data = JSON.parse(match[1]);
    let items = [];
    
    // Support varying schema structures
    if (data['@type'] === 'ItemList') {
      items = data.itemListElement || [];
    } else if (data['@graph']) {
      const list = data['@graph'].find(g => g['@type'] === 'ItemList');
      if (list) items = list.itemListElement || [];
    }

    // Ensure images directory exists
    fs.mkdirSync(IMAGES_DIR, { recursive: true });

    // Filter by keywords: AI, Lakehouse, Iceberg, Data, Agent
    const keywords = ['AI', 'Lakehouse', 'Iceberg', 'Data', 'Agent'];
    
    const relevantBooks = items.filter(i => {
      const title = i.item?.name || '';
      return keywords.some(k => title.toLowerCase().includes(k.toLowerCase()));
    });

    const finalBooks = [];

    for (const item of relevantBooks) {
      const book = item.item;
      let imageUrl = book.image;
      let localImagePath = imageUrl;

      // Extract filename from URL and download
      if (imageUrl && imageUrl.startsWith('http')) {
        const filename = imageUrl.split('/').pop();
        console.log(`Downloading cover: ${filename}`);
        localImagePath = await downloadImage(imageUrl, filename);
      }

      finalBooks.push({
        title: book.name,
        url: book.url,
        image: localImagePath,
        description: book.description || ''
      });
    }
    
    fs.mkdirSync(path.dirname(BOOKS_FILE), { recursive: true });
    fs.writeFileSync(BOOKS_FILE, JSON.stringify(finalBooks, null, 2));
    console.log(`Successfully saved ${finalBooks.length} books and downloaded covers.`);
    
  } catch (error) {
    console.error('Failed to fetch books:', error);
  }
}

fetchBooks();
