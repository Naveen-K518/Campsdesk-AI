import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  email: string;
  role: 'student' | 'mentor' | 'faculty' | 'admin';
  studentId?: string | null;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

import { JWT_SECRET } from '../config/env';
export { JWT_SECRET };

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please sign in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token. Please sign in again.' });
    }
    req.user = decoded as AuthUser;
    next();
  });
}

export function requireRole(allowedRoles: Array<'student' | 'mentor' | 'faculty' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const effectiveRoles = new Set(allowedRoles);
    if (effectiveRoles.has('mentor')) effectiveRoles.add('faculty');
    if (effectiveRoles.has('faculty')) effectiveRoles.add('mentor');

    if (!effectiveRoles.has(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: requires one of [${allowedRoles.join(', ')}] role` });
    }
    next();
  };
}

