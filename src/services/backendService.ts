
import { toast } from "sonner";

const API_URL = "http://localhost:8000"; // Make sure this matches your backend URL

interface TokenRequestParams {
  roomName: string;
  participantIdentity: string;
}

export const getToken = async ({ roomName, participantIdentity }: TokenRequestParams): Promise<string> => {
  try {
    const response = await fetch(`${API_URL}/get-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        room_name: roomName,
        participant_identity: participantIdentity,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to get token");
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error("Error getting token:", error);
    toast.error("Failed to connect to the voice assistant");
    throw error;
  }
};