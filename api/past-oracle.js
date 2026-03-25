export default function handler(req, res) {
  res.status(200).json({
    status: "past oracle ready",
    engine: "active",
    timestamp: new Date().toISOString()
  });
}
