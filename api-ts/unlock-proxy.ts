import { URL } from 'url';

const CORS_HEADERS = {
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

function buildProxyUrl(target: string): string {
  return `/api/unlock-proxy?url=${encodeURIComponent(target)}`;
}

export { buildProxyUrl };
export { ALLOWED_UNLOCK_HOSTS };

export default async function handler(req: any, res: any) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url: targetUrlStr } = req.query;
  if (!targetUrlStr) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const targetUrl = new URL(targetUrlStr);
    const hostname = targetUrl.hostname;

    const isAllowed = ALLOWED_UNLOCK_HOSTS.some(
      (h) => hostname === h || hostname.endsWith('.' + h)
    );
    if (!isAllowed) {
      return res.status(403).json({ error: 'Forbidden: Domain not allowed' });
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

    const fetchOptions: RequestInit = {
      method: req.method || 'GET',
      headers,
    };

    const response = await fetch(targetUrl.toString(), fetchOptions);
    const contentType = response.headers.get('content-type') || '';
    res.setHeader('Content-Type', contentType);

    if (contentType.includes('application/json')) {
      const json = await response.json();
      return res.status(response.status).json(json);
    } else {
      const text = await response.text();
      return res.status(response.status).send(text);
    }
  } catch (error) {
    console.error('Unlock proxy request failed:', error);
    return res.status(500).json({ error: 'Unlock proxy failed', details: String(error) });
  }
}
