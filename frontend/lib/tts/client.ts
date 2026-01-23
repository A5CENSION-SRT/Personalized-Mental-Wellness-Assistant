export type TTSOptions = {
  languageCode?: string;
  voiceName?: string;
  speakingRate?: number;
  pitch?: number;
  audioEncoding?: "MP3" | "OGG_OPUS" | "LINEAR16";
};

export async function getTTSUrl(text: string, options: TTSOptions = {}): Promise<string> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, ...options }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(errText || `TTS request failed: ${res.status}`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
