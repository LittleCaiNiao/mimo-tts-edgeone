# MiMo TTS for Legado (EdgeOne 版)

小米 MiMo TTS 语音合成服务，部署在腾讯云 EdgeOne，支持 legado 阅读 App 一键导入。

## 部署步骤

### 1. 获取小米 MiMo API Key

前往 [mimo.xiaomi.com](https://mimo.xiaomi.com) 注册并获取 API Key。

### 2. 部署到 EdgeOne Pages

#### 方式一：Git 部署（推荐）

1. 将本项目推送到你的 GitHub/Gitee 仓库
2. 登录 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone)
3. 创建 Pages 项目 → 关联 Git 仓库
4. 构建设置：
   - **构建命令**：留空（无需构建）
   - **输出目录**：`/`（根目录）
5. 部署完成，获取分配的域名

#### 方式二：直接上传

1. 登录 EdgeOne 控制台
2. 创建 Pages 项目 → 直接上传
3. 上传整个 `mimo-tts-edgeone` 文件夹
4. 部署完成

### 3. 配置自定义域名（可选）

在 EdgeOne Pages 项目设置中绑定你自己的域名。

### 4. 导入到 Legado

1. 打开部署好的网站
2. 输入 MiMo API Key
3. 选择音色
4. 点击「直接导入」或「扫码导入」

## 文件结构

```
mimo-tts-edgeone/
├── edgeone.json          # EdgeOne Pages 配置（路由规则）
├── functions/
│   └── index.js          # Edge Function（核心逻辑）
└── README.md
```

## 支持功能

- 🎤 V2.5 内置 8 种音色
- 🎨 VoiceDesign 文本描述定制音色
- 🔊 VoiceClone 音频克隆音色
- 风格控制（开心、悲伤、东北话、粤语、唱歌等）
- 在线试听
- legado 一键导入 / 扫码导入
