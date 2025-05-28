import { authOptions } from "@/lib/auth";
import NextAuth from "next-auth";

// Export the NextAuth handler with our configuration
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
