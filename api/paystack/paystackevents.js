import Transaction from "../models/transaction.js";
import { activatePayment } from "./activatePayment.js";

export async function handlePaystackEvent(event) {
  if (!event || !event.data || !event.data.reference) {
    return { ignored: true };
  }

  switch (event.event) {
    case "charge.success": {
      return activatePayment(event.data.reference, event.data);
    }

    case "charge.failed": {
      return Transaction.findOneAndUpdate(
        { reference: event.data.reference, status: "pending" },
        {
          $set: {
            status: "failed",
            failureReason: event.data.gateway_response || "payment_failed",
            gatewayResponse: event.data.gateway_response || "payment_failed",
          },
        },
        { new: true }
      );
    }

    default:
      return { ignored: true };
  }
}