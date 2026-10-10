import OpenAI from 'openai';

// Groq, Google Gemini, Mistral, OpenRouter and Ollama all expose an OpenAI-compatible
// chat API, so switching provider is just a change to LLM_BASE_URL, LLM_API_KEY and LLM_MODEL.
const MAX_OUTPUT_TOKENS = Number(process.env.CHAT_MAX_OUTPUT_TOKENS) || 800;

let client; // created lazily so dotenv has loaded before the env vars are read


export async function streamAnswer({ system, messages, onText, signal }) {
    const { LLM_API_KEY, LLM_BASE_URL, LLM_MODEL } = process.env;
    if (!LLM_API_KEY || !LLM_BASE_URL || !LLM_MODEL) {
        throw new Error('LLM_API_KEY, LLM_BASE_URL and LLM_MODEL must be set in .env');
    }

    client ??= new OpenAI({ apiKey: LLM_API_KEY, baseURL: LLM_BASE_URL });

    const stream = await client.chat.completions.create(
        {
            model: LLM_MODEL,
            max_tokens: MAX_OUTPUT_TOKENS,
            stream: true,
            // In this API format the system prompt is just the first message
            messages: [{ role: 'system', content: system }, ...messages],
        },
        { signal }
    );

    for await (const part of stream) {
        const text = part.choices?.[0]?.delta?.content;
        if (text) onText(text);
    }
}