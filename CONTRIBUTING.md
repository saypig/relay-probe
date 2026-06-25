# Contributing

感谢你愿意改进这个项目。

## 开发流程

1. Fork 本仓库。
2. 创建功能分支：

```bash
git checkout -b feature/your-change
```

3. 修改代码并运行测试：

```bash
npm test
```

4. 提交 Pull Request，并说明改动内容、测试结果和相关 Issue。

## Pull Request 要求

- 保持改动聚焦，避免把无关格式化和功能改动混在一起。
- 如果修改代理请求、端点类型或错误处理，请补充测试。
- 如果修改用户可见行为，请同步更新 README 或 `docs/` 下的文档。
- 不要提交真实 API Key、私有中转站地址或敏感截图。

## Issue 建议

提交 Bug 时请尽量包含：

- 复现步骤
- 期望结果
- 实际结果
- Node.js 版本
- 操作系统和浏览器
- 脱敏后的上游响应示例
