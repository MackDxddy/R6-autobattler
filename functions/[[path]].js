// Only runs for the paths listed in public/_routes.json: files that must never be public.
// (An early build published the whole repo; Cloudflare keeps old files for a week. This blocks them.)
export const onRequest = () => new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
