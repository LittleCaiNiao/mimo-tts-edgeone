/**
 * MiMo TTS for Legado - EdgeOne Edge Function
 * 管理页面 - /
 */

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

export default function onRequest(context) {
  const url = new URL(context.request.url);
  const base_url = `${url.protocol}//${url.host}`;

  const voiceOptions = Object.entries(VOICES)
    .map(([k, v]) => `<option value="${k}">${v}</option>`)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MiMo TTS for Legado</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0d1117;color:#c9d1d9;min-height:100vh}
.container{max-width:720px;margin:0 auto;padding:24px 16px}
h1{text-align:center;font-size:1.8em;margin-bottom:8px;color:#58a6ff}
.sub{text-align:center;color:#8b949e;margin-bottom:32px;font-size:.95em}
.card{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:24px;margin-bottom:20px}
.card h2{font-size:1.15em;color:#58a6ff;margin-bottom:16px}
label{display:block;font-size:.9em;color:#8b949e;margin-bottom:6px;margin-top:14px}
label:first-of-type{margin-top:0}
input,select,textarea{width:100%;padding:10px 12px;background:#0d1117;border:1px solid #30363d;border-radius:8px;color:#c9d1d9;font-size:.95em}
input:focus,select:focus,textarea:focus{outline:none;border-color:#58a6ff}
textarea{min-height:80px;resize:vertical}
.row{display:flex;gap:12px}
.row>*{flex:1}
.btn{display:inline-block;padding:12px 24px;border:none;border-radius:8px;font-size:1em;cursor:pointer;font-weight:600;transition:all .2s}
.btn-primary{background:#238636;color:#fff}
.btn-primary:hover{background:#2ea043}
.btn-blue{background:#1f6feb;color:#fff}
.btn-blue:hover{background:#388bfd}
.btn-outline{background:transparent;border:1px solid #30363d;color:#c9d1d9}
.btn-outline:hover{border-color:#58a6ff;color:#58a6ff}
.btn-group{display:flex;gap:10px;margin-top:20px;flex-wrap:wrap}
.preview{margin-top:16px}
audio{width:100%;margin-top:8px}
.status{margin-top:12px;padding:10px;border-radius:8px;font-size:.9em;display:none}
.status.ok{display:block;background:#0d2818;border:1px solid #238636;color:#3fb950}
.status.err{display:block;background:#2d1117;border:1px solid #da3633;color:#f85149}
.qr-section{text-align:center;margin-top:20px}
.footer{text-align:center;color:#484f58;font-size:.8em;margin-top:32px;padding-top:16px;border-top:1px solid #21262d}
.note{background:#1c1f26;border-left:3px solid #58a6ff;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0;font-size:.9em;color:#8b949e}
code{background:#1c1f26;padding:2px 6px;border-radius:4px;font-size:.85em}
</style>
</head>
<body>
<div class="container">
  <h1>🎙️ MiMo TTS for Legado</h1>
  <p class="sub">小米 MiMo TTS → legado 阅读 App 在线朗读引擎</p>

  <div class="card">
    <h2>🔑 API Key 配置</h2>
    <label>小米 MiMo API Key</label>
    <input type="password" id="apiKey" placeholder="输入你的 MiMo API Key">
    <div class="note">前往 <a href="https://mimo.xiaomi.com" target="_blank" style="color:#58a6ff">mimo.xiaomi.com</a> 获取 API Key</div>
  </div>

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

  <div class="card">
    <h2>📱 导入到 Legado</h2>
    <p style="color:#8b949e;font-size:.9em;margin-bottom:12px">配置好 API Key 和音色后，一键导入到 legado 阅读 App</p>
    <div class="btn-group">
      <button class="btn btn-blue" onclick="doImport()">📲 直接导入</button>
      <button class="btn btn-outline" onclick="showQR()">📷 扫码导入</button>
      <button class="btn btn-outline" onclick="copyUrl()">📋 复制链接</button>
    </div>
    <div class="status" id="importStatus"></div>
    <div class="qr-section" id="qrSection" style="display:none">
      <img id="qrImg" width="200" height="200" style="border-radius:8px">
      <p style="color:#8b949e;font-size:.85em;margin-top:8px">用 legado 扫描此二维码</p>
    </div>
  </div>

  <div class="card">
    <h2>📖 使用说明</h2>
    <div style="font-size:.9em;color:#8b949e;line-height:1.8">
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
function onModelChange(){var m=document.getElementById("model").value;document.getElementById("designSection").style.display=m==="v2.5_design"?"block":"none";document.getElementById("voice").style.display=m==="v2.5_design"?"none":"block"}
function getConfig(){return{apiKey:document.getElementById("apiKey").value.trim(),model:document.getElementById("model").value,voice:document.getElementById("voice").value,voiceDesc:document.getElementById("voiceDesc").value.trim()}}
function showStatus(id,msg,ok){var el=document.getElementById(id);el.className="status "+(ok?"ok":"err");el.textContent=msg}
async function doPreview(){var c=getConfig();var t=document.getElementById("testText").value.trim();if(!c.apiKey)return showStatus("statusBox","请先输入 API Key",false);if(!t)return showStatus("statusBox","请输入要朗读的文本",false);showStatus("statusBox","正在合成语音...",true);document.getElementById("previewArea").innerHTML="";try{var p=new URLSearchParams({api_key:c.apiKey,text:t,model:c.model,voice:c.model==="v2.5_design"?c.voiceDesc:c.voice});var r=await fetch("/tts?"+p.toString());if(!r.ok){var e=await r.text();return showStatus("statusBox","合成失败: "+e,false)}var b=await r.blob();var u=URL.createObjectURL(b);document.getElementById("previewArea").innerHTML='<audio controls autoplay src="'+u+'"></audio>';showStatus("statusBox","合成成功！",true)}catch(e){showStatus("statusBox","请求失败: "+e.message,false)}}
function getImportUrl(){var c=getConfig();var p=new URLSearchParams({api_key:c.apiKey,voice:c.model==="v2.5_design"?c.voiceDesc:c.voice,model:c.model});return "${base_url}/api/legado-import?"+p.toString()}
function doImport(){var c=getConfig();if(!c.apiKey)return showStatus("importStatus","请先输入 API Key",false);var u=getImportUrl();window.location.href="legado://import/httpTTS?src="+encodeURIComponent(u);showStatus("importStatus","正在唤起 legado...",true)}
async function copyUrl(){var c=getConfig();if(!c.apiKey)return showStatus("importStatus","请先输入 API Key",false);var u=getImportUrl();try{await navigator.clipboard.writeText(u);showStatus("importStatus","链接已复制！",true)}catch(e){var ta=document.createElement("textarea");ta.value=u;document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);showStatus("importStatus","链接已复制！",true)}}
function showQR(){var c=getConfig();if(!c.apiKey)return showStatus("importStatus","请先输入 API Key",false);var u=getImportUrl();document.getElementById("qrSection").style.display="block";document.getElementById("qrImg").src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(u);showStatus("importStatus","扫码导入链接已生成",true)}
</script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
