export const metadata = {
  title: 'Terms of Service · Flock',
  description: 'Terms of Service for Flock fan communities platform.',
};

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F5EFE6', fontFamily: "'DM Sans', sans-serif", padding: '40px 20px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;600;700&display=swap');`}</style>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        <div style={{ marginBottom: 40 }}>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 32 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#8B1A2B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#F5EFE6' }}>✦</div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1018', textTransform: 'lowercase' }}>flock</span>
          </a>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#1A1018', marginBottom: 8, textTransform: 'lowercase' }}>terms of service</h1>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#6A5A62' }}>last updated: march 2026</p>
        </div>

        <div style={{ lineHeight: 1.8, color: '#1A1018' }}>

          <Section title="1. acceptance of terms">
            By accessing or using Flock ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform. These terms apply to all users including fans, artists, and administrators.
          </Section>

          <Section title="2. what flock is">
            Flock is a white-label fan community platform that enables independent artists and bands to create dedicated spaces where fans can connect, earn loyalty rewards, and engage with the artists they love. Each community is independently operated by the relevant artist or their management.
          </Section>

          <Section title="3. accounts">
            You must provide accurate information when creating an account. You are responsible for maintaining the security of your account and password. You must be at least 13 years old to use Flock. One person may not maintain more than one account per community.
          </Section>

          <Section title="4. user content">
            You retain ownership of content you post. By posting, you grant Flock and the relevant artist community a non-exclusive licence to display your content within the platform. You must not post content that is unlawful, harmful, abusive, defamatory, or infringes any third party's rights. We reserve the right to remove any content that violates these terms.
          </Section>

          <Section title="5. stamps and rewards">
            Stamps are loyalty points earned through community participation. They have no monetary value and cannot be transferred, sold, or exchanged for cash. Reward fulfilment is at the discretion of the individual artist. Flock is not responsible for reward delivery.
          </Section>

          <Section title="6. artist subscriptions">
            Artists pay a subscription fee to operate a Flock community. Subscriptions are billed monthly or annually. Cancellation takes effect at the end of the current billing period. No refunds are provided for partial periods.
          </Section>

          <Section title="7. prohibited conduct">
            You agree not to: harass, threaten, or intimidate other users; post spam or unsolicited promotions; attempt to gain unauthorised access to the platform; scrape or collect user data without permission; impersonate any person or entity.
          </Section>

          <Section title="8. termination">
            We may suspend or terminate your account at any time for violation of these terms. Artists may remove fans from their community at their discretion. You may delete your account at any time from your profile settings.
          </Section>

          <Section title="9. limitation of liability">
            Flock is provided "as is" without warranties of any kind. To the maximum extent permitted by law, Flock is not liable for any indirect, incidental, or consequential damages arising from your use of the platform.
          </Section>

          <Section title="10. changes to terms">
            We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the new terms. Material changes will be communicated via email.
          </Section>

          <Section title="11. governing law">
            These terms are governed by the laws of Victoria, Australia. Any disputes shall be resolved in the courts of Victoria.
          </Section>

          <Section title="12. contact">
            For questions about these terms, contact us via our <a href="/contact" style={{ color: '#8B1A2B' }}>contact form</a>.
          </Section>

        </div>

        <Footer />
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1A1018', textTransform: 'lowercase', fontFamily: "'DM Mono', monospace", letterSpacing: '0.5px', marginBottom: 10 }}>{title}</h2>
      <p style={{ fontSize: 14, color: '#1A1018', lineHeight: 1.8, margin: 0 }}>{children}</p>
    </div>
  );
}

function Footer() {
  return (
    <div style={{ marginTop: 60, paddingTop: 24, borderTop: '1px solid #E8DDD4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#6A5A62', margin: 0 }}>
        © 2026 Flock by Matt Walters. All rights reserved.
      </p>
      <div style={{ display: 'flex', gap: 20 }}>
        <a href="/terms" style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#6A5A62', textDecoration: 'none' }}>terms</a>
        <a href="/privacy" style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#6A5A62', textDecoration: 'none' }}>privacy</a>
        <a href="/start" style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#8B1A2B', textDecoration: 'none' }}>get started →</a>
      </div>
    </div>
  );
}
