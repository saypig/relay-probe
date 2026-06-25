const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

const { createAppServer, buildTestPayload } = require('./server');

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve(`http://127.0.0.1:${port}`);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

async function withUpstream(handler, run) {
  const upstream = http.createServer(handler);
  const baseUrl = await listen(upstream);
  try {
    await run(baseUrl);
  } finally {
    await close(upstream);
  }
}

async function withApp(run) {
  const app = createAppServer();
  const appUrl = await listen(app);
  try {
    await run(appUrl);
  } finally {
    await close(app);
  }
}

test('POST /api/models proxies GET /v1/models with bearer auth', async () => {
  await withUpstream(async (request, response) => {
    assert.equal(request.method, 'GET');
    assert.equal(request.url, '/v1/models');
    assert.equal(request.headers.authorization, 'Bearer test-key');

    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ data: [{ id: 'gpt-test', owned_by: 'relay' }] }));
  }, async (baseUrl) => {
    await withApp(async (appUrl) => {
      const response = await fetch(`${appUrl}/api/models`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ baseUrl, apiKey: 'test-key' }),
      });

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        data: [{ id: 'gpt-test', owned_by: 'relay' }],
      });
    });
  });
});

test('POST /api/test builds codex responses request', async () => {
  await withUpstream(async (request, response) => {
    assert.equal(request.method, 'POST');
    assert.equal(request.url, '/v1/responses');
    assert.equal(request.headers.authorization, 'Bearer test-key');
    assert.deepEqual(JSON.parse(await readBody(request)), {
      model: 'gpt-test',
      input: 'hi',
      max_output_tokens: 16,
    });

    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ output_text: 'hello' }));
  }, async (baseUrl) => {
    await withApp(async (appUrl) => {
      const response = await fetch(`${appUrl}/api/test`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          baseUrl,
          apiKey: 'test-key',
          model: 'gpt-test',
          endpointType: 'codex_responses',
        }),
      });

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { output_text: 'hello' });
    });
  });
});

test('POST /api/test builds chat completions request', async () => {
  await withUpstream(async (request, response) => {
    assert.equal(request.method, 'POST');
    assert.equal(request.url, '/v1/chat/completions');
    assert.deepEqual(JSON.parse(await readBody(request)), {
      model: 'gpt-test',
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 16,
    });

    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ choices: [{ message: { content: 'hello' } }] }));
  }, async (baseUrl) => {
    await withApp(async (appUrl) => {
      const response = await fetch(`${appUrl}/api/test`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          baseUrl,
          apiKey: 'test-key',
          model: 'gpt-test',
          endpointType: 'chat_completions',
        }),
      });

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        choices: [{ message: { content: 'hello' } }],
      });
    });
  });
});

test('POST /api/test builds anthropic messages request', async () => {
  await withUpstream(async (request, response) => {
    assert.equal(request.method, 'POST');
    assert.equal(request.url, '/v1/messages');
    assert.deepEqual(JSON.parse(await readBody(request)), {
      model: 'claude-test',
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 16,
    });

    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ content: [{ type: 'text', text: 'hello' }] }));
  }, async (baseUrl) => {
    await withApp(async (appUrl) => {
      const response = await fetch(`${appUrl}/api/test`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          baseUrl,
          apiKey: 'test-key',
          model: 'claude-test',
          endpointType: 'anthropic',
        }),
      });

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        content: [{ type: 'text', text: 'hello' }],
      });
    });
  });
});

test('buildTestPayload rejects unknown endpoint types', () => {
  assert.throws(
    () => buildTestPayload('gpt-test', 'unknown'),
    /Unsupported endpoint type/,
  );
});
