import { NextResponse } from 'next/server';
import { logoutUser } from '@/app/lib/auth/auth-service';

export async function POST() {
  try {
    logoutUser();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
