import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Gavel, Globe, Info, AlertTriangle, CreditCard, Trophy, Ban, UserX, Scale, FilePenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TermsAndConditions = () => {
  const lastUpdated = "2026-05-25";

  const sections = [
    {
      id: "acceptance",
      title: "1. Acceptance of Terms",
      icon: <ShieldCheck className="w-5 h-5" />,
      content: `By accessing or using the ARENA platform ("Platform"), operated by Nebula Dark LLC ("we," "us," or "our"), you agree to be bound by these Terms & Conditions ("Terms"). You must be at least 18 years of age to register an account. If you do not agree to these Terms, you must not access or use the Platform.`
    },
    {
      id: "platform-rules",
      title: "2. Platform Rules",
      icon: <ShieldCheck className="w-5 h-5" />,
      content: `2.1 Eligibility: You must be at least 18 years old and have the legal capacity to enter into binding contracts. Employees of Nebula Dark LLC and their immediate family members are not eligible to participate in paid contests.

2.2 Account Security: You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized access.

2.3 One Account Per User: Each user may maintain only one active account. Creating multiple accounts to circumvent restrictions, manipulate rankings, or exploit promotions is prohibited.

2.4 Prohibited Jurisdictions: Participation in paid tournaments is prohibited for residents of jurisdictions where such contests are restricted by law. In the United States, this includes but is not limited to: Arizona, Arkansas, Connecticut, Delaware, Louisiana, Montana, South Carolina, South Dakota, Tennessee, and Washington. Users are solely responsible for ensuring their participation is legal in their jurisdiction. We reserve the right to use geofencing technologies to restrict access and to terminate accounts found in violation, resulting in the forfeiture of all funds.`
    },
    {
      id: "tournament-participation",
      title: "3. Tournament Participation",
      icon: <Trophy className="w-5 h-5" />,
      content: `3.1 Entry: Participation in tournaments requires payment of the applicable entry fee in Arena Currency. Entry fees are non-refundable once a tournament begins, except where required by law or where the tournament is cancelled by us.

3.2 Skill-Based Contests: All contests hosted on the Platform are Games of Skill. Outcomes are determined predominantly by skill, knowledge, and ability rather than chance.

3.3 Match Integrity: Players must compete honestly and in good faith. Any attempt to manipulate match results, collude with opponents, or exploit technical vulnerabilities will result in immediate disqualification and forfeiture of entry fees and prizes.

3.4 Prizes: Prize distributions are determined by the tournament rules published at the time of entry. Prizes are awarded to verified accounts only. We reserve the right to withhold prizes pending completion of KYC/AML verification and fraud review.`
    },
    {
      id: "prohibited-conduct",
      title: "4. Prohibited Conduct",
      icon: <Ban className="w-5 h-5" />,
      content: `4.1 General Prohibitions: You may not use the Platform for any unlawful purpose or in any way that violates these Terms. Prohibited conduct includes, but is not limited to:

  (a) Cheating, hacking, using unauthorized software, or exploiting bugs;
  (b) Match-fixing, collusion, or intentionally losing a match;
  (c) Abusive, threatening, or discriminatory behavior toward other users, referees, or staff;
  (d) Fraudulent payment activity, unauthorized chargebacks, or money laundering;
  (e) Creating multiple accounts or using another person's identity;
  (f) Posting unauthorized commercial content, spam, or malware;
  (g) Circumventing geofencing, age restrictions, or account sanctions.

4.2 Harassment and Hate Speech: We do not tolerate harassment, hate speech, doxxing, or any conduct that creates a hostile environment. Violations may result in warnings, temporary suspension, or permanent termination.

4.3 Reporting: Users may report violations through the Platform's reporting tools. We reserve the right to investigate and take action at our sole discretion.`
    },
    {
      id: "aml-kyc",
      title: "5. AML/KYC Compliance",
      icon: <Info className="w-5 h-5" />,
      content: `5.1 Verification Requirement: To comply with Anti-Money Laundering (AML) and Know Your Customer (KYC) regulations, identity verification is mandatory before any withdrawal of funds. You must provide a valid government-issued ID and proof of address upon request.
      
      5.2 Fund Holds: We reserve the right to hold funds for up to 30 days to complete match integrity checks and identity verification. Suspicious activity may result in indefinite holds and reporting to relevant financial authorities.`
    },
    {
      id: "currency",
      title: "6. Arena Currency & Financial Security",
      icon: <CreditCard className="w-5 h-5" />,
      content: `6.1 Arena Currency (AC): AC is the internal digital currency used on the Platform (1 USD = 100 AC). 
      
      6.2 Stripe Protocols: All transactions are processed via Stripe. We reserve the right to hold payments during fraud investigations. 
      
      6.3 Chargebacks: Any user who initiates an unauthorized chargeback will have their account permanently suspended, and all remaining balances will be forfeited to cover administrative and penalty costs.`
    },
    {
      id: "account-termination",
      title: "7. Account Termination",
      icon: <UserX className="w-5 h-5" />,
      content: `7.1 Termination by User: You may close your account at any time by contacting support. Closure is subject to completion of any pending tournaments, withdrawals, and fraud reviews.

7.2 Termination by ARENA: We may suspend or terminate your account, with or without notice, for violations of these Terms, suspected fraud, abuse, illegal activity, or any conduct that harms the Platform or other users.

7.3 Effects of Termination: Upon termination, your right to use the Platform ceases immediately. Any pending prizes, withdrawals, or account balances may be forfeited if the termination resulted from a violation of these Terms. We may retain certain data as required by law.

7.4 Appeal: Users whose accounts are terminated may appeal the decision by contacting our compliance team. We will review appeals in good faith but our decisions are final.`
    },
    {
      id: "limitation-liability",
      title: "8. Limitation of Liability",
      icon: <Scale className="w-5 h-5" />,
      content: `8.1 Service "As-Is": The Platform is provided on an "as-is" and "as-available" basis. We do not guarantee uninterrupted, error-free, or secure service.

8.2 Excluded Damages: To the fullest extent permitted by law, Nebula Dark LLC, its affiliates, officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of or inability to use the Platform.

8.3 Liability Cap: Our total aggregate liability to you for any claims arising out of or relating to these Terms or the Platform shall be limited to the total amount you have paid to us in transaction fees and purchases on the Platform in the twelve (12) months immediately preceding the event giving rise to the claim. This cap does not apply to liability that cannot be excluded or limited under applicable law.`
    },
    {
      id: "disclaimers",
      title: "9. Platform Liability & Disclaimers",
      icon: <AlertTriangle className="w-5 h-5" />,
      content: `9.1 Technical Failures: We are not liable for software bugs, server drops, or third-party API failures (including eFootball or PUBG Mobile servers) that may alter match outcomes. Users assume the risk of technical failures inherent in online gaming.
      
      9.2 Twitch Content: We do not control or monitor external Twitch streams. We are not liable for any content, copyright violations, or conduct occurring on third-party streaming platforms linked to your account (Safe Harbor compliance).`
    },
    {
      id: "disputes",
      title: "10. Match Disputes & Referee System",
      icon: <Gavel className="w-5 h-5" />,
      content: `10.1 Referee Authority: Referees have absolute authority to resolve match disputes. All evidence must be submitted through the Platform's designated channels.
      
      10.2 Finality: Referee decisions regarding gameplay and match outcomes are final and non-appealable. Contractual or financial disputes are governed by the arbitration clause below.`
    },
    {
      id: "changes",
      title: "11. Changes to Terms",
      icon: <FilePenLine className="w-5 h-5" />,
      content: `11.1 Right to Update: We may modify these Terms at any time to reflect changes in law, regulation, platform features, or business practices.

11.2 Notification Process: If we make material changes, we will notify you by email to the address associated with your account and by posting a prominent notice on the Platform at least thirty (30) days before the changes take effect. Non-material changes may take effect immediately upon posting.

11.3 Acceptance of Changes: Your continued use of the Platform after the effective date of the revised Terms constitutes your acceptance of the changes. If you do not agree to the revised Terms, you must stop using the Platform and close your account.`
    },
    {
      id: "consumer-protection",
      title: "12. Consumer Protection (EU/UK Users)",
      icon: <Globe className="w-5 h-5" />,
      content: `For users in the EU and UK: Digital content and currency purchases are executed immediately upon your request. By purchasing Arena Currency, you explicitly waive your 14-day statutory "cooling-off" period. Refunds are only available where required by mandatory local law.`
    },
    {
      id: "governing-law",
      title: "13. Governing Law & Dispute Resolution",
      icon: <Gavel className="w-5 h-5" />,
      content: `13.1 Jurisdiction: These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict of law principles.
      
      13.2 Arbitration: Any legal dispute shall be settled by binding arbitration through the American Arbitration Association (AAA) in Delaware.
      
      13.3 Class Action Waiver: YOU AGREE TO RESOLVE DISPUTES INDIVIDUALLY AND WAIVE THE RIGHT TO PARTICIPATE IN ANY CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION.`
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
          <span className="text-xs text-[#6B7280] font-medium tracking-wider uppercase">Legal Documentation</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-20">
        <header className="mb-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-balance">Terms & Conditions</h1>
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
            <h3 className="text-2xl font-bold mb-4">Questions about our terms?</h3>
            <p className="text-[#6B7280] mb-8 max-w-md mx-auto text-pretty">
              Our compliance team is here to help clarify any legal or regulatory questions you may have.
            </p>
            <Button 
              variant="outline" 
              className="h-12 px-8 border-[#E5E7EB] hover:bg-[#F8F9FB] rounded-full text-sm font-semibold tracking-wide uppercase transition-all"
              onClick={() => window.location.href = 'mailto:legal@arena.gg'}
            >
              Contact Compliance
            </Button>
            <div className="mt-8 flex justify-center gap-8 text-xs font-medium text-[#6B7280]">
              <Link to="/privacy" className="hover:text-[#111827] transition-colors underline underline-offset-4">Privacy Policy</Link>
              <a href="#" className="hover:text-[#111827] transition-colors underline underline-offset-4">Cookie Settings</a>
            </div>
          </div>
          <p className="text-center text-xs text-[#6B7280] mt-12">
            &copy; 2026 Nebula Dark LLC. All rights reserved. Registered in Delaware, USA.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default TermsAndConditions;
