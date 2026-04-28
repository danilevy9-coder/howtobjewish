#!/usr/bin/env node
/**
 * Batch enrichment helper - reads article updates from a JSON array file
 * and applies them using the update-article.js module.
 *
 * Usage: node scripts/batch-enrich.js <updates-file.json>
 *
 * The JSON file should contain an array of objects, each with:
 *   { slug, content, meta_title, meta_description, excerpt }
 */
const fs = require('fs');
const { updateArticle } = require('./update-article.js');

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.log('Usage: node scripts/batch-enrich.js <updates-file.json>');
    process.exit(1);
  }

  const updates = JSON.parse(fs.readFileSync(file, 'utf8'));
  let success = 0;
  let failed = 0;

  for (const update of updates) {
    const { slug, ...fields } = update;
    console.log(`\n--- Processing: ${slug} ---`);
    try {
      const result = await updateArticle(slug, fields);
      if (result) {
        success++;
      } else {
        failed++;
      }
    } catch (e) {
      console.error(`  Exception for ${slug}:`, e.message);
      failed++;
    }
  }

  console.log(`\n=== Batch complete: ${success} updated, ${failed} failed ===`);
}

main().then(() => process.exit(0));
