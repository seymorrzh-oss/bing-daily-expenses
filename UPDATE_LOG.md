# bing-daily-expenses · V1.1.0

Commit message:
`feat: add purpose tracking, taxi service levels and calculator`

## 本版变更

- Stop carrying merchant values into new transactions：新建快速记、补记、批量记录时商家为空；recent 仅保留类型、分类、打车平台与支付方式。
- Add purpose as a first-class transaction field：用途独立于商家，录入位置与二级分类同等重要。
- Add searchable purpose history：用途按一级分类保存输入联想，不自动变成固定按钮。
- Add 10-use prompt before promoting purposes to quick options：同分类同用途累计成功记账 10 次后询问，用户明确添加后才成为快捷用途；暂不后不重复提示。编辑及尚未确认的 OCR 不增加次数。
- Add optional calculator mode：支持加减乘除、括号、乘除中文符号；默认仍直接输入金额。点击使用结果后回填，并保存 amountExpression。
- Add structured third-level taxi service classification：上班打车、下班打车、周末出行、其他打车显示平台；其他交通不显示。
- Restore Didi, Huaxiaozhu, Baidu Maps and Amap taxi options：滴滴打车、花小猪、百度地图、高德打车、其他平台作为 service 结构化保存，不占用 merchant。
- Add weekend travel taxi category：交通新增周末出行。
- Add taxi service statistics：交通 → 二级用途 → service 显示笔数和金额。
- Add purpose/service search：明细搜索覆盖用途、平台、商家、备注、二级分类、支付方式、旅行标签。
- 首页 / 明细标题优先级为 purpose → service → merchant → subcategory。
- Preserve compatibility with existing V1 records：继续使用 bing-daily-expenses-v1；旧记录可缺少 purpose、service、amountExpression。
- 保留快速记、补记、批量补、OCR 待确认、支出收入、周月年统计、明细编辑删除、JSON 备份、旅行标签。
- JSON 备份包含用途历史、计数和用户批准的快捷选项；导入合并同名历史取较大计数，不重复累加。

## 本次同步的文件

- index.html：对齐当前 app.js 所需入口及 ID；保留中文移动端底部导航；静态资源加 V1.1.0 版本标记。
- style.css：同步用途区域、打车平台按钮、计算器、交易标题、平台三级统计；保留米白与绿色配色，改善小屏换行及可点击区域。
- UPDATE_LOG.md：本文件。
- app.js：以用户手动更新版本为基础，仅修复必要问题，没有更换框架或重构页面。

## app.js 必要修复

1. 每个表单的用途联想列表使用独立 ID，避免批量记录引用其他行的分类历史。
2. 保存时检查计算式与实际金额一致；手动改变金额后不保留不匹配的旧计算式。
3. 计算器改为四则运算解析，不执行输入代码；使用精确分数计算后四舍五入到分，修复 1.005 等小数舍入及额外运算符问题。
4. 用途历史校验及特殊名称保护，避免损坏历史或 __proto__ / constructor 名称造成错误。
5. 导出 / 导入包含用途历史和快捷选择。

## 基本检查结果

- JavaScript 语法检查通过。
- 隔离的手机尺寸 Chrome 浏览器检查通过：HTML / CSS / JS 加载、快速保存、商家留空、用途显示、四种打车二级的平台选择、非打车隐藏平台、service 保存、平台三级统计、purpose/service 搜索、计算回填与原式保存、批量保存、OCR 文字解析进入待确认、V1 旧数据加载与编辑。
- 390px 宽屏幕无横向溢出；上述流程无页面脚本错误。
- 规则检查通过：10 次后明确添加、一组用途只询问一次、分类独立计数、特殊用途名称、损坏历史过滤、不一致计算式清除。
- 测试使用临时独立浏览器环境，没有读取或清空用户日常浏览器的 localStorage。
- 真实截图的联网 OCR 模型加载未测试；文字解析与待确认流程已测试。

## 上传与部署

请将 index.html、style.css、app.js、UPDATE_LOG.md 四个文件放在 GitHub 仓库原有位置，完整替换旧文件。不要只上传三个配套文件：本次 app.js 有上述必要修复。无需 npm、框架、构建或 API 密钥。

GitHub Pages 已启用时，提交后等待自动部署即可。首次启用：Settings → Pages → Deploy from a branch，选择 main 分支和根目录。保持原网站地址、浏览器和存储位置，旧账继续保留。

## 数据提醒

localStorage 按网站域名、浏览器和设备隔离，不自动同步；建议替换前导出一次备份。旅行是 travelTag，不是消费分类；同一记录只计一次支出。交通卡充值归生活缴费，后续刷卡不重复记账。OCR 图片只在页面临时预览，识别结果必须确认后才入账。
