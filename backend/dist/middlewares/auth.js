import jwt from 'jsonwebtoken';
export const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET || 'gestmagasin_secret_jwt_key_2026';
        try {
            const decoded = jwt.verify(token, secret);
            req.user = decoded;
            return next();
        }
        catch (err) {
            return res.status(403).json({ success: false, message: 'Session invalide ou expirée' });
        }
    }
    return res.status(401).json({ success: false, message: 'Authentification requise' });
};
export const authorizeRoles = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Non authentifié' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Accès refusé. Rôle '${req.user.role}' non autorisé sur cette ressource.`
            });
        }
        next();
    };
};
