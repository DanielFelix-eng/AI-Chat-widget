import express from "express";
import crypto from "node:crypto";
import { handlePaystackEvent } from "../paystack/paystackevents.js";

const router = express.Router();

router.post("/paystack", express.raw({ type: "application/json" }), (req, res) => {
  const signature = req.headers["x-paystack-signature"];
  const secret = process.env.PAYSTACK_SECRET_KEY;

  if (!secret || !signature || typeof signature !== "string") {
    return res.status(401).json({ message: "Unsigned request." });
  }

  const expected = crypto.createHmac("sha512", secret).update(req.body).digest("hex");
  const provided = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (provided.length !== expectedBuffer.length || !crypto.timingSafeEqual(provided, expectedBuffer)) {
    return res.status(401).json({ message: "Invalid signature." });
  }

  res.status(200).json({ received: true });

  try {
    const event = JSON.parse(req.body.toString("utf8"));
    handlePaystackEvent(event).catch((error) => {
      console.error("Webhook processing error", { message: error.message });
    });
  } catch (error) {
    console.error("Invalid webhook payload", { message: error.message });
  }
});

export default router;