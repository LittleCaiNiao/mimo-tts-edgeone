/**
 * MiMo TTS for Legado - EdgeOne Edge Function
 * Legado 导入配置 - /api/legado-import
 * 格式参考：https://legado.aoaostar.com/sources/19db2f5e.json
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
  const p = url.searchParams;
  const api_key = p.get("api_key") || "";
  const voice = p.get("voice") || "冰糖";
  const model = p.get("model") || "v2.5";
  const v_name = VOICES[voice] || `音色(${voice})`;

  const base_url = `${url.protocol}//${url.host}`;

  const tts_url = `${base_url}/tts?voice=${voice}&model=${model}&volume=100&pitch=0&rate={{(speakSpeed - 10) * 2}}&text={{java.encodeURI(speakText)}}`;

  // 格式严格对齐 legado httpTTS 标准
  const config = [
    {
      name: `小米 - ${v_name}`,
      url: tts_url,
      contentType: "",
      id: Date.now(),
      lastUpdateTime: Date.now(),
      enabledCookieJar: false,
      concurrentRate: "0",
      loginUrl: "",
      loginUi: "",
      loginCheckJs: "",
      header: api_key ? `{"Authorization":"${api_key}"}` : "",
    },
  ];

  return new Response(JSON.stringify(config), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
