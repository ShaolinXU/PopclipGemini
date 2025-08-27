// #popclip extension for Google Gemini
// name: Gemini Improve Writing
// icon: "iconify:tabler:file-text-ai"
// language: javascript
// module: true
// entitlements: [network]
// options: [{
//   identifier: apikey, label: API Key, type: string,
//   description: 'Obtain API key from Google Cloud Console'
// },
// {
//   identifier: model, label: 'model', type: multiple,
//   values:['gemini-2.0-flash-lite','gemini-2.0-flash','gemini-2.5-flash-lite','gemini-2.5-flash']
// },
// {
//   identifier: prompt, label: 'Improve Writing Prompt', type: string,
//   defaultValue: "",
//   description: 'Enter the prompt template using {input} as a placeholder for the text'
// }
// ]

const axios = require("axios");

function resolveModel(m) {
  if (!m) return "gemini-2.0-flash-lite";
  // PopClip 的 multiple 选项可能返回数组，这里取第一个
  return Array.isArray(m) ? (m[0] || "gemini-2.0-flash-lite") : m;
}

function buildPrompt(userText, template) {
  const defaultTemplate =
    "I will give you text content, you will rewrite it and output a better version of my text. " +
    "Correct spelling, grammar, and punctuation errors in the given text. Keep the meaning the same. " +
    "Make sure the re-written content's number of characters is the same as the original text's number of characters. " +
    "Do not alter the original structure and formatting outlined in any way. Only give me the output and nothing else. " +
    "Now, using the concepts above, re-write the following text. " +
    "Respond in the same language variety or dialect of the following text: {input}";

  const tpl = (template && String(template).trim().length > 0) ? template : defaultTemplate;
  // 将所有 {input} 占位符替换为文本（而不是只替换第一个）
  return tpl.split("{input}").join(userText);
}

async function generateContent(input, options = {}) {
  const text = (input && typeof input.text === "string") ? input.text : String(input || "");
  if (!text) {
    return "Error: no input text.";
  }

  const apiKey = (options.apikey || "").trim();
  if (!apiKey) {
    return "Error: missing API key. Please set it in the extension options.";
  }

  const model = resolveModel(options.model);
  const prompt = buildPrompt(text, options.prompt);

  // 适配 v1beta generateContent；加入 role，更稳
  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    // 仅保留常见安全设置示例；如需更多可自行扩展
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" }
    ],
    generationConfig: {
      // 对于润色任务，偏保守温度更稳定
      temperature: 0.3,
      maxOutputTokens: 1024,
      topP: 0.95,
      topK: 40
      // 可选：需要时再添加 stopSequences
      // stopSequences: ["Title"]
    }
  };

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await axios.post(url, requestBody, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000
    });

    const data = response && response.data ? response.data : {};
    const cand = (data.candidates && data.candidates[0]) || null;

    // 处理被拦截 / 无候选的情况
    if (!cand) {
      const reason =
        (data.promptFeedback && data.promptFeedback.blockReason) ||
        "No candidates returned.";
      throw new Error(`Generation failed: ${reason}`);
    }

    // 抽取文本
    const parts = (cand.content && Array.isArray(cand.content.parts)) ? cand.content.parts : [];
    const generatedText = parts.map(p => p && p.text ? p.text : "").filter(Boolean).join("\n").trim();

    if (!generatedText) {
      throw new Error("Empty response from model.");
    }

    return generatedText;
  } catch (err) {
    // 汇总更可读的错误信息
    const details =
      (err.response && err.response.data && JSON.stringify(err.response.data)) ||
      err.message ||
      String(err);
    console.error("Error generating content:", details);
    return "Error generating content: " + details;
  }
}

exports.actions = [
  {
    title: "Gemini Improve Writing",
    after: "paste-result",
    code: async (input, options) => generateContent(input, options)
  }
];
