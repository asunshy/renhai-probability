# GitHub 发布说明

当前项目已经是本地 Git 仓库，但还没有配置远程仓库。

## 当前阻塞

- 本机没有安装 GitHub CLI：`gh --version` 不可用。
- 当前仓库没有 `origin` 远程地址。
- 当前会话没有可直接创建新 GitHub 仓库的工具能力。

## 你需要做的事

1. 在 GitHub 新建一个空仓库，例如 `renhai-probability-miniprogram`。
2. 把仓库地址发给我，例如 `https://github.com/<owner>/renhai-probability-miniprogram.git`。
3. 如果你想让我直接 push，需要本机安装并登录 GitHub CLI：
   - 安装 `gh`
   - 运行 `gh auth login`

## 我拿到仓库地址后会执行

```powershell
git remote add origin https://github.com/<owner>/renhai-probability-miniprogram.git
git push -u origin main
```

## 已准备发布的内容

- 微信小程序 MVP 目录
- 云函数概率模型
- 网页预览原型
- 原始数据 CSV
- 数据源候选库：`data/raw/source-candidates.json`
- 数据导入脚本与测试
- 数据路线图与发布说明
