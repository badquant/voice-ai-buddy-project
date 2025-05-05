
import { Room, RoomEvent, LocalParticipant, RemoteParticipant, RemoteTrackPublication, RemoteTrack, DataPacket_Kind, ConnectionState } from "livekit-client";
import { getToken } from "./backendService";
import { toast } from "sonner";

const ROOM_NAME = "voice-assistant-room";

class LiveKitService {
  private room: Room | null = null;
  private onTranscribedText: ((text: string) => void) | null = null;
  private onLLMResponse: ((text: string) => void) | null = null;
  private onConnectionStateChange: ((state: ConnectionState) => void) | null = null;

  constructor() {
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.room) return;

    this.room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant, kind?: DataPacket_Kind) => {
      try {
        const decodedData = new TextDecoder().decode(payload);
        const data = JSON.parse(decodedData);
        
        if (data.event === "transcribed_text" && this.onTranscribedText) {
          this.onTranscribedText(data.data.text);
        } else if (data.event === "response" && this.onLLMResponse) {
          this.onLLMResponse(data.data.text);
        }
      } catch (error) {
        console.error("Error parsing data packet:", error);
      }
    });

    this.room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      console.log("Track subscribed:", track.kind, "from", participant.identity);
    });

    this.room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      console.log("Connection state changed:", state);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(state);
      }
    });

    this.room.on(RoomEvent.Disconnected, () => {
      console.log("Disconnected from room");
      toast.info("Disconnected from voice assistant");
    });

    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log("Participant connected:", participant.identity);
      if (participant.identity === "python-agent") {
        toast.success("Voice assistant connected");
      }
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log("Participant disconnected:", participant.identity);
      if (participant.identity === "python-agent") {
        toast.warning("Voice assistant disconnected");
      }
    });

    this.room.on(RoomEvent.MediaDevicesError, (error: Error) => {
      console.error("Media device error:", error);
      toast.error("Media device error: " + error.message);
    });
  }

  public setTranscribedTextCallback(callback: (text: string) => void) {
    this.onTranscribedText = callback;
  }

  public setLLMResponseCallback(callback: (text: string) => void) {
    this.onLLMResponse = callback;
  }

  public setConnectionStateChangeCallback(callback: (state: ConnectionState) => void) {
    this.onConnectionStateChange = callback;
  }

  public async connect(identity: string): Promise<void> {
    try {
      if (!this.room) return;

      if (this.room.state === ConnectionState.Connected) {
        console.log("Already connected to room");
        return;
      }

      const token = await getToken({
        roomName: ROOM_NAME,
        participantIdentity: identity,
      });

      await this.room.connect(token, {
        autoSubscribe: true,
      });

      console.log("Connected to room:", this.room.name);
      
      // Enable local audio
      await this.enableAudio();
      
    } catch (error) {
      console.error("Failed to connect to room:", error);
      toast.error("Failed to connect to voice assistant room");
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.room) {
      this.room.disconnect();
    }
  }

  public async enableAudio(): Promise<void> {
    try {
      if (!this.room) return;

      const localParticipant = this.room.localParticipant as LocalParticipant;
      
      // Get local audio tracks
      await localParticipant.enableMicrophone();
      
      console.log("Local audio enabled");
    } catch (error) {
      console.error("Failed to enable audio:", error);
      toast.error("Failed to enable microphone");
      throw error;
    }
  }

  public async disableAudio(): Promise<void> {
    try {
      if (!this.room) return;

      const localParticipant = this.room.localParticipant as LocalParticipant;
      await localParticipant.disableMicrophone();
      
      console.log("Local audio disabled");
    } catch (error) {
      console.error("Failed to disable audio:", error);
      throw error;
    }
  }

  public isConnected(): boolean {
    return this.room?.state === ConnectionState.Connected;
  }
}

// Export as singleton
const livekitService = new LiveKitService();
export default livekitService;
