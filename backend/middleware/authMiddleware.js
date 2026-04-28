const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { getUserAbility } = require("../services/rbacService");

/**
 * Verifies the Bearer access token, loads the user, and attaches both
 * `req.user` and a CASL `req.ability` to the request for downstream use.
 */
exports.authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Not authorized — no token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== "access") {
      return res.status(401).json({ error: "Invalid token type" });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub, deletedAt: null },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ error: "Email not verified" });
    }

    req.user = user;
    req.ability = await getUserAbility(user.id);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

/**
 * Middleware factory — requires a specific CASL (action, resource) permission.
 * Must be used after `authenticate`.
 */
exports.authorize = (action, resource) => (req, res, next) => {
  if (!req.ability?.can(action, resource)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};

// Backwards-compat alias used by existing code during the transition
exports.protect = exports.authenticate;
