// #popclip extension for Google Gemini
// name: Gemini Translate
// icon: "iconify:mdi:alpha-e-circle"
// language: javascript
// module: true
// entitlements: [network]
// options: [{
//   identifier: apikey, label: API Key, type: string,
//   description: 'Obtain API key from Google Cloud Console'
// },
// {
//    identifier: model, label: 'model', type: multiple,
//    values:['gemini-2.0-flash-lite','gemini-2.0-flash','gemini-2.5-flash-lite', 'gemini-2.5-flash']
//  }, {
//   identifier: prompt, label: 'Translate Prompt', type: string,
//   defaultValue: "I will give you text content, you will rewrite it and translate the text into {lang} language. Keep the meaning the same. Do not alter the original structure and formatting outlined in any way. Only give me the output and nothing else.Now, using the concepts above, translate the following text:{input}",
//   description: 'Enter the prompt template using {input} {lang} as a placeholder for the text'
// },{
//    identifier: tolang, label: 'Language', type: multiple,
//    values:['English','Chinese','Russian','French','Português','Spanish'],
//    description: 'The language to be translated'
// }]

const axios = require("axios");

async function generateContent(input, options) {
  const prompt=options.prompt.replace('{input}', input.text).replace('{lang}',options.tolang);
  const requestBody = {
    "contents": [{
      "parts": [
        {"text": prompt}
      ]
    }],
    "safetySettings": [
      {
        "category": "HARM_CATEGORY_HARASSMENT",
        "threshold": "BLOCK_ONLY_HIGH"
      }
    ],
    "generationConfig": {
      "stopSequences": [
        "Title"
      ],
     "temperature": 1.0,
      "maxOutputTokens": 8192,
      "topP": 0.95,
      "topK": 64
    }
  };

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent?key=${options.apikey}`,
      requestBody,
      { headers: { 'Content-Type': 'application/json' } }
    );

    const generatedText = response.data.candidates[0].content.parts.map(part => part.text).join('\n');
    return generatedText;
  } catch (error) {
    console.error("Error generating content:", error);
    return "Error generating content: " + error.message;
  }
}

exports.actions = [{
  title: "Gemini Translate",
  after: "paste-result",
  code: async (input, options) => generateContent(input, options),
}];
