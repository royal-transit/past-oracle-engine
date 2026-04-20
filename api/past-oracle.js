export default function handler(req, res) {
  res.status(200).json({
    status: "FORCE TEST OK",
    version: "V2 LIVE CHECK"
  });
}