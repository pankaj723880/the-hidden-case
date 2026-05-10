export function requireAdmin(req, res, next) {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Missing auth" });
  if (user.role !== "admin")
    return res.status(403).json({ error: "Admin only" });
  next();
}
