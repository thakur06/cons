/**
 * Role-Based Access Control Middleware
 * Usage: authorizeRoles('Admin', 'Manager')
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User is not authenticated.' });
    }

    const userRole = req.user.role_name;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: `Forbidden: Role '${userRole || 'Unknown'}' is not authorized to perform this action. Required roles: [${allowedRoles.join(', ')}]`
      });
    }

    next();
  };
};

module.exports = authorizeRoles;
