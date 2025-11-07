import { Request, Response } from 'express';
import prisma from '../prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

// Register user - PERBAIKI RESPONSE
export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ success: false, message: 'Missing required fields' });

    const existing = await prisma.users.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ success: false, message: 'Email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.users.create({
      data: { username, email, password: hashed },
    });

    const { password: _, ...safeUser } = user;
    
    res.status(201).json({ 
      success: true, 
      message: 'User registered successfully', // RESPONSE SESUAI DOKUMEN
      data: safeUser 
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Login user - PERBAIKI RESPONSE
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Missing required fields' });

    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1d' });
    
    res.json({ 
      success: true, 
      message: 'Login successfully', // RESPONSE SESUAI DOKUMEN
      data: {
        access_token: token
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get current user - PERBAIKI RESPONSE
export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId)
      return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    const { password: _, ...safeUser } = user;
    
    res.json({ 
      success: true, 
      message: 'Get me successfully', // RESPONSE SESUAI DOKUMEN
      data: safeUser 
    });
  } catch (err) {
    console.error('Get current user error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};