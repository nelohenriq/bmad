import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.infrastructure' });

const prisma = new PrismaClient();

async function migrateFeeds() {
  try {
    console.log('Starting feed migration...');

    // Read the feeds data
    const data = fs.readFileSync('feeds_data.sql', 'utf8');
    const lines = data.trim().split('\n');

    console.log(`Found ${lines.length} feeds to migrate`);

    for (const line of lines) {
      const parts = line.split('|');
      if (parts.length < 14) continue;

      const [id, userId, url, title, description, category, isActive, updateFrequency, keywordFilters, contentFilters, lastConfigUpdate, lastFetched, createdAt, updatedAt] = parts;

      // Convert timestamps from milliseconds to Date objects
      const createdAtDate = new Date(parseInt(createdAt));
      const updatedAtDate = new Date(parseInt(updatedAt));
      const lastFetchedDate = lastFetched ? new Date(parseInt(lastFetched)) : null;
      const lastConfigUpdateDate = lastConfigUpdate ? new Date(parseInt(lastConfigUpdate)) : null;

      // Parse JSON fields
      let parsedKeywordFilters = null;
      let parsedContentFilters = null;

      try {
        parsedKeywordFilters = keywordFilters ? JSON.parse(keywordFilters) : null;
      } catch (e) {
        parsedKeywordFilters = null;
      }

      try {
        parsedContentFilters = contentFilters ? JSON.parse(contentFilters) : null;
      } catch (e) {
        parsedContentFilters = null;
      }

      await prisma.feed.upsert({
        where: { id },
        update: {},
        create: {
          id,
          userId,
          url,
          title: title || null,
          description: description || null,
          category: category || null,
          isActive: isActive === '1',
          updateFrequency: updateFrequency || 'daily',
          keywordFilters: parsedKeywordFilters,
          contentFilters: parsedContentFilters,
          lastConfigUpdate: lastConfigUpdateDate,
          lastFetched: lastFetchedDate,
          createdAt: createdAtDate,
          updatedAt: updatedAtDate,
        },
      });

      console.log(`Migrated feed: ${title || url}`);
    }

    console.log('Feed migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateFeeds();