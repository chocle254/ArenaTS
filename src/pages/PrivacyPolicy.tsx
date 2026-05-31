import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lock, Eye, Database, Globe, UserCheck, ShieldAlert, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PrivacyPolicy = () => {
  const lastUpdated = "May 25, 2026";

  const sections = [
    {
      id: "introduction",
      title: "1. Introduction & Domicile",
      icon: <Eye className="w-5 h-5" />,
      content: `ARENA ("we", "our", or "us"), operated by Nebula Dark LLC, a Delaware limited liability company, is committed to protecting your privacy. This Privacy Policy governs our data collection, processing, and usage practices in relation to the Platform. By using ARENA, you consent to the data practices described in this statement. We operate in a highly regulated environment involving real-money contests, and our privacy protocols reflect our commitment to financial and legal compliance.`
    },
    {
      id: "collection",
      title: "2. Information We Collect",
      icon: <Database className="w-5 h-5" />,
      content: `2.1 Registration & Profile: Username, email, hashed password, and country of residence.
      
      2.2 Match & Interaction Data: Gameplay results, in-game IDs, world chat logs, direct messages, and match evidence (video/screenshots) submitted for dispute resolution.
      
      2.3 Geolocation Data: We collect precise location data to enforce our "Restricted Territories" policy. This is used to automatically bar users from jurisdictions where cash-prize esports are prohibited.
      
      2.4 Financial & KYC Data: To comply with Anti-Money Laundering (AML) laws, we collect government-issued IDs, proof of address, and tax identification numbers for users initiating withdrawals or reaching certain transaction thresholds.`
    },
    {
      id: "usage",
      title: "3. How We Use Your Information",
      icon: <FileText className="w-5 h-5" />,
      content: `3.1 Service Execution: To manage accounts, process tournament entries, and facilitate peer-to-peer wagering.
      
      3.2 Compliance & Safety: To verify identities (KYC), prevent money laundering (AML), and investigate match-fixing or fraudulent transactions.
      
      3.3 Dispute Resolution: To allow referees and admins to review match evidence and chat logs to ensure fair play.`
    },
    {
      id: "sharing",
      title: "4. Sharing Information with Third Parties",
      icon: <Globe className="w-5 h-5" />,
      content: `4.1 Payment Processors: We share data with Stripe for payment processing and withdrawal fulfillment. We do not store raw credit card details; all financial transactions are handled via Stripe's secure infrastructure.
      
      4.2 Identity Verification: We may use third-party KYC providers to verify the authenticity of government documents provided by users.
      
      4.3 Legal Authorities: We reserve the right to disclose your information to law enforcement or regulatory bodies if required by law or if we believe in good faith that such action is necessary to comply with legal obligations or protect platform integrity.`
    },
    {
      id: "retention",
      title: "5. Data Retention & Financial Security",
      icon: <Lock className="w-5 h-5" />,
      content: `5.1 Retention Period: Account data is retained as long as the account is active. However, financial records, KYC documents, and transaction histories are retained for a minimum of 7 years to comply with statutory tax and AML requirements.
      
      5.2 Withdrawal Holds: As per our Terms, we may hold withdrawal data and related funds for up to 30 days to complete integrity audits and fraud investigations.`
    },
    {
      id: "third-party-content",
      title: "6. Safe Harbor & Third-Party Platforms",
      icon: <ShieldAlert className="w-5 h-5" />,
      content: `6.1 Twitch Integration: Users linking Twitch accounts are subject to Twitch’s privacy policy. ARENA does not host, monitor, or control external video streams.
      
      6.2 Liability Shield: We comply with DMCA (US) and DSA (EU) Safe Harbor regulations. We are not liable for user-generated content or broadcasts occurring on external third-party platforms linked to the Platform.`
    },
    {
      id: "rights",
      title: "7. User Rights & Regional Disclosures",
      icon: <UserCheck className="w-5 h-5" />,
      content: `7.1 Global Rights: You may request access to, correction of, or deletion of your personal data, subject to our legal retention obligations.
      
      7.2 EU/UK Consumer Protection: Digital content (Arena Currency) is provided immediately upon purchase. Pursuant to regional laws, the statutory 14-day cooling-off period is waived upon execution of the digital delivery.
      
      7.3 Governing Venue: All data disputes are subject to the exclusive jurisdiction of the state and federal courts located in Delaware, USA.`
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FB] font-montserrat text-[#111827]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E5E7EB]">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium hover:text-[#6B7280] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <span className="text-xs text-[#6B7280] font-medium tracking-wider uppercase">Privacy Center</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-20">
        <header className="mb-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-balance">Privacy Policy</h1>
          <p className="text-[#6B7280] text-sm">Last Updated: {lastUpdated}</p>
        </header>

        <div className="space-y-24">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-32">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center text-[#111827]">
                  {section.icon}
                </div>
                <h2 className="text-xl font-bold tracking-tight">{section.title}</h2>
              </div>
              <div className="pl-0 md:pl-14">
                <div className="text-[#6B7280] leading-relaxed whitespace-pre-line text-lg text-pretty">
                  {section.content}
                </div>
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-32 pt-16 border-t border-[#E5E7EB]">
          <div className="bg-white rounded-2xl p-6 md:p-12 border border-[#E5E7EB] text-center">
            <h3 className="text-2xl font-bold mb-4">Privacy Concerns?</h3>
            <p className="text-[#6B7280] mb-8 max-w-md mx-auto text-pretty">
              If you have questions about your data or wish to exercise your privacy rights, please contact our data protection officer.
            </p>
            <Button 
              variant="outline" 
              className="h-12 px-8 border-[#E5E7EB] hover:bg-[#F8F9FB] rounded-full text-sm font-semibold tracking-wide uppercase transition-all"
              onClick={() => window.location.href = 'mailto:privacy@arena.gg'}
            >
              Request Data Export
            </Button>
            <div className="mt-8 flex justify-center gap-8 text-xs font-medium text-[#6B7280]">
              <Link to="/terms" className="hover:text-[#111827] transition-colors underline underline-offset-4">Terms & Conditions</Link>
              <a href="mailto:dpo@nebula-dark.com" className="hover:text-[#111827] transition-colors underline underline-offset-4">Email DPO</a>
            </div>
          </div>
          <p className="text-center text-xs text-[#6B7280] mt-12">
            &copy; 2026 Nebula Dark LLC. All rights reserved. Registered in Delaware, USA. Managed under Delaware Data Privacy Laws.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
