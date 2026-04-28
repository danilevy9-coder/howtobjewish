#!/usr/bin/env node
/**
 * Replace bad/irrelevant featured images with better matches.
 * Reads fix list from image-fixes.json, searches Unsplash with hand-crafted
 * queries, uploads to Cloudinary, and updates the DB.
 *
 * Usage: node scripts/fix-images.js
 */

const { createClient } = require('@supabase/supabase-js');
const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');

// ═══════════════════════ Config ═══════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

const BATCH_SIZE = 44;
const REQUEST_DELAY_MS = 1500;
const BATCH_COOLDOWN_MS = 62 * 60 * 1000;
const PROGRESS_FILE = path.join(__dirname, 'fix-progress.json');
const FIXES_FILE = path.join(__dirname, process.argv.includes('--pass2') ? 'image-fixes-2.json' : 'image-fixes.json');

// ═══════════════════════ Setup ═══════════════════════

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ═══════════════════════ Progress ═══════════════════════

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  } catch {
    return { completedSlugs: [], usedPhotoIds: [] };
  }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// ═══════════════════════ Unsplash ═══════════════════════

let rateLimitRemaining = 50;

async function searchUnsplash(query, retries = 3) {
  const url = `https://api.unsplash.com/search/photos?` +
    `query=${encodeURIComponent(query)}&per_page=15&orientation=landscape`;

  let res;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      res = await fetch(url, {
        headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
      });
      break;
    } catch (err) {
      console.error(`  Network error (attempt ${attempt}/${retries}): ${err.message}`);
      if (attempt === retries) return { photos: [], rateLimited: false };
      await sleep(5000 * attempt);
    }
  }

  rateLimitRemaining = parseInt(res.headers.get('x-ratelimit-remaining') || '50', 10);

  if (res.status === 403 || res.status === 429) {
    return { photos: null, rateLimited: true };
  }

  if (!res.ok) {
    console.error(`  Unsplash error: ${res.status}`);
    return { photos: [], rateLimited: false };
  }

  const data = await res.json();
  const photos = (data.results || []).map(p => ({
    id: p.id,
    url: p.urls.regular,
    alt: p.alt_description || query,
    photographer: p.user.name,
  }));

  return { photos, rateLimited: false };
}

// ═══════════════════════ Cloudinary ═══════════════════════

async function uploadToCloudinary(imageUrl, slug) {
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: 'howtobjewish',
      public_id: `featured-${slug}`,
      transformation: [
        { width: 1200, height: 630, crop: 'fill', gravity: 'auto' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
      overwrite: true,
    });
    return result.secure_url;
  } catch (err) {
    console.error(`  Cloudinary error: ${err.message}`);
    return null;
  }
}

// ═══════════════════════ Database ═══════════════════════

async function updatePostImage(slug, imageUrl) {
  const { error } = await supabase
    .from('posts')
    .update({ featured_image: imageUrl, updated_at: new Date().toISOString() })
    .eq('slug', slug);
  if (error) {
    console.error(`  DB error: ${error.message}`);
    return false;
  }
  return true;
}

// ═══════════════════════ Utilities ═══════════════════════

const sleep = ms => new Promise(r => setTimeout(r, ms));

function formatTime(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

// ═══════════════════════ Main ═══════════════════════

async function main() {
  console.log('');
  console.log('==========================================================');
  console.log('  Image Fix Script — Replacing irrelevant images');
  console.log('==========================================================');
  console.log('');

  const { fixes } = JSON.parse(fs.readFileSync(FIXES_FILE, 'utf8'));
  const progress = loadProgress();

  console.log(`Total fixes needed: ${fixes.length}`);
  console.log(`Already completed: ${progress.completedSlugs.length}`);

  const pending = fixes.filter(f => !progress.completedSlugs.includes(f.slug));
  console.log(`Pending: ${pending.length}`);
  console.log('');

  if (pending.length === 0) {
    console.log('All fixes applied!');
    return;
  }

  let apiCalls = 0;
  let batchStart = Date.now();
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < pending.length; i++) {
    const fix = pending[i];

    // Rate limit check
    if (apiCalls >= BATCH_SIZE) {
      const elapsed = Date.now() - batchStart;
      const waitTime = Math.max(0, BATCH_COOLDOWN_MS - elapsed);
      if (waitTime > 0) {
        console.log('');
        console.log('----------------------------------------------------------');
        console.log(`  Batch done: ${successCount} fixed. Cooling down ${formatTime(waitTime)}`);
        console.log(`  Resume at ~${new Date(Date.now() + waitTime).toLocaleTimeString('en-US', { hour12: false })}`);
        console.log('----------------------------------------------------------');
        await sleep(waitTime);
      }
      apiCalls = 0;
      batchStart = Date.now();
    }

    console.log(`[${i + 1}/${pending.length}] "${fix.slug}"`);
    console.log(`  Query: "${fix.query}" (was: ${fix.reason})`);

    const { photos, rateLimited } = await searchUnsplash(fix.query);
    apiCalls++;

    if (rateLimited) {
      console.log('  RATE LIMITED — waiting full cooldown');
      await sleep(BATCH_COOLDOWN_MS);
      apiCalls = 0;
      batchStart = Date.now();
      i--;
      continue;
    }

    // Pick first unused photo
    const photo = photos?.find(p => !progress.usedPhotoIds.includes(p.id));

    if (!photo) {
      console.log(`  No suitable photo found (${photos?.length || 0} results, all used)`);
      failCount++;
      continue;
    }

    console.log(`  Found: "${photo.alt}" by ${photo.photographer}`);
    console.log(`  Uploading to Cloudinary...`);

    const cdnUrl = await uploadToCloudinary(photo.url, fix.slug);
    if (!cdnUrl) {
      console.log(`  Upload failed`);
      failCount++;
      continue;
    }

    const updated = await updatePostImage(fix.slug, cdnUrl);
    if (updated) {
      progress.usedPhotoIds.push(photo.id);
      progress.completedSlugs.push(fix.slug);
      saveProgress(progress);
      successCount++;
      console.log(`  Done! (rate limit: ${rateLimitRemaining})`);
    } else {
      failCount++;
    }

    if (i < pending.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }

    if ((i + 1) % 10 === 0) {
      console.log(`\n--- Progress: ${successCount} fixed, ${failCount} failed, ${pending.length - i - 1} remaining ---\n`);
    }
  }

  console.log('');
  console.log('==========================================================');
  console.log('  FIX COMPLETE');
  console.log('==========================================================');
  console.log(`  Fixed: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log('');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
