import { Request, Response, NextFunction } from "express";
import { audioService } from "../services/audio.service";
import { AppError } from "../middleware/errorHandler.middleware";

export class AudioController {
  /**
   * Upload audio file
   * POST /api/v1/audio/upload
   */
  async uploadAudio(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError(400, "NO_FILE", "No audio file provided");
      }

      const userId = req.user?.userId;
      const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};

      const result = await audioService.processAudioUpload(
        req.file,
        userId,
        metadata
      );

      res.status(201).json({
        status: "success",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Stream audio file (redirect to Cloudinary URL)
   * GET /api/v1/audio/:feedbackId/stream
   */
  async streamAudio(req: Request, res: Response, next: NextFunction) {
    try {
      const { feedbackId } = req.params;

      const audioUrl = await audioService.getAudioUrl(feedbackId);

      // Redirect to Cloudinary URL for streaming
      res.redirect(audioUrl);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete audio file
   * DELETE /api/v1/audio/:feedbackId
   */
  async deleteAudio(req: Request, res: Response, next: NextFunction) {
    try {
      const { feedbackId } = req.params;

      await audioService.deleteAudio(feedbackId);

      res.status(200).json({
        status: "success",
        data: {
          message: "Audio deleted successfully",
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const audioController = new AudioController();
