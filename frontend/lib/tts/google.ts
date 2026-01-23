import { TextToSpeechClient } from "@google-cloud/text-to-speech";

type Credentials = {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key?: string;
  client_email?: string;
  client_id?: string;
  token_uri?: string;
};

function resolveCredentials(): { projectId?: string; credentials?: Credentials } | null {
  // Prefer GOOGLE_TTS_CREDENTIALS_JSON (inline JSON) if present
  const inline = process.env.GOOGLE_TTS_CREDENTIALS_JSON;
  if (inline) {
    try {
      const parsed = JSON.parse(inline) as Credentials;
      return { projectId: parsed.project_id, credentials: parsed };
    } catch {
      // fall through
    }
  }

  // Fallback to default ADC path env
  const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  return { projectId };
}

function getClient(): TextToSpeechClient {
  const resolved = resolveCredentials();
  if (resolved?.credentials) {
    const { credentials, projectId } = resolved;
    return new TextToSpeechClient({ projectId, credentials });
  }
  // Use Application Default Credentials (ADC)
  return new TextToSpeechClient();
}

export async function synthesizeSpeech(params: {
  text: string;
  languageCode?: string;
  voiceName?: string;
  speakingRate?: number;
  pitch?: number;
  audioEncoding?: "MP3" | "OGG_OPUS" | "LINEAR16";
}): Promise<Buffer> {
  const {
    text,
    languageCode = "en-US",
    voiceName,
    speakingRate,
    pitch,
    audioEncoding = "MP3",
  } = params;

  if (!text || !text.trim()) {
    throw new Error("Text is required for TTS");
  }

  const client = getClient();

  const [response] = await client.synthesizeSpeech({
    input: { text },
    voice: {
      languageCode,
      name: voiceName,
      ssmlGender: "NEUTRAL",
    },
    audioConfig: {
      audioEncoding,
      speakingRate,
      pitch,
    },
  });

  const content = response.audioContent || Buffer.alloc(0);
  // SDK returns Buffer already; but normalize to Buffer type
  return Buffer.isBuffer(content) ? content : Buffer.from(content as Uint8Array);
}
