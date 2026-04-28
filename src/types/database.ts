export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      authors: {
        Row: {
          id: string
          name: string
          email: string | null
          bio: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          bio?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          bio?: string | null
          avatar_url?: string | null
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          parent_id: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          parent_id?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          parent_id?: string | null
          sort_order?: number
          created_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          title: string
          slug: string
          content: string
          excerpt: string | null
          featured_image: string | null
          author_id: string | null
          status: string
          published_at: string | null
          scheduled_at: string | null
          created_at: string
          updated_at: string
          meta_title: string | null
          meta_description: string | null
          is_pillar: boolean
          wp_original_id: number | null
        }
        Insert: {
          id?: string
          title: string
          slug: string
          content: string
          excerpt?: string | null
          featured_image?: string | null
          author_id?: string | null
          status?: 'draft' | 'queued' | 'published'
          published_at?: string | null
          scheduled_at?: string | null
          created_at?: string
          updated_at?: string
          meta_title?: string | null
          meta_description?: string | null
          is_pillar?: boolean
          wp_original_id?: number | null
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          content?: string
          excerpt?: string | null
          featured_image?: string | null
          author_id?: string | null
          status?: 'draft' | 'queued' | 'published'
          published_at?: string | null
          scheduled_at?: string | null
          created_at?: string
          updated_at?: string
          meta_title?: string | null
          meta_description?: string | null
          is_pillar?: boolean
          wp_original_id?: number | null
        }
      }
      tags: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
        }
      }
      post_categories: {
        Row: {
          post_id: string
          category_id: string
        }
        Insert: {
          post_id: string
          category_id: string
        }
        Update: {
          post_id?: string
          category_id?: string
        }
      }
      post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
      }
      ai_prompts: {
        Row: {
          id: string
          name: string
          description: string | null
          prompt_text: string
          prompt_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          prompt_text: string
          prompt_type?: 'article' | 'pillar' | 'interlinking' | 'custom'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          prompt_text?: string
          prompt_type?: 'article' | 'pillar' | 'interlinking' | 'custom'
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          price: number
          image_url: string | null
          category: string | null
          in_stock: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          price: number
          image_url?: string | null
          category?: string | null
          in_stock?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          price?: number
          image_url?: string | null
          category?: string | null
          in_stock?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      drip_settings: {
        Row: {
          id: string
          posts_per_day: number
          publish_time: string
          timezone: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          posts_per_day?: number
          publish_time?: string
          timezone?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          posts_per_day?: number
          publish_time?: string
          timezone?: string
          is_active?: boolean
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
