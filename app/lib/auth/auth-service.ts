import { prisma } from '../db/prisma';
import { verifyPassword, hashPassword } from './password';
import { generateToken, setAuthCookie, removeAuthCookie, JwtPayload } from './jwt';

interface LoginResult {
  success: boolean;
  message?: string;
  requiresPassword?: boolean;
  user?: {
    id: string;
    username: string;
    isAdmin: boolean;
  };
}

interface RegisterResult {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    username: string;
  };
}

/**
 * Login a user with username and optional password
 */
export async function loginUser(username: string, password?: string): Promise<LoginResult> {
  try {
    // Find the user by username
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        isAdmin: true,
      },
    });

    // User not found
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // If user has a password set, but none was provided in the request
    if (user.passwordHash && !password) {
      return {
        success: false,
        requiresPassword: true,
        message: 'Password required'
      };
    }

    // Verify password if user has one set
    if (user.passwordHash) {
      const isValidPassword = await verifyPassword(password || '', user.passwordHash);
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Invalid password'
        };
      }
    }

    // Generate JWT token
    const payload: JwtPayload = {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    };

    const token = generateToken(payload);

    // Set the token as a cookie
    setAuthCookie(token);

    // Update last active timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() },
    });

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      },
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'An error occurred during login'
    };
  }
}

/**
 * Register a new user
 */
export async function registerUser(username: string, password?: string, isAdmin = false): Promise<RegisterResult> {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return {
        success: false,
        message: 'Username already taken'
      };
    }

    // Hash password if provided
    let passwordHash: string | null = null;
    if (password) {
      passwordHash = await hashPassword(password);
    }

    // Create the new user
    const newUser = await prisma.user.create({
      data: {
        username,
        passwordHash,
        isAdmin,
      },
      select: {
        id: true,
        username: true,
      },
    });

    return {
      success: true,
      user: newUser,
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      message: 'An error occurred during registration'
    };
  }
}

/**
 * Logout the current user
 */
export function logoutUser(): void {
  removeAuthCookie();
}
