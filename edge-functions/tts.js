/**
 * MiMo TTS for Legado - EdgeOne Edge Function
 * TTS 语音合成接口 - /tts
 */

const TTS_MODELS = {
  "v2.5": "mimo-v2.5-tts",
  "v2.5_clone": "mimo-v2.5-tts-voiceclone",
  "v2.5_design": "mimo-v2.5-tts-voicedesign",
  "v2": "mimo-v2-tts",
};

export default async function onRequest(context) {
  const request = context.request;
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
    try {
      text = decodeURIComponent(decodeURIComponent(text));
      audio_b64 = decodeURIComponent(decodeURIComponent(audio_b64));
    } catch (e) {
      // ignore decode errors
    }
  }

  // 从 Authorization header 提取 API Key（legado 通过 header 传递）
  if (!api_key) {
    const authHeader = request.headers.get("Authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      api_key = authHeader.slice(7);
    } else if (authHeader) {
      api_key = authHeader;
    }
  }

  if (!api_key) {
    return new Response("缺少 api_key", { status: 400 });
  }
  if (!text) {
    return new Response("缺少 text", { status: 400 });
  }

  const model_name = TTS_MODELS[model] || TTS_MODELS["v2.5"];

  try {
    let messages, audioConfig;

    if (model === "v2.5_clone" && audio_b64) {
      messages = [{ role: "assistant", content: text }];
      audioConfig = { format: "wav", voice: `data:audio/mpeg;base64,${audio_b64}` };
    } else if (model === "v2.5_design") {
      messages = [
        { role: "user", content: voice },
        { role: "assistant", content: text },
      ];
      audioConfig = { format: "mp3" };
    } else {
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
      return new Response(`上游API错误: ${mimoResp.status} ${errText}`, { status: 502 });
    }

    const result = await mimoResp.json();
    const audioData = result.choices?.[0]?.message?.audio?.data;

    if (!audioData) {
      return new Response("API 返回无音频数据", { status: 502 });
    }

    const audioBytes = Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0));
    const mediaType = model === "v2.5_clone" ? "audio/wav" : "audio/mpeg";

    return new Response(audioBytes, {
      headers: {
        "Content-Type": mediaType,
        "Content-Length": String(audioBytes.length),
        "Cache-Control": "max-age=3600",
      },
    });
  } catch (e) {
    return new Response(`TTS 错误: ${e.message}`, { status: 500 });
  }
}
