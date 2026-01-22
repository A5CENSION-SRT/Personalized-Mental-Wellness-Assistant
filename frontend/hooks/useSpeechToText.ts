import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechToTextReturn {
  isListening: boolean;
  interimTranscript: string;
  toggleListening: () => void;
  isSupported: boolean;
}

export function useSpeechToText(
  onTranscript: (text: string) => void
): UseSpeechToTextReturn {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsSupported(true);
      
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interim = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interim += transcript;
          }
        }
        
        if (finalTranscript) {
          onTranscript(finalTranscript.trim());
          setInterimTranscript('');
        } else if (interim) {
          setInterimTranscript(interim);
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        setIsListening(false);
        
        // Ignore benign errors that occur during normal operation
        if (event.error === 'no-speech' || event.error === 'aborted') {
          // These are expected: no-speech = silence detected, aborted = user stopped
          return;
        }
        
        // Only log and show alerts for actual problematic errors
        console.error('Speech recognition error:', event.error);
        alert(`Voice input error: ${event.error}. Please try again.`);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };
    }
    
    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // Ignore errors on cleanup
        }
      }
    };
  }, [onTranscript]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert("Voice input not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
        setIsListening(false);
        setInterimTranscript('');
      }
    } else {
      try {
        // Force stop first in case it's in a weird state
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors from stopping when not running
        }
        
        // Small delay to ensure clean state
        setTimeout(() => {
          try {
            recognitionRef.current.start();
            setIsListening(true);
          } catch (error: any) {
            console.error('Failed to start recognition:', error);
            setIsListening(false);
            
            // Handle specific error cases
            if (error.message?.includes('already started')) {
              // Recognition is already running, just update state
              setIsListening(true);
            }
          }
        }, 100);
      } catch (error) {
        console.error('Error initializing recognition:', error);
        setIsListening(false);
      }
    }
  }, [isListening]);

  return {
    isListening,
    interimTranscript,
    toggleListening,
    isSupported,
  };
}
