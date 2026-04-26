export const metadata = {
  title: 'Privacy Policy · Flock',
  description: 'Privacy Policy for Flock fan communities platform.',
};

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F5EFE6', fontFamily: "'DM Sans', sans-serif", padding: '40px 20px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;600;700&display=swap');`}</style>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        <div style={{ marginBottom: 40 }}>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 32 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#8B1A2B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#F5EFE6' }}>✦</div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1018', textTransform: 'lowercase' }}>flock</span>
          </a>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#1A1018', marginBottom: 8, textTransform: 'lowercase' }}>privacy policy</h1>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#6A5A62' }}>last updated: march 2026</p>
        </div>

        <div style={{ lineHeight: 1.8, color: '#1A1018' }}>

          <Section title="1. who we are">
            Flock is operated by Matt Walters, an independent project based in Victoria, Australia. We provide a fan community platform for independent artists. For privacy enquiries, use our <a href="/contact" style={{ color: '#8B1A2B' }}>contact form</a>.
          </Section>

          <Section title="2. information we collect">
            When you create an account, we collect your email address, display name, and optionally your city and profile photo. When you use the platform, we collect activity data including posts, comments, stamps earned, shows attended, and the time and approximate location of your sign-up. We collect this to operate the platform and provide features like the leaderboard and rewards system.
          </Section>

          <Section title="3. how we use your information">
            We use your information to: operate and improve the platform; send transactional emails such as welcome emails and reward notifications; send weekly community digest emails (you can opt out in your profile settings); display your profile and activity within your community; calculate stamp counts and reward eligibility.
          </Section>

          <Section title="4. information sharing">
            We do not sell your personal information. Your profile information (display name, city, stamp count) is visible to other members of your community. Your email address is not publicly displayed. We share data with Supabase (database and authentication infrastructure) and Resend (transactional email). Both are GDPR-compliant processors.
          </Section>

          <Section title="5. artist access">
            The artist or management team operating your community can see your display name, email address, city, stamp count, and reward claims. This is necessary for them to fulfil rewards and manage their community. They cannot access your password.
          </Section>

          <Section title="6. cookies and storage">
            We use cookies to maintain your login session. We do not use tracking cookies or third-party advertising cookies. We use local storage to cache certain UI preferences.
          </Section>

          <Section title="7. data retention">
            We retain your account data for as long as your account is active. If you delete your account, your profile and posts are deleted within 30 days. Email logs are retained for 90 days for debugging purposes.
          </Section>

          <Section title="8. your rights">
            You have the right to: access the personal data we hold about you; correct inaccurate data; request deletion of your account and data; opt out of marketing emails. To exercise these rights, use our <a href="/contact" style={{ color: '#8B1A2B' }}>contact form</a> or the account settings in the platform.
          </Section>

          <Section title="9. children">
            Flock is not intended for children under 13. We do not knowingly collect data from children under 13. If you believe a child has provided us with personal information, please contact us.
          </Section>

          <Section title="10. security">
            We use industry-standard security measures including encrypted connections (HTTPS), hashed passwords, and row-level security on our database. No method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
          </Section>

          <Section title="11. international transfers">
            Our infrastructure is hosted in the Asia-Pacific region (Sydney, Australia). If you access Flock from outside Australia, your data may be transferred to and processed in Australia.
          </Section>

          <Section title="12. changes to this policy">
            We may update this policy from time to time. We will notify you of significant changes via email. Continued use of the platform after changes constitutes acceptance of the updated policy.
          </Section>

          <Section title="13. contact">
            For any privacy-related questions or requests, reach out via our <a href="/contact" style={{ color: '#8B1A2B' }}>contact form</a>.
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
