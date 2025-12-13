import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.infrastructure' });

const prisma = new PrismaClient();

async function migrateAllData() {
  try {
    console.log('Starting full data migration from SQLite to PostgreSQL...');

    // Helper function to execute SQLite queries
    const execSqlite = (query) => {
      return execSync(`sqlite3 prisma/dev.db "${query}"`, { encoding: 'utf8' }).trim();
    };

    // 1. Migrate users (should already exist, but upsert)
    console.log('Migrating users...');
    const userData = execSqlite("SELECT id, email, name, bio, avatar, createdAt, updatedAt FROM users;");
    if (userData) {
      const [id, email, name, bio, avatar, createdAt, updatedAt] = userData.split('|');
      await prisma.user.upsert({
        where: { id },
        update: {},
        create: {
          id,
          email,
          name: name || null,
          bio: bio || null,
          avatar: avatar || null,
          createdAt: new Date(parseInt(createdAt)),
          updatedAt: new Date(parseInt(updatedAt)),
        },
      });
      console.log('Users migrated');
    }

    // 2. Migrate feeds
    console.log('Migrating feeds...');
    const feedsData = fs.readFileSync('feeds_data.sql', 'utf8');
    const feedLines = feedsData.split('\n').filter(line => line.trim());

    for (const line of feedLines) {
      const parts = line.split('|');
      if (parts.length < 14) continue;

      const [id, userId, url, title, description, category, isActive, updateFrequency, keywordFilters, contentFilters, lastConfigUpdate, lastFetched, createdAt, updatedAt] = parts;

      const createdAtDate = new Date(parseInt(createdAt));
      const updatedAtDate = new Date(parseInt(updatedAt));
      const lastFetchedDate = lastFetched ? new Date(parseInt(lastFetched)) : null;
      const lastConfigUpdateDate = lastConfigUpdate ? new Date(parseInt(lastConfigUpdate)) : null;

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
    }
    console.log(`Feeds migrated: ${feedLines.length}`);

    // 3. Migrate contents
    console.log('Migrating contents...');
    const contentsData = execSqlite("SELECT id, userId, topicId, title, content, style, length, outline, status, wordCount, readingTime, model, prompt, generatedAt, outlineGeneratedAt, outlineModel, outlinePrompt, outlineConfidence, isPublished, publishedAt, createdAt, updatedAt FROM contents;");
    const contentLines = contentsData.split('\n').filter(line => line.trim());

    for (const line of contentLines) {
      const parts = line.split('|');
      if (parts.length < 22) continue;

      const [id, userId, topicId, title, content, style, length, outline, status, wordCount, readingTime, model, prompt, generatedAt, outlineGeneratedAt, outlineModel, outlinePrompt, outlineConfidence, isPublished, publishedAt, createdAt, updatedAt] = parts;

      await prisma.content.upsert({
        where: { id },
        update: {},
        create: {
          id,
          userId,
          topicId: topicId || null,
          title,
          content,
          style,
          length,
          outline: outline || null,
          status: status || 'draft',
          wordCount: wordCount ? parseInt(wordCount) : null,
          readingTime: readingTime ? parseInt(readingTime) : null,
          model,
          prompt: prompt || null,
          generatedAt: new Date(parseInt(generatedAt)),
          outlineGeneratedAt: outlineGeneratedAt ? new Date(parseInt(outlineGeneratedAt)) : null,
          outlineModel: outlineModel || null,
          outlinePrompt: outlinePrompt || null,
          outlineConfidence: outlineConfidence ? parseFloat(outlineConfidence) : null,
          isPublished: isPublished === '1',
          publishedAt: publishedAt ? new Date(parseInt(publishedAt)) : null,
          createdAt: new Date(parseInt(createdAt)),
          updatedAt: new Date(parseInt(updatedAt)),
        },
      });
    }
    console.log(`Contents migrated: ${contentLines.length}`);

    // 4. Skip feed_items migration for now (too much data)
    console.log('Skipping feed items migration (too much data)...');

    // 5. Migrate content_analyses
    console.log('Migrating content analyses...');
    const analysesData = execSqlite("SELECT id, feedItemId, primaryTopicId, relevanceScore, sentiment, readability, wordCount, modelUsed, promptVersion, confidence, status, errorMessage, createdAt, updatedAt FROM content_analyses;");
    const analysisLines = analysesData.split('\n').filter(line => line.trim());

    for (const line of analysisLines) {
      const parts = line.split('|');
      if (parts.length < 14) continue;

      const [id, feedItemId, primaryTopicId, relevanceScore, sentiment, readability, wordCount, modelUsed, promptVersion, confidence, status, errorMessage, createdAt, updatedAt] = parts;

      await prisma.contentAnalysis.upsert({
        where: { id },
        update: {},
        create: {
          id,
          feedItemId,
          primaryTopicId: primaryTopicId || null,
          relevanceScore: relevanceScore ? parseFloat(relevanceScore) : 0.0,
          sentiment: sentiment || null,
          readability: readability ? parseFloat(readability) : null,
          wordCount: wordCount ? parseInt(wordCount) : null,
          modelUsed: modelUsed || null,
          promptVersion: promptVersion || null,
          confidence: confidence ? parseFloat(confidence) : 0.0,
          status: status || 'pending',
          errorMessage: errorMessage || null,
          createdAt: new Date(parseInt(createdAt)),
          updatedAt: new Date(parseInt(updatedAt)),
        },
      });
    }
    console.log(`Content analyses migrated: ${analysisLines.length}`);

    // 6. Migrate system_logs (optional, might be too many)
    console.log('Skipping system logs migration (too many records)...');

    console.log('Full data migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateAllData();