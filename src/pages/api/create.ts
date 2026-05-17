import type { APIRoute } from 'astro';
import { checkAuth, createPost } from '../../lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  if (!checkAuth(request, env.AUTH_KEY)) {
    return new Response('Unauthorized', { status: 401 });
  }
  try {
    const { title, content } = await request.json();
    if (typeof title !== 'string' || typeof content !== 'string'
        || !title.trim() || !content.trim()) {
      return new Response('Bad request', { status: 400 });
    }
    const post = await createPost(env.DB, title.trim().slice(0, 200), content);
    return new Response(JSON.stringify({ slug: post.slug }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
};
