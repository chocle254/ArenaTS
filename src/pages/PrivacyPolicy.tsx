import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lock, Eye, Database, Globe, UserCheck, ShieldAlert, FileText, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PrivacyPolicy = () => {
  const lastUpdated = "2026-11-14";

  const sections = [
    {
      id: "introduction",
      title: "1. Introduction & Domicile",
      icon: <Eye className="w-5 h-5" />,
      content: `ARENA ("we", "our", or "us"), based in Nairobi, Kenya, is committed to protecting your privacy. We process personal data in line with the Data Protection Act, 2019 (Kenya) and act as the data controller for the Platform. This Privacy Policy governs our data collection, processing, and usage practices in relation to the Platform. By using ARENA, you consent to the data practices described in this statement. We operate in a highly regulated environment involving real-money contests, and our privacy protocols reflect our commitment to financial and legal compliance.`
    },
    {
      id: "collection",
      title: "2. Information We Collect",
      icon: <Database className="w-5 h-5" />,
      content: `2.1 Registration & Profile: Username, email, hashed password, and country of residence.
      
      2.2 Match & Interaction Data: Gameplay results, in-game IDs, World Chat messages (public and deleted after 7 days), direct messages, reactions, and match evidence (video/screenshots) submitted for dispute resolution. Direct messages are stored encrypted. Arena staff only open a private conversation to investigate a report (for example scams, threats or match fixing) or where the law requires it. "Online" and "typing" indicators are sent live between the two players and are not stored.
      
      2.3 Geolocation Data: We collect precise location data to enforce our "Restricted Territories" policy. This is used to automatically bar users from jurisdictions where cash-prize esports are prohibited.
      
      2.4 Financial & KYC Data: To comply with Anti-Money Laundering (AML) laws, we collect government-issued IDs, proof of address, and tax identification numbers for users initiating withdrawals or reaching certain transaction thresholds.`
    },
    {
      id: "aml-kyc",
      title: "3. AML/KYC Compliance",
      icon: <BadgeCheck className="w-5 h-5" />,
      content: `3.1 Identity Verification: To comply with Anti-Money Laundering (AML) and Know Your Customer (KYC) regulations, we require users to verify their identity before withdrawing funds or upon reaching certain transaction thresholds. Verification may include a valid government-issued ID, proof of address, and tax identification number.

3.2 Data Usage: KYC information is used solely to verify identity, prevent fraud, detect money laundering, and satisfy legal obligations. We do not use KYC data for marketing or share it beyond what is necessary for compliance.

3.3 Verification Providers: We may share identity documents with regulated third-party verification services that process data under strict confidentiality and data protection agreements.

3.4 Record Keeping: KYC documents and verification records are retained for at least 7 years after account closure, or longer if required by applicable law, to comply with AML record-keeping requirements.`
    },
    {
      id: "usage",
      title: "4. How We Use Your Information",
      icon: <FileText className="w-5 h-5" />,
      content: `4.1 Service Execution: To manage accounts, process tournament entries, and facilitate peer-to-peer wagering.
      
      4.2 Compliance & Safety: To verify identities (KYC), prevent money laundering (AML), and investigate match-fixing or fraudulent transactions.
      
      4.3 Dispute Resolution: To allow referees and admins to review match evidence and chat logs to ensure fair play.`
    },
    {
      id: "sharing",
      title: "5. Sharing Information with Third Parties",
      icon: <Globe className="w-5 h-5" />,
      content: `5.1 Payment Processors: We share your M-Pesa number and transaction amounts with our payment partner (UpesiPay) and Safaricom to process deposits and withdrawals. We do not store M-Pesa PINs.
      
      5.2 Identity Verification: We may use third-party KYC providers to verify the authenticity of government documents provided by users.
      
      5.3 Legal Authorities: We reserve the right to disclose your information to law enforcement or regulatory bodies if required by law or if we believe in good faith that such action is necessary to comply with legal obligations or protect platform integrity.`
    },
    {
      id: "retention",
      title: "6. Data Retention & Financial Security",
      icon: <Lock className="w-5 h-5" />,
      content: `6.1 Retention Period: Account data is retained as long as the account is active. However, financial records, KYC documents, and transaction histories are retained for a minimum of 7 years to comply with statutory tax and AML requirements.
      
      6.2 Withdrawal Holds: As per our Terms, we may hold withdrawal data and related funds for up to 30 days to complete integrity audits and fraud investigations.

      6.3 Deleting Your Account: You can delete your account at any time in Settings once your winnings are withdrawn and you have no tournament, challenge, dispute, deposit or withdrawal in progress. Deletion happens immediately and cannot be undone. We delete your gamertag, email address, phone and M-Pesa numbers, profile details, in-game IDs, World Chat messages, direct messages, friends and notifications, and you can no longer sign in. Any play balance or welcome tickets left on the account are forfeited, as they cannot be withdrawn.

      6.4 What We Keep After Deletion: Transaction, deposit, withdrawal, prize and match records are kept for at least 7 years for tax and anti-money-laundering purposes, attached to an anonymous "Deleted player" with no name or contact details. If you verified your identity, your ID documents and verification record are locked in an admin-only archive for 7 years after deletion and then deleted automatically. Dispute evidence you uploaded is kept with the dispute record.

      6.5 Preventing Repeat Sign-up Bonuses: When an account is deleted we keep a one-way, salted fingerprint of its email address and M-Pesa number (not the email or number itself). It is used only to stop the same person claiming another welcome ticket or invite reward on a new account.`
    },
    {
      id: "third-party-content",
      title: "7. Safe Harbor & Third-Party Platforms",
      icon: <ShieldAlert className="w-5 h-5" />,
      content: `7.1 Twitch Integration: Users linking Twitch accounts are subject to Twitch's privacy policy. ARENA does not host, monitor, or control external video streams.
      
      7.2 Liability Shield: We comply with DMCA (US) and DSA (EU) Safe Harbor regulations. We are not liable for user-generated content or broadcasts occurring on external third-party platforms linked to the Platform.`
    },
    {
      id: "rights",
      title: "8. Your Rights",
      icon: <UserCheck className="w-5 h-5" />,
      content: `8.1 Your Rights under the Data Protection Act, 2019: You have the right to be told how your data is used, to access it, to have it corrected, to object to its use, and to have it deleted, subject to our legal retention obligations. You can delete your account yourself in Settings (see sections 6.3 to 6.5). For anything else, email us and we will respond within 30 days.
      
      8.2 Deposits: M-Pesa deposits are credited to your play balance immediately. Play balance is for tournament and match entries and cannot be withdrawn; winnings can.
      
      8.3 Complaints: If you are unhappy with how we handle your data, contact us first. You also have the right to complain to the Office of the Data Protection Commissioner (ODPC), Kenya. This policy is governed by the laws of Kenya.`
    }
  ];

  return (
    <div className="min-h-screen bg-background font-montserrat text-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium hover:text-muted-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <span className="text-sm text-muted-foreground">Privacy policy</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-20">
        <header className="mb-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-balance">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm">Last Updated: {lastUpdated}</p>
        </header>

        <div className="space-y-24">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-32">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-full glass border border-border flex items-center justify-center text-foreground">
                  {section.icon}
                </div>
                <h2 className="text-xl font-bold tracking-tight">{section.title}</h2>
              </div>
              <div className="pl-0 md:pl-14">
                <div className="text-muted-foreground leading-relaxed whitespace-pre-line text-lg text-pretty">
                  {section.content}
                </div>
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-32 pt-16 border-t border-border">
          <div className="glass rounded-2xl p-6 md:p-12 border border-border text-center">
            <h3 className="text-2xl font-bold mb-4">Privacy Concerns?</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto text-pretty">
              If you have questions about your data or wish to exercise your privacy rights, please contact our data protection officer.
            </p>
            <Button 
              variant="outline" 
              className="h-12 px-8 border-border hover:bg-muted rounded-full text-sm font-semibold transition-colors"
              onClick={() => window.location.href = 'mailto:privacy@arena.gg'}
            >
              Request Data Export
            </Button>
            <div className="mt-8 flex justify-center gap-8 text-xs font-medium text-muted-foreground">
              <Link to="/terms" className="hover:text-foreground transition-colors underline underline-offset-4">Terms & Conditions</Link>
              <a href="mailto:dpo@nebula-dark.com" className="hover:text-foreground transition-colors underline underline-offset-4">Email DPO</a>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-12">
            &copy; 2026 Arena, Nairobi, Kenya. All rights reserved. Governed by the Data Protection Act, 2019 (Kenya).
          </p>
        </footer>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
