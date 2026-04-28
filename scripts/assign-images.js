#!/usr/bin/env node
/**
 * Assign Unsplash featured images to all posts that don't have one.
 *
 * Features:
 *  - Respects Unsplash rate limits (50 req/hr free tier) — batches of 45
 *  - Tracks used photo IDs so no two posts share the same image
 *  - Fully resumable via progress file (safe to Ctrl-C and restart)
 *  - Uploads through Cloudinary (matching existing 1200x630 pipeline)
 *  - Smart search queries with fallbacks for niche topics
 *
 * Usage:
 *   node scripts/assign-images.js            # Start or resume
 *   node scripts/assign-images.js --reset     # Clear progress and restart
 *   node scripts/assign-images.js --dry-run   # Preview queries without API calls
 */

const { createClient } = require('@supabase/supabase-js');
const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');

// ═══════════════════════ Configuration ═══════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

const BATCH_SIZE = 45;              // Unsplash calls per hour (leave buffer from 50)
const REQUEST_DELAY_MS = 1500;      // Delay between Unsplash calls
const BATCH_COOLDOWN_MS = 62 * 60 * 1000; // 62 min between batches (safe margin)
const UNSPLASH_PER_PAGE = 30;       // Max results per search (maximizes photo pool)
const PROGRESS_FILE = path.join(__dirname, 'image-progress.json');

// ═══════════════════════ Setup ═══════════════════════

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const DRY_RUN = process.argv.includes('--dry-run');
const RESET = process.argv.includes('--reset');

// ═══════════════════════ Progress Tracking ═══════════════════════

