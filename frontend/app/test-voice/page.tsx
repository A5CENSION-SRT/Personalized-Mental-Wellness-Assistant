'use client';

import { useState } from 'react';
import { Mic, Volume2, Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { getTTSUrl } from '@/lib/tts/client';

export default function VoiceTestPage() {
  const [transcript, setTranscript] = useState('');
  const [ttsText, setTtsText] = useState('Hello! This is a test of Google Cloud Text-to-Speech. How are you feeling today?');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);

  // Mock responses for testing without backend
  const mockResponses = [
    "I'm here to listen. Tell me more about what's on your mind.",
    "That sounds challenging. How does that make you feel?",
    "Thank you for sharing that with me. You're doing great by talking about it.",
    "It's completely normal to feel this way. What strategies have you tried?",
    "I appreciate you opening up. Remember, it's okay to ask for help.",
  ];

  const handleTranscript = (text: string) => {
    setTranscript((prev) => prev ? `${prev} ${text}`.trim() : text);
    
    // Auto-generate mock response and speak it
    if (autoSpeak && text.length > 5) {
      const mockResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      setTimeout(() => {
        handlePlayTTS(mockResponse);
      }, 500);
    }
  };

  const { isListening, interimTranscript, toggleListening, isSupported } = 
    useSpeechToText(handleTranscript);

  const handlePlayTTS = async (text: string = ttsText) => {
    setError(null);
    setLoading(true);
    try {
      const url = await getTTSUrl(text, { 
        languageCode: 'en-US',
        speakingRate: 1.0,
        pitch: 0.0,
      });
      setAudioUrl(url);
      const audio = new Audio(url);
      await audio.play();
      setLoading(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to play audio');
      setLoading(false);
    }
  };

  const handleClearTranscript = () => {
    setTranscript('');
    setError(null);
  };

  const quickTestPhrases = [
    "I'm feeling stressed about my exams.",
    "I need help with anxiety management.",
    "Can you give me some breathing exercises?",
    "I'm having trouble sleeping lately.",
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Voice Chat Test Suite
          </h1>
          <p className="text-muted-foreground">
            Test voice input (Browser STT) and voice output (Google Cloud TTS)
          </p>
        </div>

        {/* STT Test Section */}
        <div className="glass rounded-3xl p-8 border-2 border-border space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Mic className="w-6 h-6 text-primary" />
              Speech-to-Text (Browser API)
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoSpeak}
                  onChange={(e) => setAutoSpeak(e.target.checked)}
                  className="rounded"
                />
                Auto-speak response
              </label>
            </div>
          </div>

          {!isSupported && (
            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-2xl p-4">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                ️ Speech recognition not supported in this browser. Use Chrome or Edge.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <button
              type="button"
              onClick={toggleListening}
              disabled={!isSupported || loading}
              className={cn(
                "w-full p-6 rounded-2xl transition-all duration-300 font-medium text-lg",
                isListening
                  ? "bg-green-500 text-white shadow-xl shadow-green-500/50 animate-pulse"
                  : "bg-primary hover:bg-primary/90 text-white shadow-lg",
                "disabled:opacity-50 disabled:cursor-not-allowed relative"
              )}
            >
              <Mic className="w-8 h-8 mx-auto mb-2" />
              {isListening ? " Listening... (Click to stop)" : "Start Voice Input"}
              {isListening && (
                <span className="absolute top-4 right-4 w-4 h-4 bg-green-300 rounded-full animate-ping"></span>
              )}
            </button>

            {interimTranscript && (
              <div className="bg-blue-500/10 border border-blue-500/50 rounded-2xl p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Interim:</strong> {interimTranscript}
                </p>
              </div>
            )}

            <div className="bg-muted rounded-2xl p-6 min-h-[120px]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Transcript:</p>
                <button
                  onClick={handleClearTranscript}
                  className="text-xs text-primary hover:underline"
                >
                  Clear
                </button>
              </div>
              <p className="text-foreground">
                {transcript || <span className="text-muted-foreground italic">Your speech will appear here...</span>}
              </p>
            </div>
          </div>

          {/* Quick test buttons */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Quick test phrases:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickTestPhrases.map((phrase, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setTranscript(phrase);
                    if (autoSpeak) handlePlayTTS(mockResponses[idx % mockResponses.length]);
                  }}
                  className="text-left text-sm p-3 bg-muted hover:bg-muted/80 rounded-xl transition-colors"
                >
                  "{phrase}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* TTS Test Section */}
        <div className="glass rounded-3xl p-8 border-2 border-border space-y-6">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Volume2 className="w-6 h-6 text-primary" />
            Text-to-Speech (Google Cloud)
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Text to speak:</label>
              <textarea
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                rows={3}
                className="w-full p-4 bg-muted rounded-xl border-2 border-border focus:border-primary outline-none transition-colors resize-none"
                placeholder="Enter text to convert to speech..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handlePlayTTS()}
                disabled={!ttsText.trim() || loading}
                className={cn(
                  "flex-1 p-4 rounded-xl font-medium transition-all duration-300",
                  "bg-primary hover:bg-primary/90 text-white shadow-lg",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center justify-center gap-2"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Play Speech
                  </>
                )}
              </button>

              {audioUrl && (
                <a
                  href={audioUrl}
                  download="speech.mp3"
                  className="px-6 py-4 bg-secondary hover:bg-secondary/90 text-white rounded-xl font-medium transition-colors"
                >
                  Download
                </a>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-4">
                <p className="text-sm text-red-700 dark:text-red-300">
                  <strong>Error:</strong> {error}
                </p>
              </div>
            )}

            {audioUrl && !error && !loading && (
              <div className="bg-green-500/10 border border-green-500/50 rounded-2xl p-4">
                <p className="text-sm text-green-700 dark:text-green-300">
                   Audio generated and played successfully!
                </p>
              </div>
            )}
          </div>

          {/* Mock responses preview */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Mock AI responses (for testing):</p>
            <div className="grid gap-2">
              {mockResponses.map((response, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePlayTTS(response)}
                  disabled={loading}
                  className="text-left text-sm p-3 bg-muted hover:bg-muted/80 rounded-xl transition-colors disabled:opacity-50"
                >
                  <Volume2 className="w-4 h-4 inline mr-2 text-primary" />
                  "{response}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Integration Test */}
        <div className="glass rounded-3xl p-8 border-2 border-border space-y-4">
          <h2 className="text-2xl font-semibold"> Full Integration Test</h2>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="font-bold text-primary">1.</span>
              <span>Enable "Auto-speak response" above</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">2.</span>
              <span>Click "Start Voice Input" and say one of the quick test phrases</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">3.</span>
              <span>The system will capture your speech and automatically play a mock response via TTS</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-primary">4.</span>
              <span>This simulates the full conversation flow without needing the heavy backend (Ollama)</span>
            </li>
          </ol>
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-2xl p-4 mt-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
               <strong>Tip:</strong> This test page works independently of the chat backend, perfect for testing when rate-limited!
            </p>
          </div>
        </div>

        {/* Status Info */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>Voice Input: {isSupported ? ' Supported' : ' Not supported'}</p>
          <p>TTS Service: Google Cloud Text-to-Speech</p>
        </div>
      </div>
    </div>
  );
}
