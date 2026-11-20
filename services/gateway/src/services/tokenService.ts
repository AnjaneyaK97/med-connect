import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
}

export interface RefreshTokenPayload {
  userId: string;
}

export class TokenService {
  public static signAccessToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: config.jwt.accessExpiry as any,
      issuer: 'mediconnect-gateway',
      audience: 'mediconnect-client',
    };
    return jwt.sign(payload, config.jwt.accessSecret, options);
  }

  public static signRefreshToken(payload: RefreshTokenPayload): string {
    const options: SignOptions = {
      expiresIn: config.jwt.refreshExpiry as any,
      issuer: 'mediconnect-gateway',
      audience: 'mediconnect-client',
    };
    return jwt.sign(payload, config.jwt.refreshSecret, options);
  }

  public static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, config.jwt.accessSecret, {
      issuer: 'mediconnect-gateway',
      audience: 'mediconnect-client',
    }) as TokenPayload;
  }

  public static verifyRefreshToken(token: string): RefreshTokenPayload {
    return jwt.verify(token, config.jwt.refreshSecret, {
      issuer: 'mediconnect-gateway',
      audience: 'mediconnect-client',
    }) as RefreshTokenPayload;
  }

  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
