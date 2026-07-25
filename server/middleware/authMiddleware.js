const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  console.log("Authorization header:", authHeader);

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Access Denied. No Token Provided."
    });
  }

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Invalid authorization format"
    });
  }

  const token = authHeader.split(" ")[1];

  console.log("Token received:", token);
  console.log("JWT secret exists:", !!process.env.JWT_SECRET);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("Decoded user:", decoded);

    req.user = decoded;

    next();
  } catch (err) {
    console.error("JWT verification error:", err.message);

    return res.status(401).json({
      success: false,
      message: "Invalid Token",
      error: err.message
    });
  }
};

module.exports = verifyToken;