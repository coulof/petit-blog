import sanitizeHtml from 'sanitize-html';

export interface Post {
  id: number;
  slug: string;
  title: string;
  content_html: string;
  created_at: number;
}

// Whitelist stricte: Trix ne produit pas plus que ça
export function cleanHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: [
      'h1', 'h2', 'p', 'strong', 'em', 'del',
      'ul', 'ol', 'li', 'a', 'blockquote', 'br',
      'pre', 'code', 'div'
    ],
    allowedAttributes: {
      a: ['href', 'title'],
      div: []
    },
    allowedSchemes: ['http', 'https', 'mailto']
  });
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // enlève accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'sans-titre';
}

export async function listPosts(db: D1Database): Promise<Post[]> {
  const { results } = await db
    .prepare('SELECT * FROM posts ORDER BY created_at DESC')
    .all<Post>();
  return results;
}

export async function getPost(db: D1Database, slug: string): Promise<Post | null> {
  return await db
    .prepare('SELECT * FROM posts WHERE slug = ?')
    .bind(slug)
    .first<Post>();
}

export async function createPost(
  db: D1Database,
  title: string,
  contentHtml: string
): Promise<Post> {
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let n = 1;
  // gère les collisions de slug
  while (await getPost(db, slug)) {
    n++;
    slug = `${baseSlug}-${n}`;
  }
  const created_at = Date.now();
  const cleaned = cleanHtml(contentHtml);
  const { meta } = await db
    .prepare('INSERT INTO posts (slug, title, content_html, created_at) VALUES (?, ?, ?, ?)')
    .bind(slug, title, cleaned, created_at)
    .run();
  return {
    id: meta.last_row_id as number,
    slug, title, content_html: cleaned, created_at
  };
}

export async function deletePost(db: D1Database, id: number): Promise<void> {
  await db.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
}

// Auth: cookie signé avec l'AUTH_KEY. Simple et robuste.
export function checkAuth(request: Request, authKey: string): boolean {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/petit_blog_auth=([^;]+)/);
  return match?.[1] === authKey;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}
