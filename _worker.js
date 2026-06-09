export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path = url.pathname;

    // Default to index.html
    if (path === '/' || path === '') {
      path = '/index.html';
    }

    // Serve the file from the static assets
    const response = await env.ASSETS.fetch(new Request(new URL(path, request.url), request));

    // If not found, return 404
    if (response.status === 404) {
      return new Response('Not found', { status: 404 });
    }

    return response;
  }
};
