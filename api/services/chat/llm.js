export async function streamAnswer({ system, messages, onText, signal }) {
    // TODO: Implement actual LLM streaming
    // This is a placeholder that will be replaced with VoyageAI or OpenAI integration
    const abort = signal;
    try {
        const controller = new AbortController();
        if (abort) {
            abort.signal.addEventListener('abort', () => controller.abort());
        }
        // Simulate streaming
        const response = await fetch('https://api.example.com/stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ system, messages }),
            signal: controller.signal,
        });
        if (response.ok) {
            const reader = response.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const text = new TextDecoder().decode(value);
                onText(text);
            }
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Stream error:', err);
        }
    }
}