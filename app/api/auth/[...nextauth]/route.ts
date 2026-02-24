import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";

const allowedAdminEmail = process.env.ADMIN_EMAIL;

const handler = NextAuth({
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async signIn({ user, profile }) {
      const email = user.email || profile?.email;

      return email === allowedAdminEmail;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email;
      }

      return session;
    },
  },
});

export { handler as GET, handler as POST };
