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
      let errorMessage = `Server error (${response.status})`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // Fallback to status code if JSON parsing fails
      }
      throw new Error(errorMessage);
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
