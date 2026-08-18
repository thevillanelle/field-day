import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { createAdminClient } from "@/lib/supabase/admin";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // On first sign-in, upsert into Supabase `users` and stash the DB
      // UUID (not the Google sub) as the id everything downstream uses.
      if (user?.email && account?.providerAccountId) {
        const emailDomain = user.email.split("@")[1];
        token.emailDomain = emailDomain;

        const supabase = createAdminClient();
        const { data, error } = await supabase
          .from("users")
          .upsert(
            {
              email: user.email,
              name: user.name ?? user.email,
              avatar_url: user.image ?? null,
              google_id: account.providerAccountId,
              email_domain: emailDomain,
            },
            { onConflict: "google_id" }
          )
          .select("id")
          .single();

        if (error) {
          console.error("Failed to sync user to Supabase:", error.message);
        } else {
          token.dbUserId = data.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.dbUserId) session.user.id = token.dbUserId;
      if (token.emailDomain) session.user.emailDomain = token.emailDomain;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
