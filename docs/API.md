# API Reference

本地服务由 `server.js` 提供，默认监听 `http://127.0.0.1:8787`。

## `POST /api/models`

获取上游中转站模型列表。

### 请求体

```json
{
  "baseUrl": "https://api.example.com",
  "apiKey": "sk-..."
}
```

### 转发行为

服务会向上游发送：

```http
GET /v1/models
Authorization: Bearer sk-...
Accept: application/json
```

### 响应

本地服务会原样透传上游响应状态码、`content-type` 和响应体。

## `POST /api/test`

对单个模型发送最小测试请求。

### 请求体

```json
{
  "baseUrl": "https://api.example.com",
  "apiKey": "sk-...",
  "model": "gpt-test",
  "endpointType": "chat_completions"
}
```

### `endpointType`

| 类型 | 上游路径 | 请求体 |
| --- | --- | --- |
| `codex_responses` | `/v1/responses` | `{ "model": "...", "input": "hi", "max_output_tokens": 16 }` |
| `chat_completions` | `/v1/chat/completions` | `{ "model": "...", "messages": [{ "role": "user", "content": "hi" }], "max_tokens": 16 }` |
| `anthropic` | `/v1/messages` | `{ "model": "...", "messages": [{ "role": "user", "content": "hi" }], "max_tokens": 16 }` |

### 响应

本地服务会原样透传上游响应状态码、`content-type` 和响应体。

## 错误响应

当本地请求参数不合法时，服务返回 `400`：

```json
{
  "error": "API Key is required"
}
```

常见错误：

- `Base URL is required`
- `Base URL must start with http:// or https://`
- `API Key is required`
- `Model is required`
- `Unsupported endpoint type: ...`

## 限制

- 请求体大小限制为 1 MB。
- 本地服务只暴露 `GET /`、`GET /model-tester.html`、`POST /api/models` 和 `POST /api/test`。
- 代理请求使用 Bearer Token 鉴权，不支持自定义鉴权头。
