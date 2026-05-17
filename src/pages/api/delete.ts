import type { APIRoute } from 'astro';
import { checkAuth, deletePost } from '../../lib/db';

export const POST: APIRoute = async ({ request, url, locals, redirect }) => {
  const env = locals.runtime.env;
  if (!checkAuth(request, env.AUTH_KEY)) {
    return new Response('Unauthorized', { status: 401 });
  }
  const id = Number(url.searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return new Response('Bad request', { status: 400 });
  }
  await deletePost(env.DB, id);
  return redirect('/admin', 303);
};
