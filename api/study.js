// api/study.js  —  Vercel Serverless Function
// Your Anthropic API key lives only here, in an environment variable.
// The browser never sees it.

const SYSTEM_PROMPT = `You are an expert study assistant for the TExES Core Subjects EC-6 (391) exam, specifically the Social Studies component. You help teacher candidates preparing to teach grades EC-6 in Texas.

When generating REVIEW content: Write a clear, accessible 3-4 paragraph overview of the topic. Use concrete examples appropriate for understanding at the EC-6 level. End with 3 key takeaways formatted as: KEY_TAKEAWAY: [takeaway text]

When generating QUIZ questions: Generate exactly 4 multiple choice questions. Format strictly as JSON array:
[
  {
    "question": "question text",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct": 0,
    "explanation": "2-3 sentence explanation of why this answer is correct and why others are wrong"
  }
]
Return ONLY the JSON array, no other text.

When generating RESOURCES: List 5 specific, high-quality free resources (websites, tools, or documents) relevant to this topic for EC-6 teacher candidates. Format each as:
RESOURCE: [Title] | [URL or description] | [One sentence on why it's useful]`;

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,   // ← set this in Vercel dashboard
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", err);
      return res.status(500).json({ error: "Upstream API error" });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    return res.status(200).json({ text });

  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
