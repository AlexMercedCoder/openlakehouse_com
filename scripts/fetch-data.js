import fs from 'fs';
import path from 'path';

// Note: In a real production environment, you would use an XML parser like `rss-parser` 
// to fetch from datalakehousehub.com/rss.xml and the YouTube channel RSS feed.

const BLOGS_FILE = path.resolve('./src/data/blogs.json');
const VIDEOS_FILE = path.resolve('./src/data/videos.json');

async function fetchBlogs() {
  console.log('Fetching blogs from datalakehousehub.com...');
  // Stubbing the blog data
  const blogs = [
    {
      title: "Data Lakehouse Architecture Explained",
      url: "https://datalakehousehub.com/data-lakehouse-architecture",
      date: "2026-05-10"
    },
    {
      title: "Apache Iceberg vs Delta Lake",
      url: "https://datalakehousehub.com/iceberg-vs-delta",
      date: "2026-05-12"
    }
  ];
  
  fs.mkdirSync(path.dirname(BLOGS_FILE), { recursive: true });
  fs.writeFileSync(BLOGS_FILE, JSON.stringify(blogs, null, 2));
  console.log('Blogs saved to src/data/blogs.json');
}

async function fetchVideos() {
  console.log('Fetching videos from youtube.com/@alexmerceddata...');
  // Stubbing the video data
  const videos = [
    {
      title: "Intro to Agentic Analytics",
      url: "https://youtube.com/watch?v=example1",
      thumbnail: "https://img.youtube.com/vi/example1/hqdefault.jpg"
    },
    {
      title: "Building an Iceberg Catalog",
      url: "https://youtube.com/watch?v=example2",
      thumbnail: "https://img.youtube.com/vi/example2/hqdefault.jpg"
    }
  ];
  
  fs.mkdirSync(path.dirname(VIDEOS_FILE), { recursive: true });
  fs.writeFileSync(VIDEOS_FILE, JSON.stringify(videos, null, 2));
  console.log('Videos saved to src/data/videos.json');
}

async function main() {
  await fetchBlogs();
  await fetchVideos();
}

main().catch(console.error);
