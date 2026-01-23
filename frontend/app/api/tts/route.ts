import { NextRequest } from "next/server";
import { synthesizeSpeech } from "@/lib/tts/google";

export const runtime = "nodejs"; // Ensure server runtime

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, languageCode, voiceName, speakingRate, pitch, audioEncoding } = body || {};

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'text' string in request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await synthesizeSpeech({
      text,
      languageCode,
      voiceName,
      speakingRate,
      pitch,
      audioEncoding,
    });

    // Default to MP3 content type unless specified otherwise
    const ct = audioEncoding === "LINEAR16" ? "audio/wav" : audioEncoding === "OGG_OPUS" ? "audio/ogg" : "audio/mpeg";
    const arrayBuffer = audioBuffer.buffer.slice(
      audioBuffer.byteOffset,
      audioBuffer.byteOffset + audioBuffer.byteLength
    ) as ArrayBuffer;
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": ct,
        "Content-Length": String(audioBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    const message = err?.message || "Internal Server Error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
