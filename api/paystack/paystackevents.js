import Transaction from "../models/transaction.js";
import { activatePayment } from "./activatePayment.js";

export async function handlePaystackEvent(event) {
  switch (event.event) {
    case "charge.success":
      return activatePayment(event.data.reference, event.data);

    case "charge.failed":
      return Transaction.updateOne(
        { reference: event.data.reference, status: "pending" },
        { status: "failed", failureReason: event.data.gateway_response || null }
      );

    // later: invoice.payment_failed, subscription.create, subscription.disable...
    default:
      return;
  }
}