function loadProgress() {
  if (RESET) {
    console.log('Resetting progress...\n');
    return { completedSlugs: [], usedPhotoIds: [], searchCache: {}, failedSlugs: [] };
  }
  try {
    const raw = fs.readFileSync(PROGRESS_FILE, 'utf8');
    const p = JSON.parse(raw);
    // Ensure all fields exist
    p.completedSlugs = p.completedSlugs || [];
    p.usedPhotoIds = p.usedPhotoIds || [];
    p.searchCache = p.searchCache || {};
    p.failedSlugs = p.failedSlugs || [];
    return p;
  } catch {
    return { completedSlugs: [], usedPhotoIds: [], searchCache: {}, failedSlugs: [] };
  }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// ═══════════════════════ Search Query Generation ═══════════════════════

const STOP_WORDS = new Set([
  'how', 'to', 'what', 'is', 'the', 'a', 'an', 'of', 'in', 'for', 'and',
  'or', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'can', 'shall', 'with', 'about', 'at', 'by', 'from', 'on', 'into',
  'through', 'during', 'before', 'after', 'between', 'under', 'when',
  'where', 'why', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'not', 'only', 'own', 'same', 'than',
  'too', 'very', 'just', 'because', 'your', 'you', 'we', 'they', 'it',
  'its', 'their', 'our', 'my', 'his', 'her', 'this', 'that', 'these',
  'those', 'up', 'out', 'if', 'but', 'so', 'get', 'got', 'know', 'need',
  'want', 'make', 'take', 'go', 'come', 'think', 'also', 'really',
  'right', 'way', 'things', 'thing', 'much', 'many', 'like', 'still',
  'even', 'back', 'over', 'must', 'say', 'said', 'well', 'who', 'which',
]);

function extractKeywords(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Generate a ranked list of search queries for a post title.
 * Tries specific first, falls back to broader Jewish-themed queries.
 */
function generateSearchQueries(title) {
  const kw = extractKeywords(title);
  const queries = [];

  // 1. Full keyword query (most specific)
  if (kw.length >= 2) {
    queries.push(kw.slice(0, 4).join(' '));
  }

  // 2. Shorter + "jewish" context
  if (kw.length >= 1) {
    queries.push(kw.slice(0, 2).join(' ') + ' jewish');
  }

  // 3. First keyword + "judaism"
  if (kw[0]) {
    queries.push(kw[0] + ' judaism');
  }

  // 4. Broader fallbacks based on common themes
  const titleLower = title.toLowerCase();
  if (/pray|tefill|daven|siddur|amidah/i.test(titleLower)) {
    queries.push('jewish prayer synagogue');
  } else if (/shabbat|shabbos|sabbath|candle/i.test(titleLower)) {
    queries.push('shabbat candles table');
  } else if (/torah|parsha|parashat|chumash/i.test(titleLower)) {
    queries.push('torah scroll reading');
  } else if (/kosher|kashrut|food|eat/i.test(titleLower)) {
    queries.push('kosher food preparation');
  } else if (/wedding|marriage|chuppah/i.test(titleLower)) {
    queries.push('jewish wedding ceremony');
  } else if (/child|kid|parent|family/i.test(titleLower)) {
    queries.push('jewish family children');
  } else if (/holiday|rosh|yom|sukkot|pesach|purim|chanuk/i.test(titleLower)) {
    queries.push('jewish holiday celebration');
  } else if (/convert|conversion|ger|geirus/i.test(titleLower)) {
    queries.push('jewish community welcoming');
  } else if (/mikvah|mikveh|tevi/i.test(titleLower)) {
    queries.push('water spiritual ritual');
  } else if (/mezuz|tefillin|tzitzit|kippah/i.test(titleLower)) {
    queries.push('jewish religious items');
  } else if (/death|mourn|shiva|burial|cemetery/i.test(titleLower)) {
    queries.push('memorial remembrance candle');
  } else if (/israel|jerusalem|holy land/i.test(titleLower)) {
    queries.push('jerusalem western wall');
  } else {
    queries.push('jewish life spirituality');
  }

  // 5. Ultimate fallback
  queries.push('jewish tradition community');

  // Deduplicate
  return [...new Set(queries)];
}

// ═══════════════════════ Unsplash API ═══════════════════════

let rateLimitRemaining = 50;

async function searchUnsplash(query, progress) {
  // Return cached results if available
  if (progress.searchCache[query]) {
    return { photos: progress.searchCache[query], cached: true };
  }

  const url = `https://api.unsplash.com/search/photos?` +
    `query=${encodeURIComponent(query)}&per_page=${UNSPLASH_PER_PAGE}&orientation=landscape`;

  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
  });

  // Track rate limit from headers
  const remaining = parseInt(res.headers.get('x-ratelimit-remaining') || '50', 10);
  rateLimitRemaining = remaining;

  if (res.status === 403 || res.status === 429) {
    console.log(`  [RATE LIMITED] Status ${res.status}, remaining: ${remaining}`);
    return { photos: null, cached: false, rateLimited: true };
  }

  if (!res.ok) {
    console.error(`  [UNSPLASH ERROR] ${res.status}: ${await res.text()}`);
    return { photos: [], cached: false };
  }

  const data = await res.json();
  const photos = (data.results || []).map(p => ({
    id: p.id,
    url: p.urls.regular,
    rawUrl: p.urls.raw,
    alt: p.alt_description || query,
    photographer: p.user.name,
    photographerUrl: p.user.links.html,
  }));

  // Cache results
  progress.searchCache[query] = photos;
  saveProgress(progress);

  return { photos, cached: false };
}

function pickUnusedPhoto(photos, usedIds) {
  if (!photos || photos.length === 0) return null;
  // First try: unused photo
  const unused = photos.find(p => !usedIds.includes(p.id));
  if (unused) return unused;
  // All used — return null (caller will try next query)
  return null;
}

// ═══════════════════════ Cloudinary Upload ═══════════════════════

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
    console.error(`  [CLOUDINARY ERROR] ${err.message}`);
    return null;
  }
}

// ═══════════════════════ Database ═══════════════════════

async function getPostsWithoutImages() {
  // Fetch posts with null or empty featured_image
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, slug, featured_image')
    .or('featured_image.is.null,featured_image.eq.')
    .order('title');

  if (error) {
    console.error('Error fetching posts:', error.message);
    return [];
  }
  return data || [];
}

