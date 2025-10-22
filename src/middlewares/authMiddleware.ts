import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

export default function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'Authorization header missing' });

  const [type, token] = authHeader.split(' ');
  if (type !== 'Bearer' || !token)
    return res.status(401).json({ message: 'Invalid Authorization format' });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    (req as any).userId = payload.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
