import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#faf8f3] px-6 py-12">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <Link href="/" className="text-sm text-[#3a7d44] underline underline-offset-2">
          ← Field Day
        </Link>
        <h1 className="text-2xl font-bold text-[#2d1a0e]">Privacy Policy</h1>
        <p className="text-sm text-[#7a6e65]">Last updated: this is an early build — expect changes.</p>

        <div className="flex flex-col gap-4 text-sm text-[#2d1a0e] leading-relaxed">
          <section>
            <h2 className="font-bold mb-1">What we collect</h2>
            <p>
              When you sign in with Google, we receive your name, email address, and profile photo. We store what
              you add to your profile (bio, age, location, gender, interests, vibe quiz results) and the matches,
              game results, and field notes generated as you use the app.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-1">What we don&apos;t do</h2>
            <p>
              We don&apos;t sell your data. We don&apos;t show your exact location or last name to a match before
              you&apos;ve connected. Match partners only see your first name, photo, bio, and vibe type — not your
              age, gender, or location.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-1">How matching uses your data</h2>
            <p>
              Your profile and vertical preferences are used to find and score compatible matches. For Dating, who
              you&apos;re shown to and matched with is filtered by the preferences you set — we never match outside
              what you&apos;ve told us you&apos;re looking for.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-1">Reports and safety</h2>
            <p>
              If you report or block someone, we store that report so it can be reviewed. It is not shared with the
              person you reported.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-1">Your data, your control</h2>
            <p>You can update your profile at any time. To request deletion of your account and data, reach out through the app.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
