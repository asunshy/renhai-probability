# 人海相遇概率数据路线图

## 数据优先级

1. 官方统计：国家统计局、国家数据、人口普查、统计年鉴、人社部公开薪酬资料。
2. 行业报告：招聘平台薪酬报告、城市研究报告、健康生活方式公开研究。
3. 模型估算：身高、性格、运动习惯、通勤偏好等缺少稳定官方交叉数据的维度。

## 当前已接入维度

- 基础人口：地区、性别、年龄。
- 教育就业：学历、职业、月收入。
- 生活习惯：吸烟、饮酒、运动习惯。
- 生活习惯细分：吸烟和饮酒按性别、20-39 岁年龄段做条件修正。
- 趣味画像：性格、身高。
- 城市生活：居住资产、通勤距离。
- 城市青年：重点城市青年活跃度、人才密度较高等趋势估算。
- 就业解释：重点城市行业薪资四分位和中位数，用于结果页就业行情参考。

## 后续可扩展维度

- 城市：房租收入比、就业景气度、产业结构、青年人口净流入。
- 职业：行业薪资分位、岗位增长率、加班强度、远程办公比例。
- 生活：睡眠、健身、宠物、做饭频率、消费偏好。
- 关系观：婚育意愿、异地接受度、家庭距离、长期规划。

## 数据接入流程

1. 在 `data/seed/catalog.json` 为每个新来源补充 `id`、标题、年份、可信等级、优先级、刷新频率和链接。
2. 为每个新维度指定来源，不允许没有来源的维度进入计算。
3. 有地区交叉数据时使用 `regionRates`；没有交叉数据时使用 `defaultRate` 并降低可信度。
4. 更新 `tests/probability.test.js`，确保新增维度参与计算且来源可追踪。
5. 运行 `npm run export:web-data` 刷新网页原型数据。

## 当前数据资产

- `data/seed/catalog.json`：长期维护的数据源、地区、维度、默认比例、地区交叉比例。
- `data/raw/province-demographics-2020.csv`：第七次人口普查省级人口、性别、年龄、学历导入表。
- `data/raw/region-labor-salary-2024.csv`：重点地区职业结构与薪资区间导入表，当前按行业报告等级使用。
- `data/raw/region-housing-commute-2024.csv`：重点地区住房状态与通勤生活圈导入表，当前按行业报告等级使用。
- `data/raw/region-job-market-2024.csv`：重点地区就业行情热度导入表，当前按行业报告等级使用。
- `data/raw/city-youth-inflow-2024.csv`：重点城市常住人口、青年活跃和人才密度估算导入表，当前按行业报告等级使用。
- `data/raw/industry-salary-benchmark-2024.csv`：重点城市行业薪资分位导入表，用于就业行情解释，不直接作为概率筛选比例。
- `data/raw/lifestyle-gender-age-2024.csv`：吸烟饮酒性别和年龄段修正表，用于生活方式筛选细分。
- `data/raw/source-candidates.json`：下一批公开数据源候选库，记录来源链接、可信等级、候选维度、导入优先级和下一步动作。
- `data/raw/datasets.json`：原始数据集清单，记录导入命令、覆盖维度、数据等级和原始文件路径。
- `web-preview/data/seed.json`：由脚本生成的网页预览数据，不作为人工维护源。
- `cloudfunctions/calculateProbability/lib/probability.js`：概率模型和摘要接口，当前已直接读取 `data/seed/catalog.json`。

## 常用数据命令

- `npm run import:province-demographics`：把 `data/raw/province-demographics-2020.csv` 导入 `data/seed/catalog.json`。
- `npm run import:region-labor-salary`：把重点地区职业/薪资比例导入 `data/seed/catalog.json`。
- `npm run import:region-housing-commute`：把重点地区住房/通勤比例导入 `data/seed/catalog.json`。
- `npm run import:region-job-market`：把重点地区就业行情比例导入 `data/seed/catalog.json`。
- `npm run import:city-youth-inflow`：把重点城市青年活跃和人才密度估算导入 `data/seed/catalog.json`。
- `npm run import:industry-salary-benchmark`：把重点城市行业薪资四分位导入 `data/seed/catalog.json` 的 `benchmarks`。
- `npm run import:lifestyle-gender-age`：把吸烟饮酒按性别和年龄段的修正比例导入 `data/seed/catalog.json`。
- `npm run export:web-data`：把当前 catalog 和样例结果导出到网页原型。
- `npm test`：验证数据来源、概率模型、地区覆盖、导入器和网页数据基础能力。

## 重要口径

本项目输出的是公开数据下的估算，不是对真实个体的判断。任何缺少官方交叉分布的数据都必须标注为行业报告或模型估算。

## 采集任务板

`data/raw/collection-backlog.json` 记录下一批公开数据采集任务，字段包括：

- `status`：`seeded`、`ready_to_import`、`researching`、`blocked_by_source`。
- `qualityTarget`：目标可信等级，必须是 `官方统计`、`行业报告` 或 `模型估算`。
- `sourceCandidates`：候选来源 ID，对应 `data/raw/source-candidates.json` 或 `data/seed/catalog.json` 中的来源。
- `dimensions`：采集完成后会影响的筛选维度或解释维度。
- `nextAction`：下一次人工或脚本采集时的具体动作。

新增数据的推荐顺序：

1. 先把目标写入 `collection-backlog.json`，明确来源、质量等级和目标形态。
2. 找到公开数据后，落到 `data/raw/`，并在 `data/raw/datasets.json` 登记。
3. 编写或复用 `scripts/import-*.js`，把原始数据导入 `data/seed/catalog.json`。
4. 补充 `tests/`，保证来源、年份、可信等级、覆盖范围不会丢失。
5. 运行 `npm run export:web-data`，刷新网页预览的数据包。
