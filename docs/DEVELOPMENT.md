# Development Guide

## 本地开发

启动服务：

```bash
npm start
```

服务启动后访问：

```text
http://127.0.0.1:8787
```

指定端口：

```bash
PORT=3000 npm start
```

## 测试

运行全部测试：

```bash
npm test
```

当前测试覆盖：

- `/api/models` 是否正确代理到 `/v1/models`
- `/api/test` 是否为三类端点生成正确请求体
- 未知 `endpointType` 是否会被拒绝

## 发布前检查

发布到 GitHub 前建议确认：

- `npm test` 通过。
- README 中的仓库地址已经替换为真实地址。
- 截图没有泄露真实 API Key 或私有中转站地址。
- `LICENSE` 中的版权主体符合你的发布需求。
- `.claude/settings.local.json` 等本地配置没有被提交。

## 代码风格

- 服务端使用 Node.js 内置模块，避免不必要依赖。
- 前端保持为单文件应用，无构建步骤。
- 新增代理行为时，需要同时补充 `server.test.js`。
- 用户输入和上游响应展示时需要避免直接插入未转义 HTML。
