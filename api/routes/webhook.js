import express from "express";
import crypto from "crypto";
import { handlePaystackEvent } from "../paystack/paystackevents.js";

const router = express.Router();

router.post("/paystack", express.raw({ type: "application/json" }), (req, res) => {
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(req.body)
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) return res.sendStatus(401);

  res.sendStatus(200); // acknowledge immediately

  const event = JSON.parse(req.body.toString("utf8"));
  handlePaystackEvent(event).catch((err) => console.error("Webhook error", err));
});

export default router;