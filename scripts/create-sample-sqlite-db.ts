// scripts/create-sample-sqlite-db.ts
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

interface SampleFeed {
  id: number;
  url: string;
  title: string;
  description: string;
  last_fetched: string;
  created_at: string;
}

interface SampleFeedItem {
  id: number;
  feed_id: number;
  guid: string;
  title: string;
  content: string;
  published_at: string;
  created_at: string;
}

// Sample data for migration testing
const sampleFeeds: SampleFeed[] = [
  {
    id: 1,
    url: 'https://techcrunch.com/feed/',
    title: 'TechCrunch',
    description: 'TechCrunch is a leading technology media property, dedicated to obsessively profiling startups, reviewing new Internet products, and breaking tech news.',
    last_fetched: '2024-01-15T10:30:00Z',
    created_at: '2024-01-01T08:00:00Z'
  },
  {
    id: 2,
    url: 'https://www.theverge.com/rss/index.xml',
    title: 'The Verge',
    description: 'The Verge covers the intersection of technology, science, art, and culture.',
    last_fetched: '2024-01-15T09:45:00Z',
    created_at: '2024-01-02T14:20:00Z'
  },
  {
    id: 3,
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    title: 'Ars Technica',
    description: 'Serving the Technologist for more than a decade. IT news, reviews, and analysis.',
    last_fetched: '2024-01-15T11:15:00Z',
    created_at: '2024-01-03T16:45:00Z'
  }
];

const sampleFeedItems: SampleFeedItem[] = [
  {
    id: 1,
    feed_id: 1,
    guid: 'techcrunch-2024-001',
    title: 'OpenAI announces GPT-5 with revolutionary capabilities',
    content: 'OpenAI has unveiled GPT-5, their latest language model featuring unprecedented reasoning capabilities and multimodal understanding. The new model shows significant improvements in complex problem-solving and creative tasks.',
    published_at: '2024-01-15T08:00:00Z',
    created_at: '2024-01-15T08:05:00Z'
  },
  {
    id: 2,
    feed_id: 1,
    guid: 'techcrunch-2024-002',
    title: 'Meta introduces Llama 3.1 with 405B parameters',
    content: 'Meta has released Llama 3.1, the largest open-source language model to date with 405 billion parameters. The model demonstrates state-of-the-art performance across multiple benchmarks.',
    published_at: '2024-01-14T16:30:00Z',
    created_at: '2024-01-14T16:35:00Z'
  },
  {
    id: 3,
    feed_id: 2,
    guid: 'verge-2024-001',
    title: 'Apple Vision Pro receives mixed reviews from early adopters',
    content: 'Early users of Apple Vision Pro report impressive display quality and innovative interaction methods, but cite high price point and limited software ecosystem as major drawbacks.',
    published_at: '2024-01-15T06:00:00Z',
    created_at: '2024-01-15T06:10:00Z'
  },
  {
    id: 4,
    feed_id: 2,
    guid: 'verge-2024-002',
    title: 'Google announces major AI safety initiatives',
    content: 'Google has outlined comprehensive AI safety measures including new transparency requirements, bias detection systems, and international cooperation frameworks.',
    published_at: '2024-01-13T12:00:00Z',
    created_at: '2024-01-13T12:15:00Z'
  },
  {
    id: 5,
    feed_id: 3,
    guid: 'arstechnica-2024-001',
    title: 'Quantum computing breakthrough achieved at IBM',
    content: 'IBM researchers have demonstrated quantum advantage in a practical application, solving a complex optimization problem 100 times faster than classical supercomputers.',
    published_at: '2024-01-15T04:00:00Z',
    created_at: '2024-01-15T04:05:00Z'
  }
];

async function createSampleSQLiteDatabase() {
  console.log('🗄️  Creating sample SQLite database for migration testing...');

  // Ensure data directory exists
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'database.db');

  // Remove existing database if it exists
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Removed existing database file');
  }

  // Create new SQLite database
  const db = new Database(dbPath);

  try {
    // Create tables (matching the original SQLite schema)
    db.exec(`
      CREATE TABLE feeds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        title TEXT,
        description TEXT,
        last_fetched DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE feed_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feed_id INTEGER NOT NULL,
        guid TEXT UNIQUE,
        title TEXT NOT NULL,
        content TEXT,
        published_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (feed_id) REFERENCES feeds(id)
      );

      CREATE INDEX idx_feed_items_feed_id ON feed_items(feed_id);
      CREATE INDEX idx_feed_items_published_at ON feed_items(published_at DESC);
    `);

    console.log('✅ Created database tables');

    // Insert sample data
    const insertFeed = db.prepare(`
      INSERT INTO feeds (id, url, title, description, last_fetched, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertFeedItem = db.prepare(`
      INSERT INTO feed_items (id, feed_id, guid, title, content, published_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Insert feeds
    for (const feed of sampleFeeds) {
      insertFeed.run(
        feed.id,
        feed.url,
        feed.title,
        feed.description,
        feed.last_fetched,
        feed.created_at
      );
    }

    // Insert feed items
    for (const item of sampleFeedItems) {
      insertFeedItem.run(
        item.id,
        item.feed_id,
        item.guid,
        item.title,
        item.content,
        item.published_at,
        item.created_at
      );
    }

    console.log('✅ Inserted sample data');

    // Verify data
    const feedCount = db.prepare('SELECT COUNT(*) as count FROM feeds').get().count;
    const itemCount = db.prepare('SELECT COUNT(*) as count FROM feed_items').get().count;

    console.log(`📊 Database created with ${feedCount} feeds and ${itemCount} feed items`);

    // Get database file size
    const stats = fs.statSync(dbPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`📁 Database file size: ${sizeMB} MB`);

  } catch (error: any) {
    console.error('❌ Failed to create sample database:', error.message);
    throw error;
  } finally {
    db.close();
  }

  console.log('🎉 Sample SQLite database created successfully!');
  console.log(`📍 Location: ${dbPath}`);
}

createSampleSQLiteDatabase().catch(console.error);