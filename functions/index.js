/**
 * MiMo TTS for Legado - EdgeOne Edge Function
 * 小米 MiMo TTS 语音合成服务，支持 legado 阅读 App 一键导入
 */

// 音色列表
const VOICES = {
  "冰糖": "冰糖-活泼女声",
  "mimo_default": "MiMo-默认",
  "茉莉": "茉莉-温柔女声",
  "苏打": "苏打-清新男声",
  "白桦": "白桦-知性男声",
  "Mia": "Mia-英文女声",
  "Chloe": "Chloe-英文女声",
  "Milo": "Milo-英文男声",
  "Dean": "Dean-英文男声",
  "default_zh": "MiMo-中文女声",
  "default_en": "MiMo-英文女声",
};

// 模型列表
const TTS_MODELS = {
  "v2.5": "mimo-v2.5-tts",
  "v2.5_clone": "mimo-v2.5-tts-voiceclone",
  "v2.5_design": "mimo-v2.5-tts-voicedesign",
  "v2": "mimo-v2-tts",
};

// EdgeOne Edge Function handler
// 标准 EdgeOne Pages 格式：export default { async fetch(request) { ... } }
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 路由
    if (path === "/") {
      return handleIndex(request);
    }
    if (path === "/tts") {
      return handleTTS(request);
    }
    if (path === "/api/legado-import") {
      return handleLegadoImport(request);
    }
    if (path === "/favicon.ico") {
      return new Response(null, { status: 204 });
    }
    return new Response("Not Found", { status: 404 });
  },
};

// ==================== TTS 接口 ====================
async function handleTTS(request) {
  let api_key, text, voice, model, audio_b64;

  if (request.method === "POST") {
    const body = await request.json();
    api_key = body.api_key || "";
    text = body.text || "";
    voice = body.voice || "冰糖";
    model = body.model || "v2.5";
    audio_b64 = body.audio || "";
  } else {
    const url = new URL(request.url);
    const p = url.searchParams;
    api_key = p.get("api_key") || "";
    text = p.get("text") || "";
    voice = p.get("voice") || "冰糖";
    model = p.get("model") || "v2.5";
    audio_b64 = p.get("audio") || "";
    text = decodeURIComponent(decodeURIComponent(text));
    audio_b64 = decodeURIComponent(decodeURIComponent(audio_b64));
  }

  if (!api_key) {
    return new Response("缺少 api_key", { status: 400 });
  }
  if (!text) {
    return new Response("缺少 text", { status: 400 });
  }

  const model_name = TTS_MODELS[model] || TTS_MODELS["v2.5"];

  try {
    // 构建 MiMo API 请求
    let messages, audioConfig;

    if (model === "v2.5_clone" && audio_b64) {
      // VoiceClone
      messages = [{ role: "assistant", content: text }];
      audioConfig = { format: "wav", voice: `data:audio/mpeg;base64,${audio_b64}` };
    } else if (model === "v2.5_design") {
      // VoiceDesign: voice 是音色描述
      messages = [
        { role: "user", content: voice },
        { role: "assistant", content: text },
      ];
      audioConfig = { format: "mp3" };
    } else {
      // 内置音色 / v2
      messages = [{ role: "assistant", content: text }];
      audioConfig = { format: "mp3", voice: voice };
    }

    const mimoResp = await fetch("https://api.xiaomimimo.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${api_key}`,
      },
      body: JSON.stringify({
        model: model_name,
        messages: messages,
        audio: audioConfig,
        stream: false,
      }),
    });

    if (!mimoResp.ok) {
      const errText = await mimoResp.text();
      console.error("MiMo API error:", mimoResp.status, errText);
      return new Response(`上游API错误: ${mimoResp.status}`, { status: 502 });
    }

    const result = await mimoResp.json();
    const audioData = result.choices?.[0]?.message?.audio?.data;

    if (!audioData) {
      return new Response("API 返回无音频数据", { status: 502 });
    }

    const audioBytes = Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0));
    const mediaType = model === "v2.5_clone" ? "audio/wav" : "audio/mpeg";

    return new Response(audioBytes, {
      status: 200,
      headers: {
        "Content-Type": mediaType,
        "Content-Length": String(audioBytes.length),
        "Cache-Control": "max-age=3600",
      },
    });
  } catch (e) {
    console.error("TTS Error:", e.message);
    return new Response(`TTS 错误: ${e.message}`, { status: 500 });
  }
}

