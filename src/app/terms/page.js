import Navbar from "@/Components/Navbar";

export const metadata = {
  title: "Terms of Service | PeerVia",
  description: "The terms for using PeerVia.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 py-16 text-ink">
        <h1 className="font-display text-3xl mb-2">Terms of Service</h1>
        <p className="text-sm text-muted mb-10">Last updated: October 16, 2026</p>

        <div className="space-y-8 text-[15px] leading-relaxed">
          <section>
            <h2 className="font-display text-xl mb-2">1. Who we are</h2>
            <p>
              PeerVia ("we", "us") runs the website peervia.org, where students can ask
              questions and get real answers from university students and recent graduates
              ("ambassadors"). By creating an account or using the site, you agree to these
              Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">2. Who can use PeerVia</h2>
            <p>
              You must be at least 13 years old to create an account. If you are under 18,
              a parent or guardian must approve your account before you can use it. Ambassadors
              must be at least 18 years old.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">3. Your account</h2>
            <p>
              You can sign up with an email and password, or with Google or Microsoft. You are
              responsible for keeping your login details safe and for everything that happens
              under your account. Please give us accurate information.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">4. What you post</h2>
            <p>
              You own the questions, comments and other content you post. By posting, you give
              us permission to display it on PeerVia. Do not post anything unlawful, hateful,
              harassing, misleading, or that shares someone else's private information. We may
              remove content or accounts that break these rules.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">5. Advice from ambassadors</h2>
            <p>
              Ambassadors share personal experiences and opinions. This is not professional,
              academic, legal, medical or financial advice, and we cannot guarantee that it is
              accurate or right for you. Please make your own decisions and check important
              details with official sources.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">6. Acceptable use</h2>
            <p>
              Do not try to break, overload or gain unauthorised access to the site, scrape it
              in bulk, or use it to contact people for anything other than its intended purpose.
              Keep conversations with ambassadors on the platform and respectful.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">7. Ending your account</h2>
            <p>
              You can delete your account at any time from Settings. We may suspend or remove
              accounts that break these Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">8. Disclaimer and liability</h2>
            <p>
              PeerVia is provided "as is", without warranties of any kind. To the extent the
              law allows, we are not liable for losses arising from your use of the site or from
              reliance on content posted by others.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">9. Changes</h2>
            <p>
              We may update these Terms from time to time. If you keep using PeerVia after a
              change, you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-2">10. Contact</h2>
            <p>
              Questions? Email{" "}
              <a href="mailto:info.peervia@gmail.com" className="underline">
                info.peervia@gmail.com
              </a>
              . See also our{" "}
              <a href="/privacy" className="underline">Privacy Policy</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}