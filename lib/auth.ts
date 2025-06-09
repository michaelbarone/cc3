import bcrypt from "bcryptjs";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./db/prisma";

// Define a type for the database user
type DbUser = {
  id: string;
  name: string;
  passwordHash: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  theme: string | null;
  menuPosition: string | null;
};

// Define the NextAuth user type with the fields we need
type AuthUser = {
  id: string;
  name: string;
  role: string;
  isAdmin: boolean;
  isActive: boolean;
  theme: string;
  menuPosition: string;
};

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    // Default session expires in 1 week (7 days)
    maxAge: parseInt(process.env.NEXTAUTH_SESSION_MAX_AGE_SECONDS || "604800"),
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember Me", type: "checkbox" },
      },
      async authorize(credentials) {
        if (!credentials?.username) {
          return null;
        }

        try {
          // Find the user by name using raw SQL to bypass type issues
          const users = await prisma.$queryRaw<DbUser[]>`
            SELECT u.id, u.name, u.passwordHash, u.role, u.isActive, u.lastLoginAt,
                   s.theme, s.menuPosition
            FROM "User" u
            LEFT JOIN "UserSetting" s ON u."id" = s."userId"
            WHERE u."name" = ${credentials.username}
            LIMIT 1
          `;

          const user = users[0];

          if (!user) {
            console.log("User not found:", credentials.username);
            return null;
          }

          // If user is not active, return null
          if (!user.isActive) {
            console.log("User not active:", credentials.username);
            return null;
          }

          // If user has a password, verify it
          if (user.passwordHash) {
            if (!credentials.password) {
              console.log("Password required but not provided");
              return null;
            }

            // Verify password
            const passwordValid = await bcrypt.compare(credentials.password, user.passwordHash);
            if (!passwordValid) {
              console.log("Invalid password for user:", credentials.username);
              return null;
            }
          } else {
            // If user has no password, this is only allowed during first run for admin
            if (user.role !== "ADMIN" || user.lastLoginAt) {
              console.log("Passwordless login not allowed for this user");
              return null;
            }
            // First run admin user with no password is allowed
            console.log("First run admin login allowed");
          }

          // Return the user data to be stored in the JWT token
          return {
            id: user.id,
            name: user.name,
            role: user.role,
            isAdmin: user.role === "ADMIN",
            isActive: user.isActive,
            theme: user.theme || "SYSTEM",
            menuPosition: user.menuPosition || "TOP",
          };
        } catch (error) {
          console.error("Error in authorize:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isAdmin = user.isAdmin;
        token.isActive = user.isActive;
        token.theme = user.theme;
        token.menuPosition = user.menuPosition;
      }

      // Update token if session is updated
      if (trigger === "update" && session) {
        if (session.theme) token.theme = session.theme;
        if (session.menuPosition) token.menuPosition = session.menuPosition;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        // session.user.isAdmin = token.role === "ADMIN" ? true : false;
        session.user.isActive = token.isActive;
        session.user.theme = token.theme;
        session.user.menuPosition = token.menuPosition;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      // Update the lastLoginAt field
      if (user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
      }
    },
  },
};
