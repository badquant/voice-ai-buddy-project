
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { ConnectionState } from "livekit-client";
import livekitService from "@/services/livekitService";
import { toast } from "sonner";

const VoiceAssistant = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [assistantResponse, setAssistantResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userId = useRef(`user-${Math.floor(Math.random() * 10000)}`);
  
  const conversationHistory = useRef<Array<{type: 'user' | 'assistant', text: string}>>([]);

  useEffect(() => {
    livekitService.setTranscribedTextCallback((text) => {
      setTranscribedText(text);
      updateConversationHistory('user', text);
    });

    livekitService.setLLMResponseCallback((text) => {
      setAssistantResponse(text);
      updateConversationHistory('assistant', text);
    });

    livekitService.setConnectionStateChangeCallback((state) => {
      setConnectionState(state);
      setIsConnected(state === ConnectionState.Connected);
      
      if (state === ConnectionState.Connected) {
        toast.success("Connected to voice assistant");
      } else if (state === ConnectionState.Disconnected) {
        setIsMicActive(false);
      }
    });

    return () => {
      handleDisconnect();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversationHistory.current.length]);

  const updateConversationHistory = (type: 'user' | 'assistant', text: string) => {
    if (!text.trim()) return;
    
    conversationHistory.current = [...conversationHistory.current, { type, text }];
    setIsLoading(false);
    
    // Force re-render
    setTranscribedText("");
    setAssistantResponse("");
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      await livekitService.connect(userId.current);
    } catch (error) {
      console.error("Connection error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await livekitService.disconnect();
      setIsConnected(false);
      setIsMicActive(false);
    } catch (error) {
      console.error("Disconnection error:", error);
    }
  };

  const toggleMic = async () => {
    try {
      if (isMicActive) {
        await livekitService.disableAudio();
        setIsMicActive(false);
      } else {
        await livekitService.enableAudio();
        setIsMicActive(true);
      }
    } catch (error) {
      console.error("Mic toggle error:", error);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Voice AI Assistant
        </CardTitle>
        <CardDescription>
          Talk to the AI assistant using your voice
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div 
              className={`h-3 w-3 rounded-full ${
                connectionState === ConnectionState.Connected 
                  ? "bg-green-500" 
                  : connectionState === ConnectionState.Connecting 
                    ? "bg-yellow-500" 
                    : "bg-red-500"
              }`}
            />
            <span className="text-sm">
              {connectionState === ConnectionState.Connected 
                ? "Connected" 
                : connectionState === ConnectionState.Connecting 
                  ? "Connecting..." 
                  : "Disconnected"}
            </span>
          </div>
          
          <div>
            {isConnected ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDisconnect}
                disabled={isLoading}
              >
                Disconnect
              </Button>
            ) : (
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleConnect}
                disabled={isLoading}
              >
                {isLoading ? "Connecting..." : "Connect"}
              </Button>
            )}
          </div>
        </div>

        <div className="bg-slate-50 rounded-md p-4 h-80 overflow-y-auto mb-4">
          {conversationHistory.current.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No conversation yet. Connect and start speaking.
            </div>
          ) : (
            <>
              {conversationHistory.current.map((message, index) => (
                <div 
                  key={index} 
                  className={`mb-4 rounded-lg p-3 max-w-[80%] ${
                    message.type === 'user' 
                      ? 'bg-primary text-primary-foreground ml-auto' 
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {message.text}
                </div>
              ))}
              {transcribedText && (
                <div className="mb-4 rounded-lg p-3 max-w-[80%] bg-primary/70 text-primary-foreground ml-auto">
                  {transcribedText}...
                </div>
              )}
              {assistantResponse && (
                <div className="mb-4 rounded-lg p-3 max-w-[80%] bg-muted text-muted-foreground">
                  {assistantResponse}...
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t p-4">
        <div className="w-full flex justify-center">
          <Button
            size="lg"
            className={`rounded-full w-16 h-16 ${isMicActive ? 'bg-red-500 hover:bg-red-600' : ''}`}
            disabled={!isConnected || isLoading}
            onClick={toggleMic}
          >
            {isMicActive ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default VoiceAssistant;
