import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET_STRING = process.env.JWT_SECRET;

if (!JWT_SECRET_STRING || JWT_SECRET_STRING.length === 0) {
  throw new Error('JWT_SECRET environment variable is required and cannot be empty');
}

const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  role: string;
}

export async function signToken(user: SessionUser): Promise<string> {
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}
