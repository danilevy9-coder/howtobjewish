-- ============================================
-- How to Be Jewish - Supabase Database Schema
-- ============================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Authors
create table authors (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  bio text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Categories (with parent/child hierarchy)
create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  parent_id uuid references categories(id) on delete set null,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index idx_categories_slug on categories(slug);
create index idx_categories_parent on categories(parent_id);

-- Posts
create table posts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text not null unique,
  content text not null default '',
  excerpt text,
  featured_image text,
  author_id uuid references authors(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'queued', 'published')),
  published_at timestamptz,
  scheduled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  meta_title text,
  meta_description text,
  is_pillar boolean default false,
  wp_original_id int
);

create index idx_posts_slug on posts(slug);
create index idx_posts_status on posts(status);
create index idx_posts_published on posts(published_at desc);

-- Tags
create table tags (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  created_at timestamptz default now()
);

create index idx_tags_slug on tags(slug);

-- Post <-> Category junction
create table post_categories (
  post_id uuid references posts(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  primary key (post_id, category_id)
);

-- Post <-> Tag junction
create table post_tags (
  post_id uuid references posts(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

-- AI Prompts
create table ai_prompts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  prompt_text text not null,
  prompt_type text not null default 'article' check (prompt_type in ('article', 'pillar', 'interlinking', 'custom')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Products (Shop Shell)
create table products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  price numeric(10,2) not null default 0,
  image_url text,
  category text,
  in_stock boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_products_slug on products(slug);

-- Drip Publishing Settings
create table drip_settings (
  id uuid primary key default uuid_generate_v4(),
  posts_per_day int default 1,
  publish_time time default '09:00:00',
  timezone text default 'Asia/Jerusalem',
  is_active boolean default false,
  updated_at timestamptz default now()
);

-- Insert default drip settings
insert into drip_settings (posts_per_day, publish_time, timezone, is_active)
values (1, '09:00:00', 'Asia/Jerusalem', false);

-- Insert default AI prompts
insert into ai_prompts (name, description, prompt_text, prompt_type) values
(
  'Standard Article Generator',
  'Generates a comprehensive, beginner-friendly article on a Jewish topic',
  'You are an expert Jewish educator writing for howtobjewish.org, a beginner-friendly guide to Jewish life. Write a comprehensive, well-structured article about the following topic.

Requirements:
- Write in a warm, welcoming, judgment-free tone
- Target audience: people new to Judaism or exploring Jewish practice
- Include practical, actionable guidance where applicable
- Use H2 and H3 headings to organize the content
- Include relevant Hebrew terms with transliterations in parentheses
- Aim for 1500-2500 words
- Include a brief introduction and a conclusion
- Reference traditional Jewish sources (Torah, Talmud, Shulchan Aruch) where relevant
- Do NOT include any images or image placeholders

Topic: {{TOPIC}}',
  'article'
),
(
  'Pillar/Master Guide Generator',
  'Creates a hub article that links to and summarizes multiple existing spoke articles',
  'You are an expert Jewish educator writing a comprehensive master guide for howtobjewish.org. This is a "pillar" article that serves as a hub, linking to and summarizing multiple related articles on the site.

Requirements:
- Write a thorough overview (2000-3500 words) that covers the topic broadly
- For each subtopic, write 2-3 paragraphs summarizing the key points
- After each subtopic summary, include a natural link to the full article using the exact URLs provided
- Use H2 headings for major sections and H3 for subtopics
- Write in a warm, welcoming, judgment-free tone
- Include a table of contents at the top
- Begin with a compelling introduction and end with an encouraging conclusion

Topic: {{TOPIC}}

Existing articles to reference and link to:
{{ARTICLES}}',
  'pillar'
),
(
  'Internal Linking Analyzer',
  'Analyzes article text and embeds internal links to existing site content',
  'You are an SEO specialist for howtobjewish.org. Your task is to analyze the following article and add internal links to other articles on the site where relevant.

Rules:
- Only link to URLs from the provided list
- Use natural anchor text (2-5 words) - never use "click here"
- Add 3-8 internal links per article depending on length
- Do not link the same URL more than once
- Do not link to the article itself
- Preserve all existing HTML formatting
- Return the full article with the links embedded as <a href="...">anchor text</a>

Article to process:
{{ARTICLE_CONTENT}}

Available URLs and titles to link to:
{{URL_LIST}}',
  'interlinking'
);

-- Auto Blog Settings
create table auto_blog_settings (
  id uuid primary key default uuid_generate_v4(),
  is_active boolean default true,
  min_hours_between int default 20,
  max_hours_between int default 28,
  auto_publish boolean default true,
  last_generated_at timestamptz,
  next_generate_after timestamptz,
  last_topic_type text check (last_topic_type in ('festival', 'general')),
  updated_at timestamptz default now()
);

insert into auto_blog_settings (is_active, min_hours_between, max_hours_between, auto_publish)
values (true, 20, 28, true);

-- Row Level Security
alter table posts enable row level security;
alter table categories enable row level security;
alter table tags enable row level security;
alter table post_categories enable row level security;
alter table post_tags enable row level security;
alter table ai_prompts enable row level security;
alter table products enable row level security;
alter table drip_settings enable row level security;
alter table authors enable row level security;

-- Public read access for published content
create policy "Public can read published posts" on posts for select using (status = 'published');
create policy "Public can read categories" on categories for select using (true);
create policy "Public can read tags" on tags for select using (true);
create policy "Public can read post_categories" on post_categories for select using (true);
create policy "Public can read post_tags" on post_tags for select using (true);
create policy "Public can read products" on products for select using (true);
create policy "Public can read authors" on authors for select using (true);

-- Authenticated users (admin) can do everything
create policy "Admin full access posts" on posts for all using (auth.role() = 'authenticated');
create policy "Admin full access categories" on categories for all using (auth.role() = 'authenticated');
create policy "Admin full access tags" on tags for all using (auth.role() = 'authenticated');
create policy "Admin full access post_categories" on post_categories for all using (auth.role() = 'authenticated');
create policy "Admin full access post_tags" on post_tags for all using (auth.role() = 'authenticated');
create policy "Admin full access ai_prompts" on ai_prompts for all using (auth.role() = 'authenticated');
create policy "Admin full access products" on products for all using (auth.role() = 'authenticated');
create policy "Admin full access drip_settings" on drip_settings for all using (auth.role() = 'authenticated');
create policy "Admin full access authors" on authors for all using (auth.role() = 'authenticated');

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger posts_updated_at before update on posts for each row execute function update_updated_at();
create trigger ai_prompts_updated_at before update on ai_prompts for each row execute function update_updated_at();
create trigger products_updated_at before update on products for each row execute function update_updated_at();
create trigger drip_settings_updated_at before update on drip_settings for each row execute function update_updated_at();
