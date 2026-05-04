import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limiter';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 login attempts per 15 minutes per IP
    const ip = getClientIp(request);
    const rateLimitResult = rateLimit(ip, 5, 15 * 60 * 1000);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan login. Silakan coba lagi dalam beberapa menit.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Username/email dan password wajib diisi.' },
        { status: 400 }
      );
    }

    // Find user by email or username - use separate queries to avoid SQL injection
    const { data: userByEmail, error: emailError } = await supabase
      .from('users')
      .select('id, email, username, password, role')
      .eq('email', identifier)
      .is('deleted_at', null)
      .maybeSingle();

    const { data: userByUsername, error: usernameError } = await supabase
      .from('users')
      .select('id, email, username, password, role')
      .eq('username', identifier)
      .is('deleted_at', null)
      .maybeSingle();

    const user = userByEmail || userByUsername;

    if (!user) {
      return NextResponse.json(
        { error: 'Username atau password salah.' },
        { status: 401 }
      );
    }

    // Verify password with bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Username atau password salah.' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = await signToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });

    // Set cookie and return success
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });

    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
