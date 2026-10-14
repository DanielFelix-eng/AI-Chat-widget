import Widget from "../models/Widget.js";

export async function checkWidgetOrigin(req, res, next) {
  const widgetKey = req.headers["x-widget-key"] || req.query.key;
  if (!widgetKey) return res.status(400).json({ message: "Missing widget key" });

  const widget = await Widget.findOne({ publicKey: widgetKey, isActive: true });
  if (!widget) return res.status(404).json({ message: "Widget not found" });

  const origin = req.headers.origin;
  if (origin) {
    let host;
    try { host = new URL(origin).hostname.toLowerCase(); }
    catch { return res.status(403).json({ message: "Bad origin" }); }

    const allowed = widget.allowedDomains.length === 0 ||
      widget.allowedDomains.some((d) => host === d || host.endsWith(`.${d}`));

    if (!allowed) return res.status(403).json({ message: "Domain not allowed for this widget" });
  }

  req.widget = widget;   // downstream handlers use this
  next();
}