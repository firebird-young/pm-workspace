export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  
  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(context);
  }
  
  return next();
}

async function handleApiRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  const apiUrl = `https://pm-workspace.yanggoku12.workers.dev${url.pathname}${url.search}`;
  
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('host');
  requestHeaders.delete('origin');
  
  const apiRequest = new Request(apiUrl, {
    method: request.method,
    headers: requestHeaders,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.blob() : undefined,
    redirect: 'follow'
  });
  
  const response = await fetch(apiRequest);
  
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders
  });
}
