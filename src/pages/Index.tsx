
import VoiceAssistant from "@/components/VoiceAssistant";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto pt-8 pb-16">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Voice AI Assistant</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Talk to our voice-powered AI assistant. Connect, speak, and hear responses in real-time.
          </p>
        </div>
        
        <VoiceAssistant />
        
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            This application uses LiveKit for real-time voice communication and connects to a Python backend AI agent.
          </p>
          <p className="mt-2">
            Press the microphone button to start speaking after connecting.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
