const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function localFallbackAnalysis(description) {
  const text = description.toLowerCase();

  let category = "General";
  let priority = "Medium";
  let recommendedAction = "Review request manually";

  if (text.includes("refund")) {
    category = "Refund";
    recommendedAction = "Validate the request and process the refund";
  } else if (text.includes("invoice")) {
    category = "Invoice";
    recommendedAction = "Validate invoice details";
  } else if (text.includes("complaint")) {
    category = "Complaint";
    recommendedAction = "Escalate to customer support";
  } else if (text.includes("order")) {
    category = "Order";
    recommendedAction = "Check order status";
  }

  if (
    text.includes("urgent") ||
    text.includes("critical") ||
    text.includes("immediately")
  ) {
    priority = "High";
  }

  return {
    category,
    priority,
    confidence: 70,
    recommendedAction,
    provider: "local-fallback",
  };
}

function cleanJsonResponse(text) {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

async function analyzeRequest(description) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn(
      "ANTHROPIC_API_KEY is missing. Using local fallback."
    );

    return localFallbackAnalysis(description);
  }

  try {
    const response = await anthropic.messages.create({
      model:
        process.env.ANTHROPIC_MODEL ||
        "claude-sonnet-4-5",

      max_tokens: 300,
      temperature: 0,

      system: `
You are the AI classification component of FlowPilot,
a business process automation platform.

Analyze the customer request.

Return ONLY valid JSON using exactly this structure:

{
  "category": "Refund",
  "priority": "Medium",
  "confidence": 92,
  "recommendedAction": "Validate invoice and approve refund"
}

Allowed categories:
- Refund
- Invoice
- Complaint
- Order
- General

Allowed priorities:
- Low
- Medium
- High

Rules:
- confidence must be an integer between 0 and 100
- recommendedAction must be concise and practical
- do not return markdown
- do not return explanations
- return JSON only
`,

      messages: [
        {
          role: "user",
          content: description,
        },
      ],
    });

    const textBlock = response.content.find(
      (block) => block.type === "text"
    );

    if (!textBlock) {
      throw new Error("Claude returned no text response");
    }

    const cleanedResponse = cleanJsonResponse(
      textBlock.text
    );

    const analysis = JSON.parse(cleanedResponse);

    const allowedCategories = [
      "Refund",
      "Invoice",
      "Complaint",
      "Order",
      "General",
    ];

    const allowedPriorities = [
      "Low",
      "Medium",
      "High",
    ];

    if (
      !allowedCategories.includes(analysis.category)
    ) {
      throw new Error("Invalid category returned by Claude");
    }

    if (
      !allowedPriorities.includes(analysis.priority)
    ) {
      throw new Error("Invalid priority returned by Claude");
    }

    if (
      typeof analysis.confidence !== "number" ||
      !Number.isFinite(analysis.confidence)
    ) {
      throw new Error("Invalid confidence returned by Claude");
    }

    if (
      typeof analysis.recommendedAction !== "string" ||
      !analysis.recommendedAction.trim()
    ) {
      throw new Error(
        "Invalid recommended action returned by Claude"
      );
    }

    const result = {
      category: analysis.category,
      priority: analysis.priority,
      confidence: Math.max(
        0,
        Math.min(
          100,
          Math.round(analysis.confidence)
        )
      ),
      recommendedAction:
        analysis.recommendedAction.trim(),
      provider: "claude",
    };

    console.log("Claude analysis successful:", result);

    return result;
  } catch (error) {
    console.error(
      "Claude analysis failed:",
      error.message
    );

    console.warn("Using local fallback analysis.");

    return localFallbackAnalysis(description);
  }
}

module.exports = {
  analyzeRequest,
};