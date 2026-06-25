const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { URL } = require('node:url');

const DEFAULT_PORT = 8787;

function normalizeBaseUrl(baseUrl) {
  if (!baseUrl || typeof baseUrl !== 'string') {
    throw new Error('Base URL is required');
  }

  const parsed = new URL(baseUrl.trim());
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Base URL must start with http:// or https://');
  }

  return parsed.toString().replace(/\/$/, '');
}

function buildTestPayload(model, endpointType) {
  if (!model || typeof model !== 'string') {
    throw new Error('Model is required');
  }

  switch (endpointType) {
    case 'codex_responses':
      return {
        path: '/v1/responses',
        body: {
          model,
          input: 'hi',
          max_output_tokens: 16,
        },
      };
    case 'chat_completions':
      return {
        path: '/v1/chat/completions',
        body: {
          model,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 16,
        },
      };
    case 'anthropic':
      return {
        path: '/v1/messages',
        body: {
          model,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 16,
        },
      };
    default:
      throw new Error(`Unsupported endpoint type: ${endpointType}`);
  }
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        request.destroy(new Error('Request body is too large'));
      }
    });
    request.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Request body must be valid JSON'));
      }
    });
    request.on('error', reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(text);
}

function requireAuthConfig(payload) {
  const baseUrl = normalizeBaseUrl(payload.baseUrl);
  const apiKey = typeof payload.apiKey === 'string' ? payload.apiKey.trim() : '';

  if (!apiKey) {
    throw new Error('API Key is required');
  }

  return { baseUrl, apiKey };
}

async function forwardJson({ baseUrl, apiKey, method, targetPath, body }) {
  const upstream = await fetch(`${baseUrl}${targetPath}`, {
    method,
    headers: {
      authorization: `Bearer ${apiKey}`,
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const responseText = await upstream.text();
  const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';

  return {
    statusCode: upstream.status,
    contentType,
    responseText,
  };
}

function relayUpstream(response, upstreamResult) {
  response.writeHead(upstreamResult.statusCode, {
    'content-type': upstreamResult.contentType,
    'cache-control': 'no-store',
  });
  response.end(upstreamResult.responseText);
}

async function handleApiModels(request, response) {
  if (request.method !== 'POST') {
    sendText(response, 405, 'Method Not Allowed');
    return;
  }

  try {
    const payload = await readJson(request);
    const config = requireAuthConfig(payload);
    const upstream = await forwardJson({
      ...config,
      method: 'GET',
      targetPath: '/v1/models',
    });
    relayUpstream(response, upstream);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
  }
}

async function handleApiTest(request, response) {
  if (request.method !== 'POST') {
    sendText(response, 405, 'Method Not Allowed');
    return;
  }

  try {
    const payload = await readJson(request);
    const config = requireAuthConfig(payload);
    const { path: targetPath, body } = buildTestPayload(payload.model, payload.endpointType);
    const upstream = await forwardJson({
      ...config,
      method: 'POST',
      targetPath,
      body,
    });
    relayUpstream(response, upstream);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
  }
}

function serveHtml(response, rootDir) {
  const filePath = path.join(rootDir, 'model-tester.html');
  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendText(response, 500, `Unable to read model-tester.html: ${error.message}`);
      return;
    }

    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    });
    response.end(data);
  });
}

function createAppServer(options = {}) {
  const rootDir = options.rootDir || __dirname;

  return http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, 'http://127.0.0.1');

    if (requestUrl.pathname === '/' || requestUrl.pathname === '/model-tester.html') {
      serveHtml(response, rootDir);
      return;
    }

    if (requestUrl.pathname === '/api/models') {
      await handleApiModels(request, response);
      return;
    }

    if (requestUrl.pathname === '/api/test') {
      await handleApiTest(request, response);
      return;
    }

    sendText(response, 404, 'Not Found');
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || DEFAULT_PORT);
  const server = createAppServer();

  server.listen(port, '127.0.0.1', () => {
    console.log(`RelayProbe: http://127.0.0.1:${port}`);
  });
}

module.exports = {
  buildTestPayload,
  createAppServer,
  normalizeBaseUrl,
};
