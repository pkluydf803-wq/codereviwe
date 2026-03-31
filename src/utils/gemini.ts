import { ReviewResult } from "../types";

export async function reviewCode(code: string, language: string, customPrompt?: string): Promise<ReviewResult> {
  console.log(`Requesting backend review for ${language} ...`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

  try {
    const response = await fetch("/api/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, language, customPrompt }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown server error" }));
      throw new Error(errorData.error || "Failed to perform AI review");
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error("Review request timed out. Please try again.");
    }
    console.error("Review Request Error:", error);
    throw error;
  }
}