// ==================== Legado 导入配置 ====================
function handleLegadoImport(request) {
  const url = new URL(request.url);
  const p = url.searchParams;
  const api_key = p.get("api_key") || "";
  const voice = p.get("voice") || "冰糖";
  const model = p.get("model") || "v2.5";
  const v_name = VOICES[voice] || `音色(${voice})`;

  // 基础 URL（去掉查询参数）
  const base_url = `${url.protocol}//${url.host}`;
  const safeKey = encodeURIComponent(api_key);

  const tts_url = `${base_url}/tts?api_key=${safeKey}&voice=${voice}&model=${model}&volume=100&pitch=0&rate={{(speakSpeed - 10) * 2}}&text={{java.encodeURI(speakText)}}`;

  const config = [
    {
      name: `小米 - ${v_name}`,
      url: tts_url,
      contentType: "audio/mpeg",
      id: Date.now(),
      concurrentRate: "",
      loginUrl: "",
      loginUi: "",
      loginCheckJs: "",
      header: '{"Authorization":"Bearer undefined"}',
    },
  ];

  return new Response(JSON.stringify(config), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// ==================== 管理页面 ====================
function handleIndex(request) {
  const url = new URL(request.url);
  const base_url = `${url.protocol}//${url.host}`;

  const voiceOptions = Object.entries(VOICES)
    .map(([k, v]) => `<option value="${k}">${v}</option>`)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MiMo TTS for Legado</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background:#0d1117; color:#c9d1d9; min-height:100vh; }
.container { max-width:720px; margin:0 auto; padding:24px 16px; }
h1 { text-align:center; font-size:1.8em; margin-bottom:8px; color:#58a6ff; }
.subtitle { text-align:center; color:#8b949e; margin-bottom:32px; font-size:0.95em; }
.card { background:#161b22; border:1px solid #30363d; border-radius:12px; padding:24px; margin-bottom:20px; }
.card h2 { font-size:1.15em; color:#58a6ff; margin-bottom:16px; }
label { display:block; font-size:0.9em; color:#8b949e; margin-bottom:6px; margin-top:14px; }
label:first-of-type { margin-top:0; }
input, select, textarea { width:100%; padding:10px 12px; background:#0d1117; border:1px solid #30363d; border-radius:8px; color:#c9d1d9; font-size:0.95em; }
input:focus, select:focus, textarea:focus { outline:none; border-color:#58a6ff; }
textarea { min-height:80px; resize:vertical; }
.row { display:flex; gap:12px; }
.row > * { flex:1; }
.btn { display:inline-block; padding:12px 24px; border:none; border-radius:8px; font-size:1em; cursor:pointer; font-weight:600; transition:all .2s; }
.btn-primary { background:#238636; color:#fff; }
.btn-primary:hover { background:#2ea043; }
.btn-blue { background:#1f6feb; color:#fff; }
.btn-blue:hover { background:#388bfd; }
.btn-outline { background:transparent; border:1px solid #30363d; color:#c9d1d9; }
.btn-outline:hover { border-color:#58a6ff; color:#58a6ff; }
.btn-group { display:flex; gap:10px; margin-top:20px; flex-wrap:wrap; }
.preview { margin-top:16px; }
audio { width:100%; margin-top:8px; }
.status { margin-top:12px; padding:10px; border-radius:8px; font-size:0.9em; display:none; }
.status.ok { display:block; background:#0d2818; border:1px solid #238636; color:#3fb950; }
.status.err { display:block; background:#2d1117; border:1px solid #da3633; color:#f85149; }
.qr-section { text-align:center; margin-top:20px; }
.qr-section canvas { margin-top:8px; }
.footer { text-align:center; color:#484f58; font-size:0.8em; margin-top:32px; padding-top:16px; border-top:1px solid #21262d; }
.note { background:#1c1f26; border-left:3px solid #58a6ff; padding:12px 16px; border-radius:0 8px 8px 0; margin:16px 0; font-size:0.9em; color:#8b949e; }
</style>
</head>
<body>
<div class="container">
  <h1>🎙️ MiMo TTS for Legado</h1>
  <p class="subtitle">小米 MiMo TTS → legado 阅读 App 在线朗读引擎</p>

  <!-- API Key -->
  <div class="card">
    <h2>🔑 API Key 配置</h2>
    <label>小米 MiMo API Key</label>
    <input type="password" id="apiKey" placeholder="输入你的 MiMo API Key">
    <div class="note">前往 <a href="https://mimo.xiaomi.com" target="_blank" style="color:#58a6ff">mimo.xiaomi.com</a> 获取 API Key</div>
  </div>

  <!-- 音色选择 -->
  <div class="card">
    <h2>🎤 音色设置</h2>
    <div class="row">
      <div>
        <label>模型版本</label>
        <select id="model" onchange="onModelChange()">
          <option value="v2.5">V2.5 内置音色（推荐）</option>
          <option value="v2.5_design">V2.5 VoiceDesign（文本描述音色）</option>
          <option value="v2.5_clone">V2.5 VoiceClone（音频克隆）</option>
          <option value="v2">V2 旧版</option>
        </select>
      </div>
      <div>
        <label>音色</label>
        <select id="voice">${voiceOptions}</select>
      </div>
    </div>
    <div id="designSection" style="display:none">
      <label>音色描述（VoiceDesign 模式）</label>
      <textarea id="voiceDesc" placeholder="例如：温柔的女声，略带磁性，语速适中"></textarea>
    </div>
  </div>

  <!-- 试听 -->
  <div class="card">
    <h2>🔊 在线试听</h2>
    <label>输入要朗读的文本</label>
    <textarea id="testText" placeholder="输入文字，点击试听...">你好，欢迎使用小米 MiMo TTS 语音合成服务。</textarea>
    <div class="btn-group">
      <button class="btn btn-primary" onclick="doPreview()">▶ 试听</button>
    </div>
    <div class="preview" id="previewArea"></div>
    <div class="status" id="statusBox"></div>
  </div>

  <!-- 导入到 Legado -->
  <div class="card">
    <h2>📱 导入到 Legado</h2>
    <p style="color:#8b949e; font-size:0.9em; margin-bottom:12px">配置好 API Key 和音色后，一键导入到 legado 阅读 App</p>
    <div class="btn-group">
      <button class="btn btn-blue" onclick="doImport()">📲 直接导入</button>
      <button class="btn btn-outline" onclick="showQR()">📷 扫码导入</button>
      <button class="btn btn-outline" onclick="copyUrl()">📋 复制链接</button>
    </div>
    <div class="status" id="importStatus"></div>
    <div class="qr-section" id="qrSection" style="display:none">
      <canvas id="qrCanvas"></canvas>
      <p style="color:#8b949e; font-size:0.85em; margin-top:8px">用 legado 扫描此二维码</p>
    </div>
  </div>

  <!-- 使用说明 -->
  <div class="card">
    <h2>📖 使用说明</h2>
    <div style="font-size:0.9em; color:#8b949e; line-height:1.8">
      <p><strong style="color:#c9d1d9">导入步骤：</strong></p>
      <p>1. 输入 API Key，选择音色</p>
      <p>2. 点击「直接导入」或「扫码导入」</p>
      <p>3. legado 中：屏幕中心 → 长按「朗读」→「朗读引擎」→「网络导入」</p>
      <br>
      <p><strong style="color:#c9d1d9">风格控制（在文本前加标签）：</strong></p>
      <p>• <code>&lt;style&gt;开心&lt;/style&gt;明天就是周五了！</code></p>
      <p>• <code>&lt;style&gt;东北话&lt;/style&gt;哎呀妈呀！</code></p>
      <p>• <code>&lt;style&gt;孙悟空&lt;/style&gt;俺老孙来也！</code></p>
    </div>
  </div>

  <div class="footer">MiMo TTS for Legado · Powered by 小米 MiMo · Deployed on EdgeOne</div>
</div>

<script>
function onModelChange() {
  const m = document.getElementById("model").value;
  document.getElementById("designSection").style.display = m === "v2.5_design" ? "block" : "none";
  // VoiceDesign 模式下音色下拉改为输入框用途
  document.getElementById("voice").style.display = m === "v2.5_design" ? "none" : "block";
}

function getConfig() {
  return {
    apiKey: document.getElementById("apiKey").value.trim(),
    model: document.getElementById("model").value,
    voice: document.getElementById("voice").value,
    voiceDesc: document.getElementById("voiceDesc").value.trim(),
  };
}

function showStatus(id, msg, ok) {
  const el = document.getElementById(id);
  el.className = "status " + (ok ? "ok" : "err");
  el.textContent = msg;
}

// 试听
async function doPreview() {
  const cfg = getConfig();
  const text = document.getElementById("testText").value.trim();
  if (!cfg.apiKey) return showStatus("statusBox", "请先输入 API Key", false);
  if (!text) return showStatus("statusBox", "请输入要朗读的文本", false);

  showStatus("statusBox", "正在合成语音...", true);
  document.getElementById("previewArea").innerHTML = "";

  try {
    const params = new URLSearchParams({
      api_key: cfg.apiKey,
      text: text,
      model: cfg.model,
      voice: cfg.model === "v2.5_design" ? cfg.voiceDesc : cfg.voice,
    });
    const resp = await fetch("/tts?" + params.toString());
    if (!resp.ok) {
      const err = await resp.text();
      return showStatus("statusBox", "合成失败: " + err, false);
    }
    const blob = await resp.blob();
    const audioUrl = URL.createObjectURL(blob);
    document.getElementById("previewArea").innerHTML =
      '<audio controls autoplay src="' + audioUrl + '"></audio>';
    showStatus("statusBox", "合成成功！", true);
  } catch (e) {
    showStatus("statusBox", "请求失败: " + e.message, false);
  }
}

// 导入 URL
function getImportUrl() {
  const cfg = getConfig();
  const params = new URLSearchParams({
    api_key: cfg.apiKey,
    voice: cfg.model === "v2.5_design" ? cfg.voiceDesc : cfg.voice,
    model: cfg.model,
  });
  return "${base_url}/api/legado-import?" + params.toString();
}

// 直接导入
function doImport() {
  const cfg = getConfig();
  if (!cfg.apiKey) return showStatus("importStatus", "请先输入 API Key", false);
  const url = getImportUrl();
  window.location.href = "legado://import/httpTTS?src=" + encodeURIComponent(url);
  showStatus("importStatus", "正在唤起 legado...", true);
}

// 复制链接
async function copyUrl() {
  const cfg = getConfig();
  if (!cfg.apiKey) return showStatus("importStatus", "请先输入 API Key", false);
  const url = getImportUrl();
  try {
    await navigator.clipboard.writeText(url);
    showStatus("importStatus", "链接已复制！", true);
  } catch {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showStatus("importStatus", "链接已复制！", true);
  }
}

// 二维码（简易 QR 生成）
function showQR() {
  const cfg = getConfig();
  if (!cfg.apiKey) return showStatus("importStatus", "请先输入 API Key", false);
  const url = getImportUrl();
  document.getElementById("qrSection").style.display = "block";
  // 使用第三方 QR API
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodeURIComponent(url);
  document.getElementById("qrCanvas").outerHTML = '<img id="qrCanvas" src="' + qrUrl + '" width="200" height="200" style="border-radius:8px">';
  showStatus("importStatus", "扫码导入链接已生成", true);
}
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