async function getAllPostCount() {
  const { count, error } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true });
  if (error) return '?';
  return count;
}

async function updatePostImage(slug, imageUrl) {
  const { error } = await supabase
    .from('posts')
    .update({ featured_image: imageUrl, updated_at: new Date().toISOString() })
    .eq('slug', slug);

  if (error) {
    console.error(`  [DB ERROR] ${slug}: ${error.message}`);
    return false;
  }
  return true;
}

// ═══════════════════════ Utilities ═══════════════════════

const sleep = ms => new Promise(r => setTimeout(r, ms));

function formatTime(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function timestamp() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

// ═══════════════════════ Main Process ═══════════════════════

async function processPost(post, progress) {
  const queries = generateSearchQueries(post.title);
  let apiCallsMade = 0;

  for (const query of queries) {
    const { photos, cached, rateLimited } = await searchUnsplash(query, progress);

    if (!cached) apiCallsMade++;
    if (rateLimited) return { success: false, apiCalls: apiCallsMade, rateLimited: true };

    const photo = pickUnusedPhoto(photos, progress.usedPhotoIds);

    if (photo) {
      console.log(`  Found: "${photo.alt}" by ${photo.photographer} (query: "${query}")`);

      if (DRY_RUN) {
        console.log(`  [DRY RUN] Would upload ${photo.url}`);
        return { success: true, apiCalls: apiCallsMade, rateLimited: false };
      }

      // Upload to Cloudinary
      console.log(`  Uploading to Cloudinary...`);
      const cdnUrl = await uploadToCloudinary(photo.url, post.slug);
      if (!cdnUrl) {
        console.log(`  Cloudinary failed, trying raw URL directly...`);
        // Try with raw URL as fallback
        const cdnUrl2 = await uploadToCloudinary(photo.rawUrl + '&w=1200&h=630&fit=crop', post.slug);
        if (!cdnUrl2) {
          return { success: false, apiCalls: apiCallsMade, rateLimited: false };
        }
      }

      const finalUrl = cdnUrl || null;
      if (!finalUrl) return { success: false, apiCalls: apiCallsMade, rateLimited: false };

      // Update database
      const updated = await updatePostImage(post.slug, finalUrl);
      if (updated) {
        progress.usedPhotoIds.push(photo.id);
        progress.completedSlugs.push(post.slug);
        saveProgress(progress);
        console.log(`  Done! (${photo.photographer} - Unsplash)`);
        return { success: true, apiCalls: apiCallsMade, rateLimited: false };
      }
      return { success: false, apiCalls: apiCallsMade, rateLimited: false };
    }

    // No unused photo for this query, try next
    if (!cached) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  // Exhausted all queries without finding an unused photo
  console.log(`  No unique photo found across ${queries.length} queries`);
  progress.failedSlugs.push(post.slug);
  saveProgress(progress);
  return { success: false, apiCalls: apiCallsMade, rateLimited: false };
}

async function main() {
  console.log('');
  console.log('==========================================================');
  console.log('  Unsplash Image Assignment Script');
  console.log('  howtobjewish.org');
  console.log('==========================================================');
  console.log('');

  if (DRY_RUN) console.log('[DRY RUN MODE - No API calls or DB writes]\n');

  // Load progress
  const progress = loadProgress();
  const totalPosts = await getAllPostCount();

  console.log(`Total posts in database: ${totalPosts}`);
  console.log(`Already completed: ${progress.completedSlugs.length}`);
  console.log(`Used photo IDs: ${progress.usedPhotoIds.length}`);
  console.log(`Cached searches: ${Object.keys(progress.searchCache).length}`);
  console.log(`Failed (no photo found): ${progress.failedSlugs.length}`);
  console.log('');

  // Fetch posts without images
  const postsWithoutImages = await getPostsWithoutImages();
  console.log(`Posts without featured_image: ${postsWithoutImages.length}`);

  // Filter out already completed and permanently failed
  const pending = postsWithoutImages.filter(
    p => !progress.completedSlugs.includes(p.slug)
  );
  console.log(`Pending to process: ${pending.length}`);
  console.log('');

  if (pending.length === 0) {
    console.log('All posts have images! Nothing to do.');

    // Check for any failed posts that might benefit from retry
    if (progress.failedSlugs.length > 0) {
      console.log(`\nNote: ${progress.failedSlugs.length} posts previously failed.`);
      console.log('Run with --reset to retry them.');
    }
    return;
  }

  // Estimate time
  const estimatedBatches = Math.ceil(pending.length / BATCH_SIZE);
  const estimatedTime = estimatedBatches * BATCH_COOLDOWN_MS;
  console.log(`Estimated: ${estimatedBatches} batch(es), ~${formatTime(estimatedTime)} total`);
  console.log(`Starting at ${timestamp()}`);
  console.log('');

  // Process posts
  let batchApiCalls = 0;
  let batchStart = Date.now();
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < pending.length; i++) {
    const post = pending[i];

    console.log(`\n[${i + 1}/${pending.length}] "${post.title}" (${post.slug})`);

    // Check if we need to wait for rate limit
    if (batchApiCalls >= BATCH_SIZE) {
      const elapsed = Date.now() - batchStart;
      const waitTime = Math.max(0, BATCH_COOLDOWN_MS - elapsed);
      if (waitTime > 0) {
        console.log('');
        console.log('----------------------------------------------------------');
        console.log(`  Batch complete: ${successCount} succeeded this batch`);
        console.log(`  Rate limit cooldown: waiting ${formatTime(waitTime)}`);
        console.log(`  Will resume at ~${new Date(Date.now() + waitTime).toLocaleTimeString('en-US', { hour12: false })}`);
        console.log('----------------------------------------------------------');
        await sleep(waitTime);
      }
      batchApiCalls = 0;
      batchStart = Date.now();
      console.log(`\nResuming at ${timestamp()}...`);
    }

    const result = await processPost(post, progress);

    batchApiCalls += result.apiCalls;

    if (result.rateLimited) {
      // Rate limited mid-batch — wait full cooldown
      const waitTime = BATCH_COOLDOWN_MS;
      console.log('');
      console.log('----------------------------------------------------------');
      console.log(`  Hit rate limit! Waiting ${formatTime(waitTime)}`);
      console.log(`  Will resume at ~${new Date(Date.now() + waitTime).toLocaleTimeString('en-US', { hour12: false })}`);
      console.log('----------------------------------------------------------');
      await sleep(waitTime);
      batchApiCalls = 0;
      batchStart = Date.now();
      i--; // Retry this post
      continue;
    }

    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }

    // Small delay between posts even within a batch
    if (result.apiCalls > 0 && i < pending.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }

    // Periodic status
    if ((i + 1) % 10 === 0) {
      console.log(`\n--- Progress: ${successCount} success, ${failCount} failed, ${pending.length - i - 1} remaining | Rate limit: ${rateLimitRemaining} ---\n`);
    }
  }

  // Final summary
  console.log('');
  console.log('==========================================================');
  console.log('  COMPLETE');
  console.log('==========================================================');
  console.log(`  Succeeded: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log(`  Total unique photos used: ${progress.usedPhotoIds.length}`);
  console.log(`  Previously completed: ${progress.completedSlugs.length - successCount}`);
  console.log('');

  if (failCount > 0) {
    console.log(`  ${failCount} posts could not get unique images.`);
    console.log('  These are saved in the progress file for manual review.');
  }

  // Verify all posts now have images
  const remaining = await getPostsWithoutImages();
  if (remaining.length === 0) {
    console.log('  ALL posts now have featured images!');
  } else {
    console.log(`  ${remaining.length} posts still need images (may need --reset and re-run).`);
  }
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
