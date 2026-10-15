function analyzeRequest(description) {
  const text = description.toLowerCase();

  let category = "General";
  let priority = "Medium";
  let recommendedAction = "Review request manually";

  if (text.includes("refund")) {
    category = "Refund";
    recommendedAction = "Approve refund if invoice is valid";
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
    text.includes("immediately") ||
    text.includes("critical")
  ) {
    priority = "High";
  }

  const confidence = Math.floor(Math.random() * 41) + 60;

  return {
    category,
    priority,
    confidence,
    recommendedAction,
  };
}

module.exports = {
  analyzeRequest,
};