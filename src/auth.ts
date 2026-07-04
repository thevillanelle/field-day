import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, stash email domain in token
      if (user?.email) {
        token.emailDomain = user.email.split("@")[1];
      }
      return token;
    },
    async session({ session, token }) {
      // Expose google sub as id (replaced with DB UUID by syncUser API route)
      if (token.sub) session.user.id = token.sub;
      if (token.emailDomain) session.user.emailDomain = token.emailDomain as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
