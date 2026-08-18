import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#faf8f3] px-6 py-12">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <Link href="/" className="text-sm text-[#3a7d44] underline underline-offset-2">
          ← Field Day
        </Link>
        <h1 className="text-2xl font-bold text-[#2d1a0e]">Terms of Service</h1>
        <p className="text-sm text-[#7a6e65]">Last updated: this is an early build — expect changes.</p>

        <div className="flex flex-col gap-4 text-sm text-[#2d1a0e] leading-relaxed">
          <section>
            <h2 className="font-bold mb-1">Who can use Field Day</h2>
            <p>You must be at least 18 years old to create an account. By signing up, you confirm you meet this requirement.</p>
          </section>

          <section>
            <h2 className="font-bold mb-1">What Field Day is</h2>
            <p>
              Field Day matches you with another person and suggests a game for you to play together, asynchronously
              or live, as a low-pressure way to meet. It is not a substitute for your own judgment about who to meet
              and how — you&apos;re responsible for your own safety and conduct when interacting with other members.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-1">Conduct</h2>
            <p>
              Harassment, impersonation, sharing another member&apos;s information without consent, and using Field
              Day to solicit, scam, or advertise are not allowed. We can suspend or remove accounts that violate
              this. Use the report or block option on a match if something feels wrong.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-1">Your content</h2>
            <p>
              You own what you write in your profile and in field notes. By posting it, you give Field Day
              permission to store and display it to the people you&apos;re matched with, for the purpose of running
              the service.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-1">No warranty</h2>
            <p>
              Field Day is an early-stage product and is provided as-is, without warranty of any kind, while we
              build it out.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-1">Changes</h2>
            <p>We may update these terms as the product evolves. Continued use after a change means you accept the update.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
