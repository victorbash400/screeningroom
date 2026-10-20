import "server-only";

export const nativeYoutubeEnabled = () => Boolean(process.env.GEMINI_API_KEY?.trim());
export const youtubeModelId = () => process.env.GEMINI_YOUTUBE_MODEL_ID?.trim() || "gemini-3-flash-preview";
