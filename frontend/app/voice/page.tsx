'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Mic, ArrowLeft, Sparkles, Volume2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { getTTSUrl } from '@/lib/tts/client';

interface VoiceMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

function VoiceModeContent() {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [user, setUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
      }
    });
  }, [router]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleTranscript = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    const userMessage: VoiceMessage = {
      id: Date.now().toString(),
      content: text,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Call the chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.slice(-4).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const aiMessage: VoiceMessage = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Auto-play TTS response
      await playTTS(aiMessage.content);

    } catch (error: any) {
      console.error('Error in voice chat:', error);
      
      const errorMessage: VoiceMessage = {
        id: (Date.now() + 1).toString(),
        content: "I apologize, but I'm having trouble responding right now. Please try again.",
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      await playTTS(errorMessage.content);
    } finally {
      setIsProcessing(false);
    }
  };

  const { isListening, interimTranscript, toggleListening, isSupported } = 
    useSpeechToText(handleTranscript);

  const playTTS = async (text: string) => {
    try {
      setIsSpeaking(true);
      const url = await getTTSUrl(text, { languageCode: 'en-US' });
      
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        audioRef.current = null;
      };
      
      await audio.play();
    } catch (error) {
      console.warn('TTS playback failed:', error);
      setIsSpeaking(false);
    }
  };

  const handleBackToDashboard = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    router.push('/dashboard');
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Header */}
        <header className="glass border-b border-border/50 p-4 flex items-center justify-between sticky top-0 z-10">
          <button
            onClick={handleBackToDashboard}
            className="flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              "bg-linear-to-br from-primary via-secondary to-accent",
              "shadow-lg shadow-primary/25"
            )}>
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Voice Mode</h1>
              <p className="text-xs text-muted-foreground">Speak naturally</p>
            </div>
          </div>
          
          <div className="w-20"></div> {/* Spacer for centering */}
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 flex items-center justify-center">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center w-full max-w-2xl">
              <div className="mb-12"></div>
              
              <h2 className="text-5xl font-bold tracking-tight mb-6 text-center bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                {isListening ? "I'm listening..." : "Ready to chat"}
              </h2>
              
              {interimTranscript && (
                <div className="glass rounded-3xl px-8 py-4 mb-8 border-2 border-primary/50 max-w-xl animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-xl text-center font-medium">
                    "{interimTranscript}"
                  </p>
                </div>
              )}
              
              {!isListening && !interimTranscript && (
                <p className="text-xl text-muted-foreground text-center mb-12 max-w-xl leading-relaxed">
                  Tap the microphone below and share what's on your mind. I'll listen and respond with voice.
                </p>
              )}

              {!isSupported && (
                <div className="glass border-2 border-yellow-500/50 rounded-2xl p-6 max-w-md mt-6">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 text-center">
                    ️ Voice input not supported in this browser. Please use Chrome or Edge.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full max-w-4xl space-y-8 pb-40 pt-8">
              {messages.map((message, index) => (
                <div 
                  key={message.id} 
                  className={cn(
                    "animate-in fade-in slide-in-from-bottom-6 duration-700",
                    "flex flex-col gap-3"
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {message.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className="glass border-2 border-border rounded-3xl px-8 py-5 max-w-[85%]">
                        <p className="text-lg leading-relaxed">{message.content}</p>
                        <p className="text-xs text-muted-foreground mt-2 text-right">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start">
                      <div className="space-y-2 max-w-[85%]">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">Assistant</span>
                        </div>
                        <div className="bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 rounded-3xl px-8 py-5 border border-border/50">
                          <p className="text-lg leading-relaxed">{message.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Processing Indicator */}
              {isProcessing && (
                <div className="flex justify-start animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-2 max-w-[85%]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">Assistant</span>
                    </div>
                    <div className="glass rounded-3xl px-8 py-6 border-2 border-border">
                      <div className="flex gap-2 typing-indicator">
                        <span className="w-3 h-3 bg-primary rounded-full"></span>
                        <span className="w-3 h-3 bg-primary rounded-full"></span>
                        <span className="w-3 h-3 bg-primary rounded-full"></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Voice Control - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 z-20 pb-8 pt-6 bg-gradient-to-t from-background via-background to-transparent">
          <div className="flex flex-col items-center gap-4 max-w-2xl mx-auto px-4">
            {/* Interim transcript floating above button */}
            {isListening && interimTranscript && messages.length > 0 && (
              <div className="glass rounded-3xl px-8 py-4 border-2 border-green-500/50 animate-in fade-in slide-in-from-bottom-2 backdrop-blur-xl">
                <p className="text-lg italic text-center font-medium">"{interimTranscript}"</p>
              </div>
            )}
            
            {/* Main voice button */}
            <div className="relative">
              <button
                onClick={toggleListening}
                disabled={!isSupported || isProcessing}
                className={cn(
                  "w-28 h-28 rounded-full transition-all duration-500 shadow-2xl",
                  "flex items-center justify-center relative",
                  isListening
                    ? "bg-gradient-to-br from-green-400 to-green-600 scale-110 shadow-green-500/60"
                    : isSpeaking
                    ? "bg-gradient-to-br from-blue-400 to-blue-600 shadow-blue-500/60 scale-105"
                    : "bg-gradient-to-br from-primary via-secondary to-accent shadow-primary/50 hover:scale-105 active:scale-95",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100",
                  "border-4 border-background"
                )}
              >
                {isSpeaking ? (
                  <Volume2 className="w-14 h-14 text-white animate-pulse" />
                ) : (
                  <Mic className="w-14 h-14 text-white" />
                )}
                
                {/* Pulsing rings when listening */}
                {isListening && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></span>
                    <span className="absolute inset-[-8px] rounded-full border-4 border-green-400 animate-pulse opacity-50"></span>
                  </>
                )}
              </button>
            </div>
            
            {/* Status text */}
            <div className="text-center space-y-1">
              <p className="text-base font-semibold">
                {isListening 
                  ? "Listening..." 
                  : isSpeaking 
                  ? "Speaking..." 
                  : isProcessing 
                  ? "Thinking..."
                  : "Tap to speak"}
              </p>
              {!isListening && !isSpeaking && !isProcessing && (
                <p className="text-sm text-muted-foreground">
                  Hands-free conversation
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VoiceModePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className={cn(
            "w-16 h-16 mx-auto rounded-2xl flex items-center justify-center",
            "bg-linear-to-br from-primary via-secondary to-accent",
            "shadow-xl shadow-primary/25 animate-pulse"
          )}>
            <Mic className="w-8 h-8 text-white" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">Loading voice mode...</p>
        </div>
      </div>
    }>
      <VoiceModeContent />
    </Suspense>
  );
}
