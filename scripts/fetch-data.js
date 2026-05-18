import fs from 'fs';
import path from 'path';
import Parser from 'rss-parser';

const parser = new Parser();

const BLOGS_FILE = path.resolve('./src/data/blogs.json');
const VIDEOS_FILE = path.resolve('./src/data/videos.json');

async function fetchBlogs() {
  console.log('Fetching blogs from datalakehousehub.com...');
  try {
    const feed = await parser.parseURL('https://datalakehousehub.com/rss.xml');
    const blogs = feed.items.map(item => {
      // Handle different date formats gracefully
      let dateStr = '';
      try {
        if (item.pubDate) {
          dateStr = new Date(item.pubDate).toISOString().split('T')[0];
        }
      } catch (e) {
        dateStr = item.pubDate || '';
      }

      return {
        title: item.title,
        url: item.link,
        date: dateStr
      };
    }); // Get all available blogs
    
    fs.mkdirSync(path.dirname(BLOGS_FILE), { recursive: true });
    fs.writeFileSync(BLOGS_FILE, JSON.stringify(blogs, null, 2));
    console.log(`Successfully saved ${blogs.length} blogs to src/data/blogs.json`);
  } catch (error) {
    console.error('Failed to fetch blogs:', error.message);
  }
}

async function fetchVideos() {
  console.log('Fetching videos from youtube.com/@alexmerceddata...');
  try {
    const channelId = 'UCmI91YGMVBvJlJB0oZV-M9g';
    const feed = await parser.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    
    const videos = feed.items.map(item => {
      // Extract video ID from URL
      let videoId = '';
      const match = item.link.match(/v=([^&]+)/);
      if (match) {
        videoId = match[1];
      }
      
      return {
        title: item.title,
        url: item.link,
        thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : ''
      };
    }).filter(v => v.thumbnail); // Get all available videos from RSS (usually 15)
    
    fs.mkdirSync(path.dirname(VIDEOS_FILE), { recursive: true });
    fs.writeFileSync(VIDEOS_FILE, JSON.stringify(videos, null, 2));
    console.log(`Successfully saved ${videos.length} videos to src/data/videos.json`);
  } catch (error) {
    console.error('Failed to fetch videos:', error.message);
  }
}

async function main() {
  await fetchBlogs();
  await fetchVideos();
}

main().catch(console.error);
