const testCases = [
  "Customer requests a refund because order ORD-1001 arrived damaged.",
  "Invoice INV-2002 contains an incorrect amount and needs urgent correction.",
  "Customer submitted a complaint because support did not answer for three days.",
  "Order ORD-3003 has not arrived and the customer wants a delivery update.",
  "Customer wants information about the warranty period for a product.",
  "Urgent refund request for invoice INV-4004 after duplicate payment.",
  "Critical complaint: customer received the wrong product and needs immediate assistance.",
  "Invoice INV-5005 appears to be duplicated. Please validate it.",
  "Customer wants to cancel order ORD-6006 before shipment.",
  "Customer says the payment was charged twice but does not know the invoice number.",
  "Customer asks whether their order can be delivered to another address.",
  "Customer is unhappy with the service but does not provide additional details."
];

async function runTests() {
  console.log("Running FlowPilot AI test set...\n");

  for (let i = 0; i < testCases.length; i++) {
    const description = testCases[i];

    try {
      const response = await fetch(
        "http://localhost:5000/api/requests",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ description }),
        }
      );

      if (!response.ok) {
        console.log(
          `Test ${i + 1}: FAILED - HTTP ${response.status}`
        );
        continue;
      }

      const result = await response.json();

      console.log(`Test ${i + 1}`);
      console.log(`Input: ${description}`);
      console.log(`Category: ${result.type}`);
      console.log(`Priority: ${result.priority}`);
      console.log(`Confidence: ${result.confidence}%`);
      console.log(`Status: ${result.status}`);
      console.log(
        `Recommended action: ${result.recommendedAction}`
      );
      console.log("----------------------------------------");
    } catch (error) {
      console.log(`Test ${i + 1}: ERROR`);
      console.log(error.message);
      console.log("----------------------------------------");
    }
  }
}

runTests();