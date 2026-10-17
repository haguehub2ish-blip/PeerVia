import Navbar from "@/Components/Navbar";

export const metadata = {
  title: "Privacy Policy | PeerVia",
  description: "How PeerVia collects, uses and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 py-16 text-ink">
        <h1 className="font-display text-3xl mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted mb-10">Last updated: October 16, 2026</p>

        <div className="space-y-8 text-[15px] leading-relaxed">
          <section>
            <h2 className="font-display text-xl mb-2">1. Who we are</h2>
            <p>
              PeerVia operates peervia.org. This policy explains what personal data we collect,
              why, and what your choices are. Contact:{" "}
              <a href="mailto:info.peervia@gmail.com" className="underline">
                info.peervia@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">2. What we collect</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Account details:</strong> your name and email address. If you sign in
                with Google or Microsoft, we receive your name and email from them. We do not
                get your Google or Microsoft password.
              </li>
              <li>
                <strong>Age information:</strong> your date of birth, used to check your age.
                If you are under 18, we also collect your parent or guardian's email address
                so they can approve your account.
              </li>
              <li>
                <strong>Your activity:</strong> questions, comments, likes, and messages or
                call requests you make through the site.
              </li>
              <li>
                <strong>Ambassador applications:</strong> the details ambassadors submit when
                they apply.
              </li>
              <li>
                <strong>Usage data:</strong> which pages are viewed, linked to a random visitor
                ID stored in your browser (and to your account if you are logged in). We use
                this to understand how the site is used.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">3. How we use it</h2>
            <p>
              To create and run your account, verify age and parental approval, show your
              questions and answers, send emails about your account and activity, keep the site
              safe, and improve it. We do not sell your personal data and we do not use it for
              advertising.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">4. Under-18s</h2>
            <p>
              You must be at least 13 to use PeerVia. For users under 18 we email a parent or
              guardian and the account stays inactive until they approve. A parent or guardian
              can contact us at any time to ask what we hold about their child or to have it
              deleted.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">5. Who we share it with</h2>
            <p>We use trusted service providers to run PeerVia:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Supabase: database and authentication</li>
              <li>Vercel: website hosting</li>
              <li>Resend: sending emails</li>
              <li>Google and Microsoft: optional sign-in</li>
            </ul>
            <p className="mt-2">
              These providers only process data on our behalf. We may also share information
              if the law requires it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">6. Cookies and local storage</h2>
            <p>
              We use your browser's storage to keep you logged in and to remember a random
              visitor ID for basic usage statistics. We do not use advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">7. How long we keep it</h2>
            <p>
              We keep your data while your account is active. When you delete your account from
              Settings, your account is removed. Some records may be kept for a short time where
              the law requires it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">8. Your rights</h2>
            <p>
              Depending on where you live (for example under the GDPR in the EU/UK), you can ask
              to access, correct, export or delete your data, or object to how we use it. Email
              us and we will respond. You can delete your account yourself in Settings.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">9. Security</h2>
            <p>
              We use reputable providers and access controls to protect your data, but no online
              service is completely secure.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">10. Changes</h2>
            <p>
              We may update this policy and will change the date above when we do.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">11. Ambassadors</h2>
            <p>
              Ambassadors are also covered by the{" "}
              <a
                href="/documents/PeerVia-Ambassador-Privacy-Policy.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Ambassador Privacy Policy and Liability Disclaimer (PDF)
              </a>
              . See also our <a href="/terms" className="underline">Terms of Service</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}