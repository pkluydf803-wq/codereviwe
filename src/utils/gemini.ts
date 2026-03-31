import { ReviewResult } from "../types";

export async function reviewCode(code: string, language: string, customPrompt?: string): Promise<ReviewResult> {
  console.log(`Requesting backend review for ${language} ...`);
  try {
    const response = await fetch("/api/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, language, customPrompt }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to perform AI review");
    }

    return await response.json();
  } catch (error) {
    console.error("Review Request Error:", error);
    throw error;
  }
}
