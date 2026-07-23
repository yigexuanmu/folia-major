const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const ALLOWED_UNLOCK_HOSTS = [
  'music-api.gdstudio.xyz',
  'search.kuwo.cn',
  'mobi.kuwo.cn',
  'bd-api.kuwo.cn',
];

export async function handleUnlockProxy(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);
  const targetUrlStr = url.searchParams.get('url');
  if (!targetUrlStr) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const targetUrl = new URL(targetUrlStr);
    const hostname = targetUrl.hostname;

    const isAllowed = ALLOWED_UNLOCK_HOSTS.some(
      (h) => hostname === h || hostname.endsWith('.' + h)
    );
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Forbidden: Domain not allowed' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers: Record<string, string> = {};
    if (hostname === 'bd-api.kuwo.cn') {
      headers['user-agent'] = 'Dart/2.19 (dart:io)';
      headers['plat'] = 'ar';
      headers['channel'] = 'aliopen';
      headers['devid'] = String(Math.floor(Math.random() * 100000000000));
      headers['ver'] = '3.9.0';
      headers['X-Forwarded-For'] = '1.0.1.114';
    } else if (hostname === 'mobi.kuwo.cn') {
      headers['User-Agent'] = 'okhttp/3.10.0';
    } else if (hostname === 'search.kuwo.cn') {
      headers['User-Agent'] = 'Mozilla/5.0';
    }

    const response = await fetch(targetUrl.toString(), { headers });
    const contentType = response.headers.get('content-type') || '';
    const responseHeaders: Record<string, string> = { ...corsHeaders, 'Content-Type': contentType };
    const body = contentType.includes('application/json')
      ? JSON.stringify(await response.json())
      : await response.text();

    return new Response(body, { status: response.status, headers: responseHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Unlock proxy failed', details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
