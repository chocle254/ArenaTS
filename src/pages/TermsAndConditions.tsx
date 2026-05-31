import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Gavel, Globe, Info, AlertTriangle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TermsAndConditions = () => {
  const lastUpdated = "May 25, 2026";

  const sections = [
    {
      id: "acceptance",
      title: "1. Acceptance of Terms",
      icon: <ShieldCheck className="w-5 h-5" />,
      content: `By accessing or using the ARENA platform ("Platform"), operated by Nebula Dark LLC ("we," "us," or "our"), you agree to be bound by these Terms & Conditions ("Terms"). You must be at least 18 years of age to register an account. If you do not agree to these Terms, you must not access or use the Platform.`
    },
    {
      id: "skill-gaming",
      title: "2. Games of Skill & Restricted Territories",
      icon: <Globe className="w-5 h-5" />,
      content: `ARENA is a competitive platform hosting contests based strictly on the player's skill ("Games of Skill"). 
      
      2.1 Prohibited Jurisdictions: Participation in paid tournaments is prohibited for residents of jurisdictions where such contests are restricted by law. In the United States, this includes but is not limited to: Arizona, Arkansas, Connecticut, Delaware, Louisiana, Montana, South Carolina, South Dakota, Tennessee, and Washington. 
      
      2.2 Compliance: Users are solely responsible for ensuring their participation is legal in their jurisdiction. We reserve the right to use geofencing technologies to restrict access and to terminate accounts found in violation, resulting in the forfeiture of all funds.`
    },
    {
      id: "aml-kyc",
      title: "3. AML/KYC Compliance",
      icon: <Info className="w-5 h-5" />,
      content: `3.1 Verification Requirement: To comply with Anti-Money Laundering (AML) and Know Your Customer (KYC) regulations, identity verification is mandatory before any withdrawal of funds. You must provide a valid government-issued ID and proof of address upon request.
      
      3.2 Fund Holds: We reserve the right to hold funds for up to 30 days to complete match integrity checks and identity verification. Suspicious activity may result in indefinite holds and reporting to relevant financial authorities.`
    },
    {
      id: "currency",
      title: "4. Arena Currency & Financial Security",
      icon: <CreditCard className="w-5 h-5" />,
      content: `4.1 Arena Currency (AC): AC is the internal digital currency used on the Platform (1 USD = 100 AC). 
      
      4.2 Stripe Protocols: All transactions are processed via Stripe. We reserve the right to hold payments during fraud investigations. 
      
      4.3 Chargebacks: Any user who initiates an unauthorized chargeback will have their account permanently suspended, and all remaining balances will be forfeited to cover administrative and penalty costs.`
    },
    {
      id: "disclaimers",
      title: "5. Platform Liability & Disclaimers",
      icon: <AlertTriangle className="w-5 h-5" />,
      content: `5.1 Service "As-Is": The Platform is provided on an "as-is" basis. We do not guarantee uninterrupted service.
      
      5.2 Technical Failures: We are not liable for software bugs, server drops, or third-party API failures (including eFootball or PUBG Mobile servers) that may alter match outcomes. Users assume the risk of technical failures inherent in online gaming.
      
      5.3 Twitch Content: We do not control or monitor external Twitch streams. We are not liable for any content, copyright violations, or conduct occurring on third-party streaming platforms linked to your account (Safe Harbor compliance).`
    },
    {
      id: "disputes",
      title: "6. Match Disputes & Referee System",
      icon: <Gavel className="w-5 h-5" />,
      content: `6.1 Referee Authority: Referees have absolute authority to resolve match disputes. All evidence must be submitted through the Platform's designated channels.
      
      6.2 Finality: Referee decisions regarding gameplay and match outcomes are final and non-appealable. Contractual or financial disputes are governed by the arbitration clause below.`
    },
    {
      id: "consumer-protection",
      title: "7. Consumer Protection (EU/UK Users)",
      icon: <Globe className="w-5 h-5" />,
      content: `For users in the EU and UK: Digital content and currency purchases are executed immediately upon your request. By purchasing Arena Currency, you explicitly waive your 14-day statutory "cooling-off" period. Refunds are only available where required by mandatory local law.`
    },
    {
      id: "governing-law",
      title: "8. Governing Law & Dispute Resolution",
      icon: <Gavel className="w-5 h-5" />,
      content: `8.1 Jurisdiction: These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict of law principles.
      
      8.2 Arbitration: Any legal dispute shall be settled by binding arbitration through the American Arbitration Association (AAA) in Delaware.
      
      8.3 Class Action Waiver: YOU AGREE TO RESOLVE DISPUTES INDIVIDUALLY AND WAIVE THE RIGHT TO PARTICIPATE IN ANY CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION.`
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
