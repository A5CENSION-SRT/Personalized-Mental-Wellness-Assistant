"use client";

import { useState } from "react";
import { getTTSUrl, TTSOptions } from "@/lib/tts/client";

type Props = {
  text: string;
  options?: TTSOptions;
  label?: string;
};

export default function TextToSpeechButton({ text, options, label = "Speak" }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const url = await getTTSUrl(text, options);
      setAudioUrl(url);
      const audio = new Audio(url);
      await audio.play();
    } catch (e: any) {
      setError(e?.message || "Failed to play audio");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Loading..." : label}
      </button>
      {error && <span className="text-red-600 text-sm">{error}</span>}
      {audioUrl && (
        <a href={audioUrl} download="speech.mp3" className="text-sm text-blue-700 underline">
          Download
        </a>
      )}
    </div>
  );
}
