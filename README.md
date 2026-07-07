# 人海相遇概率

一个无社交、无登录、无用户池的微信小程序 MVP：用户选择地区、年龄、学历、职业、薪资、生活方式等条件后，看到公开数据口径下的满足人数估算、概率、稀缺条件、放宽建议、幽默评价和数据来源。

## 当前内容

- 微信小程序页面：`miniprogram/`
- 云函数概率模型：`cloudfunctions/`
- 网页预览原型：`web-preview/`
- 原始数据与候选数据源：`data/raw/`
- 长期维护数据资产：`data/seed/catalog.json`
- 导入脚本：`scripts/`
- 自动化测试：`tests/`

## 本地验证

```powershell
& 'C:\Users\zhang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test tests/*.test.js
```

## 数据原则

- 只使用公开聚合数据，不采集个人信息。
- 每个维度必须标记数据等级：`官方统计`、`行业报告`、`模型估算`。
- 缺少交叉口径时使用可解释估算，并在结果页降低可信度。

## 网页预览

本地静态预览位于 `web-preview/index.html`，数据由 `scripts/export-web-data.js` 生成。
