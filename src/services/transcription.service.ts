import { AssemblyAI } from "assemblyai";
import { logger } from "../utils/logger";
import { AppError } from "../middleware/errorHandler.middleware";
import { env } from "../config/env";

interface TranscriptionResult {
  id: string;
  status: "queued" | "processing" | "completed" | "error";
  text?: string;
  confidence?: number;
  words?: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  error?: string;
}

export class TranscriptionService {
  private client: AssemblyAI;

  constructor() {
    this.client = new AssemblyAI({
      apiKey: env.ASSEMBLYAI_API_KEY,
    });
  }

  /**
   * Submit audio for transcription
   * @param audioUrl - Public URL to audio file (Cloudinary URL)
   * @returns Transcript ID for polling
   */
  async submitTranscription(audioUrl: string): Promise<string> {
    try {
      logger.info("Submitting audio for transcription", { audioUrl });

      const transcript = await this.client.transcripts.submit({
        audio_url: audioUrl,
        language_code: "en", // English for Wema Bank Nigeria
        punctuate: true,
        format_text: true,
        speaker_labels: false, // Disable speaker diarization for MVP
      });

      logger.info("Transcription submitted successfully", {
        transcriptId: transcript.id,
        status: transcript.status,
      });

      return transcript.id;
    } catch (error) {
      logger.error("Failed to submit audio for transcription", { error });
      throw new AppError(
        500,
        "TRANSCRIPTION_SUBMIT_FAILED",
        `Failed to submit transcription: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get transcription result by ID
   * @param transcriptId - AssemblyAI transcript ID
   * @returns Transcription result
   */
  async getTranscript(transcriptId: string): Promise<TranscriptionResult> {
    try {
      const transcript = await this.client.transcripts.get(transcriptId);

      const result: TranscriptionResult = {
        id: transcript.id,
        status: transcript.status as TranscriptionResult["status"],
      };

      if (transcript.status === "completed") {
        result.text = transcript.text || "";
        result.confidence = transcript.confidence ?? undefined;
        result.words = transcript.words?.map((word) => ({
          text: word.text,
          start: word.start,
          end: word.end,
          confidence: word.confidence,
        }));
      } else if (transcript.status === "error") {
        result.error = transcript.error || "Unknown transcription error";
      }

      return result;
    } catch (error) {
      logger.error("Failed to get transcript", { transcriptId, error });
      throw new AppError(
        500,
        "TRANSCRIPTION_GET_FAILED",
        `Failed to get transcript: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Poll for transcription completion
   * @param transcriptId - AssemblyAI transcript ID
   * @param maxAttempts - Maximum polling attempts (default: 60 = 5 minutes)
   * @param intervalMs - Polling interval in milliseconds (default: 5000 = 5 seconds)
   * @returns Completed transcription result
   */
  async pollTranscription(
    transcriptId: string,
    maxAttempts: number = 60,
    intervalMs: number = 5000
  ): Promise<TranscriptionResult> {
    logger.info("Polling for transcription completion", {
      transcriptId,
      maxAttempts,
      intervalMs,
    });

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = await this.getTranscript(transcriptId);

      logger.debug(`Transcription polling attempt ${attempt}/${maxAttempts}`, {
        transcriptId,
        status: result.status,
      });

      if (result.status === "completed") {
        logger.info("Transcription completed successfully", {
          transcriptId,
          textLength: result.text?.length,
          confidence: result.confidence,
        });
        return result;
      }

      if (result.status === "error") {
        logger.error("Transcription failed with error", {
          transcriptId,
          error: result.error,
        });
        throw new AppError(
          500,
          "TRANSCRIPTION_FAILED",
          `Transcription failed: ${result.error}`
        );
      }

      // Still processing, wait before next poll
      if (attempt < maxAttempts) {
        await this.sleep(intervalMs);
      }
    }

    // Max attempts reached
    logger.error("Transcription polling timed out", {
      transcriptId,
      maxAttempts,
    });
    throw new AppError(
      500,
      "TRANSCRIPTION_TIMEOUT",
      `Transcription polling timed out after ${maxAttempts} attempts`
    );
  }

  /**
   * Delete transcript from AssemblyAI (cleanup)
   */
  async deleteTranscript(transcriptId: string): Promise<void> {
    try {
      await this.client.transcripts.delete(transcriptId);
      logger.info("Transcript deleted successfully", { transcriptId });
    } catch (error) {
      logger.warn("Failed to delete transcript", { transcriptId, error });
      // Don't throw error - this is cleanup operation
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const transcriptionService = new TranscriptionService();
