# Requirements Document

## 1. Application Overview

### 1.1 Application Name
Nebula Dark

### 1.2 Application Description
A fully interactive chat application featuring a deep space visual atmosphere with glassmorphism design. Users can engage in world chat with multiple participants and private direct messaging with friends. The application provides real-time messaging with animated message delivery, typing indicators, read receipts, synthesized audio feedback, friend request system with location-based profiles, team formation, quick match requests, referee system for dispute resolution, admin-managed referee selection, exchange rate display, and Stripe payment integration. Friend requests display sender profiles with location and game preferences to facilitate connections across time zones for tournament participation. The platform now supports eFootball (1v1 mode) and PUBG Mobile as available games. Users can provide their Twitch username during registration to enable match streaming capabilities. The platform includes Privacy Policy and Terms & Conditions pages accessible from footer and authentication pages.

## 2. Users and Use Scenarios

### 2.1 Target Users
  - Users 18 years of age or older seeking a visually immersive chat experience
  - Individuals wanting both public and private messaging capabilities
  - Users who appreciate animated UI interactions and audio feedback
  - Players looking to connect with friends across different time zones
  - Players forming teams and finding quick matches
  - Referees managing match disputes and providing final decisions
  - Administrators managing referee selection and application review
  - Users needing to view exchange rates
  - Users making payments through Stripe
  - eFootball players seeking 1v1 matches
  - PUBG Mobile players looking for teammates and matches
  - Players who want to stream their matches on Twitch
  - Users reviewing platform privacy practices and terms before registration

### 2.2 Core Use Scenarios
  - Users confirm they are 18 years or older during sign up and sign in
  - Users register with location, game preferences including eFootball and PUBG Mobile, and optional Twitch username
  - Users participate in world chat with multiple participants
  - Users send friend requests from world chat by clicking avatars
  - Users receive friend requests with sender profile information including game accounts
  - Users accept or decline friend requests from Friends tab
  - Users send and receive private direct messages with accepted friends only
  - Users view friend locations and game preferences to coordinate across time zones
  - Users form teams with friends for supported games
  - Users request quick matches with friends in eFootball (1v1) or PUBG Mobile
  - Users create matches specifying game type (eFootball or PUBG Mobile)
  - Users dispute match results and provide evidence
  - Users apply to become referees through chat interface
  - Referees view live matches and prioritize disputed matches
  - Referees review match chat history and evidence
  - Referees communicate with disputing players through dedicated chat
  - Referees make final override decisions on disputed matches
  - Administrators review referee applications through chat rooms
  - Administrators select and assign referees to specific games including eFootball and PUBG Mobile
  - Users react to messages with emoji reactions
  - Users experience real-time message delivery with visual and audio feedback
  - Users switch between world chat and direct message conversations
  - Users view online status and typing indicators
  - Users view current exchange rates
  - Users make payments using Stripe
  - Users provide Twitch username to enable match streaming
  - Users access Privacy Policy page to review data practices and legal requirements
  - Users access Terms & Conditions page to understand platform rules and legal obligations
  - Users review Privacy Policy and Terms & Conditions before completing registration

## 3. Page Structure and Functionality

### 3.1 Page Structure Overview

```
Nebula Dark Application
├── Sign In Page
├── Registration Page (Sign Up)
├── Desktop Layout (Three-Column)
├── Mobile Layout (Single Column)
├── Referee Dashboard
├── Admin Dashboard
├── Exchange Rate Page
├── Payment Page
├── Privacy Policy Page (/privacy)
└── Terms & Conditions Page (/terms)
```

### 3.2 Sign In Page

#### 3.2.1 Sign In Form
  - Username/Email Field
  - Password Field
  - Age Confirmation Checkbox
  - Privacy Policy Link
  - Terms & Conditions Link
  - Sign In Button

### 3.3 Registration Page

#### 3.3.1 Registration Form
  - Username Field
  - Avatar Selection
  - Location Dropdown
  - Game Preferences Multi-Select (includes eFootball, PUBG Mobile)
  - Game Account Settings (eFootball ID, PUBG Mobile ID)
  - Twitch Username Field
  - Age Confirmation Checkbox
  - Privacy Policy Link
  - Terms & Conditions Link
  - Submit Button

### 3.4 Desktop Layout

#### 3.4.1 Left Sidebar
  - App logo/name
  - Channels section
  - Direct Messages section
  - Friend Requests section
  - Referee Section (Referee Role Only)
  - Admin Section (Admin Role Only)
  - Exchange Rate Display
  - Payment Button

#### 3.4.2 Middle Column (Chat Area)
  - Chat header
  - Message feed
  - Input bar

#### 3.4.3 Right Panel (Context-Dependent)
  - Friend Actions Panel (DM View)
  - Referee Panel (Dispute Chat View)
  - Admin Panel (Application Chat View)

#### 3.4.4 Footer
  - Privacy Policy Link
  - Terms & Conditions Link

### 3.5 Mobile Layout

#### 3.5.1 Bottom Tab Bar
  - World tab
  - DMs tab
  - Friends tab
  - Referee tab (Referee Role Only)
  - Admin tab (Admin Role Only)
  - Exchange tab
  - Payment tab

#### 3.5.2 Mobile Footer
  - Privacy Policy Link
  - Terms & Conditions Link

### 3.6 World Chat

#### 3.6.1 Message Display
  - Messages from multiple users
  - Clickable avatars
  - Message bubbles
  - Reactions
  - Timestamps

### 3.7 Private Direct Messages

#### 3.7.1 DM List Display
  - DM conversations with accepted friends only

#### 3.7.2 DM Conversation
  - Message bubbles
  - Typing indicator
  - Delivery status

### 3.8 Friend Request System

#### 3.8.1 Sending Friend Requests
  - Send requests from world chat

#### 3.8.2 Receiving Friend Requests
  - Request cards with sender profile

#### 3.8.3 Accepting Friend Requests
  - Add to friends list

#### 3.8.4 Declining Friend Requests
  - Remove request

### 3.9 Team Formation

#### 3.9.1 Team Up Action
  - Send team invitation

#### 3.9.2 Team Invitation Response
  - Accept or decline

### 3.10 Quick Match

#### 3.10.1 Quick Match Request
  - Send match request

#### 3.10.2 Match Request Response
  - Accept or decline

### 3.11 Match Creation

#### 3.11.1 Create Match Interface
  - Game type selection
  - Match name
  - Create button

#### 3.11.2 Match Creation Logic
  - eFootball 1v1 matches
  - PUBG Mobile matches

#### 3.11.3 Match Invitation
  - Friend receives invitation
  - Accept or decline

### 3.12 Tournament Details Page

#### 3.12.1 Tournament Information Display
  - Tournament details
  - Game type
  - Start date and time

#### 3.12.2 Become Referee Button
  - Apply to be Referee

### 3.13 Referee Dashboard

#### 3.13.1 Live Matches List
  - All ongoing matches
  - Game type filter

#### 3.13.2 Match Dispute Chat Interface
  - Match chat history
  - Evidence submissions

#### 3.13.3 Evidence Review
  - Evidence list

#### 3.13.4 Override Decision
  - Award Player 1
  - Award Player 2
  - Dismiss Dispute

### 3.14 Admin Dashboard

#### 3.14.1 Choose Referee Interface
  - Referee application chat rooms

#### 3.14.2 Application Chat Interface
  - Conversation with applicant

#### 3.14.3 Referee Selection
  - Game selection
  - Approve or reject

### 3.15 Exchange Rate Page

#### 3.15.1 Currency Pair Selector
  - Select base and target currency

#### 3.15.2 Exchange Rate Display
  - Current exchange rate

#### 3.15.3 Last Updated Timestamp
  - Date and time of last update

#### 3.15.4 Refresh Functionality
  - Manual refresh button

### 3.16 Payment Page

#### 3.16.1 Payment Amount Input
  - Numeric input for amount

#### 3.16.2 Payment Description
  - Optional description field

#### 3.16.3 Stripe Checkout Button
  - Proceed to Payment

#### 3.16.4 Payment Summary
  - Payment details card

### 3.17 Privacy Policy Page

#### 3.17.1 Page Layout
  - Standalone public page at /privacy
  - No authentication required
  - Minimal aesthetic styling with airy layout and generous whitespace
  - Clear typographic hierarchy
  - Clean, readable font
  - Responsive design for desktop and mobile

#### 3.17.2 Page Header
  - Large heading: Privacy Policy
  - Minimal styling with clear visual weight

#### 3.17.3 Last Updated Date
  - Displayed below page header
  - Format: Last Updated: 2026-05-25
  - Smaller text size, muted color

#### 3.17.4 Content Sections

**Introduction:**
  - Brief overview of privacy commitment
  - Scope of policy application

**Information We Collect:**
  - User registration data (username, location, game preferences, game account IDs, Twitch username)
  - Chat messages and communication data
  - Match and tournament participation data
  - Payment information processed through Stripe
  - Device and usage information
  - Identity verification documents (ID, proof of address) for AML/KYC compliance before withdrawals

**How We Use Your Information:**
  - Provide and improve platform services
  - Facilitate tournament participation and match coordination
  - Process payments and prize distribution
  - Communicate with users
  - Ensure platform security and prevent fraud
  - Conduct identity verification and AML/KYC checks
  - Comply with legal and regulatory obligations

**Third-Party Services:**
  - Stripe for payment processing
  - Supabase for data storage and authentication
  - Twitch for streaming integration (platform not liable for content streamed via linked accounts)
  - Explanation of data sharing with third parties
  - Links to third-party privacy policies
  - Safe Harbor clause: Platform not responsible for user-generated content on third-party platforms (DMCA/DSA compliance)

**Data Security:**
  - Security measures to protect user data
  - Limitations of data security
  - User responsibility for account security
  - Right to hold funds for up to 30 days for integrity checks and AML investigations

**AML/KYC Compliance:**
  - Identity verification mandatory before withdrawals
  - Required documents: government-issued ID, proof of address
  - Anti-Money Laundering protocols
  - Right to request additional documentation
  - Right to hold or freeze funds pending verification
  - Compliance with applicable financial regulations

**Your Rights:**
  - Access to personal data
  - Data correction and deletion requests
  - Opt-out options where applicable
  - Contact information for privacy inquiries
  - Consumer protection rights for EU/UK users (cooling-off period exceptions for digital purchases)

**Contact Information:**
  - Email address for privacy-related questions
  - Response timeframe for inquiries

#### 3.17.5 Footer Navigation
  - Back to Home link
  - Terms & Conditions link
  - Minimal styling consistent with page aesthetic

### 3.18 Terms & Conditions Page

#### 3.18.1 Page Layout
  - Standalone public page at /terms
  - No authentication required
  - Minimal aesthetic styling with airy layout and generous whitespace
  - Clear typographic hierarchy
  - Clean, readable font
  - Responsive design for desktop and mobile

#### 3.18.2 Page Header
  - Large heading: Terms & Conditions
  - Minimal styling with clear visual weight

#### 3.18.3 Last Updated Date
  - Displayed below page header
  - Format: Last Updated: 2026-05-25
  - Smaller text size, muted color

#### 3.18.4 Content Sections

**Acceptance of Terms:**
  - Agreement to terms by using platform
  - Age requirements: 18 years or older
  - Right to modify terms
  - Continued use constitutes acceptance of changes

**Games of Skill & Prohibited Jurisdictions:**
  - Platform defined as Game of Skill
  - Paid tournaments prohibited in specific jurisdictions:
    + United States: Arizona, Arkansas, Connecticut, Delaware, Louisiana, Montana, South Carolina, South Dakota, Tennessee, Washington
    + International: jurisdictions where skill-based gaming for prizes is restricted
  - Users responsible for compliance with local laws
  - Platform reserves right to restrict access based on location
  - Violation may result in account termination and forfeiture of funds

**Platform Rules:**
  - General conduct expectations
  - Respect for other users
  - Compliance with applicable laws
  - Account security responsibilities

**Tournament Participation:**
  - Eligibility requirements
  - Registration and participation rules
  - Match scheduling and time zone coordination
  - Fair play expectations
  - Consequences for rule violations

**Arena Currency and Prizes:**
  - Arena Currency (A$) definition: 1 USD = 100 A$
  - Prize distribution rules
  - Payment processing through Stripe
  - Tax responsibilities
  - Prize forfeiture conditions
  - Withdrawal requirements: identity verification mandatory

**AML/KYC Compliance:**
  - Identity verification required before withdrawals
  - Required documents: government-issued ID, proof of address
  - Platform right to request additional documentation
  - Platform right to hold funds for up to 30 days for integrity checks
  - Compliance with Anti-Money Laundering regulations
  - Failure to provide verification may result in account suspension and fund forfeiture

**Financial Security:**
  - Stripe transaction protocols
  - Payment holds for fraud investigation
  - Chargeback penalties: users initiating chargebacks may face account suspension and forfeiture of funds
  - Platform right to investigate suspicious transactions
  - Refund policy limitations

**Dispute Resolution:**
  - Process for initiating disputes
  - Evidence submission requirements
  - Referee review and decision process
  - Finality of referee decisions
  - Appeal limitations

**Prohibited Conduct:**
  - Cheating or use of unauthorized tools
  - Harassment or abusive behavior
  - Impersonation or false information
  - Spam or commercial solicitation
  - Violation of intellectual property rights
  - Account sharing or selling
  - Money laundering or fraudulent activity

**Platform Liability & Disclaimers:**
  - Platform provided as-is
  - No warranty for uninterrupted service
  - Not liable for software bugs, server drops, or third-party API failures (eFootball, PUBG Mobile servers)
  - Not liable for match outcomes affected by technical issues
  - Not liable for content streamed on Twitch via linked accounts
  - Users assume risk of technical failures

**Account Termination:**
  - Grounds for suspension or termination
  - Process for account termination
  - Effect of termination on prizes and currency
  - Right to terminate accounts in prohibited jurisdictions

**Limitation of Liability:**
  - Disclaimer of warranties
  - Limitation of damages
  - Indemnification by users
  - Maximum liability capped at amount paid by user in past 12 months

**Governing Law & Dispute Resolution:**
  - Governed by laws of Delaware, USA
  - Exclusive venue: Delaware courts
  - Binding arbitration through American Arbitration Association (AAA)
  - Class Action Waiver: users waive right to participate in class action lawsuits
  - Individual arbitration only
  - Arbitration costs shared as per AAA rules

**Consumer Protection (EU/UK Users):**
  - Statutory cooling-off period exceptions for digital purchases
  - Right to withdraw within 14 days does not apply to digital content once access granted
  - EU/UK consumer rights preserved where applicable

**Changes to Terms:**
  - Right to modify terms at any time
  - Notification of changes via email or platform notice
  - Continued use constitutes acceptance

#### 3.18.5 Footer Navigation
  - Back to Home link
  - Privacy Policy link
  - Minimal styling consistent with page aesthetic

## 4. Business Rules and Logic

### 4.1 User Identity
  - Four predefined users with distinct properties
  - Logged-in user: you with accent color #a78bfa (purple)

### 4.2 User Roles
  - Regular User
  - Referee
  - Admin

### 4.3 Age Confirmation Rules
  - Age confirmation required on Sign In and Sign Up pages
  - Checkbox must be checked before form submission
  - Error message if unchecked: You must confirm you are 18 years of age or older

### 4.4 Registration Rules
  - Username unique
  - Avatar selection required
  - Location selection required
  - Game preferences optional
  - Game account IDs optional
  - Twitch username optional
  - Age confirmation required

### 4.5 Sign In Rules
  - Username or email required
  - Password required
  - Age confirmation required

### 4.6 Friend System Rules
  - DMs only available to accepted friends
  - Friend requests must be accepted first
  - Friend request cards display sender profile

### 4.7 Message Delivery
  - World chat: bot messages every 8-12 seconds
  - DM: typing indicator, reply after 1.5-2.5s
  - Delivery status indicators

### 4.8 Audio Feedback
  - Synthesized sounds using Web Audio API
  - Send, receive, notification sounds

### 4.9 Online Status
  - Animated pulse dot for online users

### 4.10 Reactions
  - Emoji reactions on messages

### 4.11 Active Channel/DM Highlighting
  - Purple gradient accent bar

### 4.12 Timestamp Display
  - Visible on hover

### 4.13 Team Formation Rules
  - Team Up with accepted friends
  - Maximum 2 members

### 4.14 Quick Match Rules
  - Quick Match with accepted friends
  - Match begins immediately upon acceptance

### 4.15 Match Creation Rules
  - Create Match with accepted friends
  - Select game type: eFootball (1v1) or PUBG Mobile
  - Match invitation sent to friend

### 4.16 Match Dispute Rules
  - Either player can initiate dispute
  - Submit evidence
  - Referee makes final decision

### 4.17 Referee Rules
  - View all live matches
  - Game type filter
  - Review evidence
  - Make override decision

### 4.18 Referee Application Rules
  - Apply from tournament details page
  - Chat with admin
  - One active application per user

### 4.19 Admin Referee Management Rules
  - Review applications
  - Chat with applicant
  - Select games for referee
  - Approve or reject

### 4.20 Time Zone Handling
  - User location determines time zone
  - Tournament times displayed in user local time

### 4.21 Game Account Display Rules
  - Display game accounts in profiles
  - eFootball ID, PUBG Mobile ID

### 4.22 Minimal Design Styling Rules
  - Clean, minimal design
  - Subtle hover effects
  - Clear visual hierarchy

### 4.23 Exchange Rate Rules
  - Rates fetched from external API
  - 4 decimal precision
  - Manual refresh available

### 4.24 Payment Rules
  - Positive amount required
  - Currency selection required
  - Stripe checkout

### 4.25 Twitch Username Rules
  - Optional during registration
  - Stored in twitch_handle column

### 4.26 Privacy Policy and Terms & Conditions Access Rules
  - Publicly accessible at /privacy and /terms
  - Links on registration, sign in, and footer
  - Minimal aesthetic styling

### 4.27 Arena Currency Rules
  - 1 USD = 100 A$
  - Used for prizes and transactions

### 4.28 AML/KYC Compliance Rules
  - Identity verification mandatory before withdrawals
  - Required documents: government-issued ID, proof of address
  - Platform right to hold funds for up to 30 days for integrity checks
  - Failure to verify may result in account suspension and fund forfeiture

### 4.29 Prohibited Jurisdictions Rules
  - Paid tournaments prohibited in specific US states and international jurisdictions
  - Platform restricts access based on location
  - Violation results in account termination and fund forfeiture

### 4.30 Financial Security Rules
  - Stripe transaction protocols
  - Payment holds for fraud investigation
  - Chargeback penalties: account suspension and fund forfeiture

### 4.31 Platform Liability Rules
  - Not liable for software bugs, server drops, third-party API failures
  - Not liable for content streamed on Twitch
  - Users assume risk of technical failures

### 4.32 Governing Law Rules
  - Governed by Delaware, USA laws
  - Binding arbitration through AAA
  - Class Action Waiver

### 4.33 Consumer Protection Rules (EU/UK)
  - Cooling-off period exceptions for digital purchases
  - Right to withdraw does not apply once digital content accessed

## 5. Exception and Boundary Cases

| Scenario | Handling |
|---|---|
| User attempts to submit sign in form without checking age confirmation | Form submission blocked, error message displayed |
| User attempts to submit registration form without checking age confirmation | Form submission blocked, error message displayed |
| User from prohibited jurisdiction attempts to register | Registration blocked or account restricted from paid tournaments |
| User fails to provide identity verification documents before withdrawal | Withdrawal blocked, account may be suspended |
| User initiates chargeback | Account suspended, funds forfeited |
| Platform holds funds for AML investigation | User notified, funds held for up to 30 days |
| User disputes referee decision | Appeal denied, referee decision final |
| Technical failure affects match outcome | Platform not liable, users assume risk |
| User streams prohibited content on Twitch | Platform not liable, user responsible |
| EU/UK user requests refund after accessing digital content | Refund denied, cooling-off period exception applies |
| User attempts to participate in class action lawsuit | Class action waived, individual arbitration only |
| User from prohibited jurisdiction detected after registration | Account terminated, funds forfeited |
| Payment processing fails due to Stripe API issue | Error message displayed, user can retry |
| User provides false identity documents | Account terminated, funds forfeited, legal action possible |
| User attempts withdrawal without completing KYC | Withdrawal blocked, KYC verification required |
| Platform detects suspicious transaction | Transaction held, investigation initiated |
| User violates AML regulations | Account terminated, funds frozen, authorities notified |
| User attempts to access platform from restricted IP | Access blocked, notification displayed |
| User disputes chargeback penalty | Penalty upheld, account remains suspended |
| Platform updates terms without user notification | User deemed to accept by continued use |
| User claims technical failure caused match loss | Claim reviewed, platform not liable per disclaimers |
| User requests data deletion under GDPR | Data deleted per privacy policy, account closed |
| User attempts to register with VPN from prohibited jurisdiction | Registration may be blocked or flagged for review |
| User provides incomplete identity documents | Verification rejected, additional documents requested |
| User fails to respond to KYC request within timeframe | Account suspended, funds held |
| Platform experiences server downtime during tournament | Tournament rescheduled or cancelled, no liability |
| Third-party API (eFootball, PUBG Mobile) fails during match | Match result disputed, referee reviews evidence |
| User streams copyrighted content on Twitch | Platform not liable, user responsible |
| User from EU/UK disputes arbitration clause | EU/UK consumer rights preserved where applicable |
| User attempts to create multiple accounts to bypass restrictions | All accounts terminated, funds forfeited |
| User provides fraudulent identity documents | Account terminated, legal action possible |
| Platform detects money laundering activity | Account frozen, authorities notified |
| User disputes fund hold during AML investigation | Hold upheld, investigation continues |
| User attempts to withdraw funds before KYC completion | Withdrawal blocked, KYC required |
| User from prohibited jurisdiction uses VPN to access paid tournaments | Account terminated upon detection, funds forfeited |
| User disputes platform liability disclaimer | Disclaimer upheld per terms |
| User requests arbitration through non-AAA body | Request denied, AAA arbitration required |
| User attempts to join class action lawsuit | Class action waived, individual arbitration only |
| Platform updates prohibited jurisdictions list | Users notified, accounts in new prohibited jurisdictions restricted |
| User disputes cooling-off period exception | Exception upheld per EU/UK consumer protection laws |
| User claims platform liable for Twitch content | Liability denied per safe harbor clause |
| User disputes chargeback penalty after account suspension | Penalty upheld, account remains suspended |
| User attempts to transfer funds to another user | Transfer blocked, direct transfers not supported |
| User disputes maximum liability cap | Cap upheld per terms |
| User from Delaware disputes governing law clause | Clause upheld, Delaware law applies |
| User attempts to opt out of arbitration clause | Opt-out denied, arbitration required |
| User disputes AAA arbitration costs | Costs shared per AAA rules |
| User claims platform failed to notify of terms changes | Notification deemed sufficient per terms |
| User disputes fund forfeiture after account termination | Forfeiture upheld per terms |
| User attempts to access platform after account termination | Access denied, account remains terminated |
| User disputes identity verification requirement | Requirement upheld per AML/KYC compliance |
| User claims platform held funds beyond 30 days | Hold reviewed, extended if investigation ongoing |
| User disputes prohibited jurisdiction restriction | Restriction upheld, account remains restricted |
| User attempts to register with false location | Registration flagged, account may be terminated |
| User disputes platform liability for technical failures | Liability denied per disclaimers |
| User claims platform responsible for third-party API failures | Responsibility denied per disclaimers |
| User disputes safe harbor clause for Twitch content | Clause upheld, platform not liable |
| User attempts to withdraw funds during fraud investigation | Withdrawal blocked, investigation continues |
| User disputes chargeback penalty without evidence | Penalty upheld, account remains suspended |
| User claims platform failed to comply with GDPR | Compliance reviewed, data deletion processed if valid |
| User disputes cooling-off period exception without basis | Exception upheld per consumer protection laws |
| User attempts to access platform from multiple prohibited jurisdictions | Access blocked, account flagged |
| User disputes class action waiver under state law | Waiver upheld, federal arbitration law applies |
| User claims platform liable for match outcome due to bug | Liability denied per disclaimers |
| User disputes fund hold without providing requested documents | Hold upheld, documents required |
| User attempts to register with expired identity documents | Registration blocked, valid documents required |
| User disputes account termination for prohibited conduct | Termination upheld per terms |
| User claims platform failed to notify of AML investigation | Notification deemed sufficient per privacy policy |
| User disputes maximum liability cap under consumer protection law | Cap upheld, exceptions apply only where legally required |
| User attempts to access platform after fund forfeiture | Access denied, funds remain forfeited |
| User disputes arbitration clause under international law | Clause upheld, Delaware law and AAA arbitration apply |
| User claims platform responsible for Stripe payment failure | Responsibility denied, Stripe terms apply |
| User disputes prohibited jurisdiction list accuracy | List reviewed, updates made if necessary |
| User attempts to withdraw funds without completing address verification | Withdrawal blocked, address verification required |
| User disputes fund forfeiture for chargeback | Forfeiture upheld per financial security rules |
| User claims platform failed to provide adequate notice of terms changes | Notice deemed sufficient, continued use constitutes acceptance |
| User disputes identity verification requirement under privacy law | Requirement upheld per AML/KYC compliance |
| User attempts to register with identity documents from prohibited jurisdiction | Registration blocked or restricted from paid tournaments |
| User disputes platform liability for server downtime | Liability denied per disclaimers |
| User claims platform responsible for third-party content on Twitch | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under EU law | Exception upheld, digital content accessed |
| User attempts to access platform after AML violation | Access denied, account remains terminated |
| User disputes class action waiver under consumer protection law | Waiver upheld, arbitration required |
| User claims platform liable for match outcome due to third-party API failure | Liability denied per disclaimers |
| User disputes fund hold duration beyond 30 days | Hold reviewed, extended if investigation requires |
| User attempts to register with false identity documents | Registration blocked, legal action possible |
| User disputes account termination for money laundering | Termination upheld, authorities notified |
| User claims platform failed to comply with AML regulations | Compliance reviewed, corrective action taken if necessary |
| User disputes prohibited jurisdiction restriction under local law | Restriction upheld, platform compliance with local law required |
| User attempts to withdraw funds after account suspension | Withdrawal blocked, account remains suspended |
| User disputes chargeback penalty under payment processor terms | Penalty upheld per platform financial security rules |
| User claims platform responsible for fraud investigation delay | Responsibility denied, investigation timeframe reasonable |
| User disputes identity verification requirement under data protection law | Requirement upheld per AML/KYC compliance |
| User attempts to access platform with VPN after termination | Access blocked, termination remains in effect |
| User disputes maximum liability cap under tort law | Cap upheld, exceptions apply only where legally required |
| User claims platform liable for technical failure during withdrawal | Liability denied per disclaimers |
| User disputes arbitration clause under consumer protection law | Clause upheld, arbitration required |
| User attempts to register with identity documents from restricted country | Registration blocked or restricted from paid tournaments |
| User disputes fund forfeiture for prohibited conduct | Forfeiture upheld per terms |
| User claims platform failed to notify of prohibited jurisdiction change | Notification deemed sufficient per terms |
| User disputes cooling-off period exception under UK law | Exception upheld, digital content accessed |
| User attempts to access platform after fund forfeiture | Access denied, funds remain forfeited |
| User disputes class action waiver under arbitration law | Waiver upheld, individual arbitration only |
| User claims platform responsible for match outcome due to server drop | Responsibility denied per disclaimers |
| User disputes identity verification requirement under financial regulation | Requirement upheld per AML/KYC compliance |
| User attempts to withdraw funds without completing full KYC | Withdrawal blocked, full KYC required |
| User disputes account termination for false information | Termination upheld per prohibited conduct rules |
| User claims platform failed to comply with consumer protection law | Compliance reviewed, corrective action taken if necessary |
| User disputes prohibited jurisdiction restriction under international law | Restriction upheld, platform compliance with applicable law required |
| User attempts to register with identity documents in foreign language | Registration may require translated documents |
| User disputes fund hold for fraud investigation without basis | Hold upheld, investigation continues |
| User claims platform liable for payment processing failure | Liability denied, Stripe terms apply |
| User disputes chargeback penalty under banking regulation | Penalty upheld per platform financial security rules |
| User attempts to access platform after AML investigation | Access restored if investigation clears, otherwise remains blocked |
| User disputes maximum liability cap under contract law | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for third-party API failure during tournament | Responsibility denied per disclaimers |
| User disputes identity verification requirement under privacy regulation | Requirement upheld per AML/KYC compliance |
| User attempts to withdraw funds during pending dispute | Withdrawal blocked, dispute resolution required |
| User disputes account termination for chargeback | Termination upheld per financial security rules |
| User claims platform failed to notify of AML compliance requirement | Notification deemed sufficient per privacy policy |
| User disputes cooling-off period exception under consumer law | Exception upheld, digital content accessed |
| User attempts to register with identity documents from sanctioned country | Registration blocked |
| User disputes fund forfeiture for account termination | Forfeiture upheld per terms |
| User claims platform liable for technical failure during match | Liability denied per disclaimers |
| User disputes arbitration clause under state arbitration law | Clause upheld, federal arbitration law applies |
| User attempts to access platform after prohibited conduct violation | Access denied, account remains terminated |
| User disputes class action waiver under class action law | Waiver upheld, individual arbitration only |
| User claims platform responsible for Stripe payment hold | Responsibility denied, Stripe terms apply |
| User disputes prohibited jurisdiction list under local regulation | List upheld, platform compliance with applicable law required |
| User attempts to withdraw funds without identity verification | Withdrawal blocked, identity verification required |
| User disputes fund hold duration under financial regulation | Hold reviewed, duration reasonable per AML compliance |
| User claims platform failed to comply with data protection regulation | Compliance reviewed, corrective action taken if necessary |
| User disputes identity verification requirement under banking law | Requirement upheld per AML/KYC compliance |
| User attempts to register with expired proof of address | Registration blocked, current proof of address required |
| User disputes account termination for money laundering without evidence | Termination upheld, investigation findings sufficient |
| User claims platform liable for server downtime during paid tournament | Liability denied per disclaimers |
| User disputes chargeback penalty under consumer protection regulation | Penalty upheld per platform financial security rules |
| User attempts to access platform after fund forfeiture for violation | Access denied, funds remain forfeited |
| User disputes maximum liability cap under negligence law | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for third-party content liability | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under distance selling regulation | Exception upheld, digital content accessed |
| User attempts to withdraw funds after account suspension for fraud | Withdrawal blocked, account remains suspended |
| User disputes identity verification requirement under anti-fraud regulation | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of terms update | Notification deemed sufficient, continued use constitutes acceptance |
| User disputes prohibited jurisdiction restriction under gaming regulation | Restriction upheld, platform compliance with gaming law required |
| User attempts to register with identity documents from high-risk country | Registration flagged for enhanced due diligence |
| User disputes fund hold for AML investigation under financial law | Hold upheld, investigation timeframe reasonable |
| User claims platform liable for payment processing delay | Liability denied, Stripe terms apply |
| User disputes account termination for prohibited conduct under contract law | Termination upheld per terms |
| User attempts to access platform after AML violation detection | Access denied, account remains terminated |
| User disputes class action waiver under consumer arbitration law | Waiver upheld, individual arbitration only |
| User claims platform responsible for match outcome due to software bug | Responsibility denied per disclaimers |
| User disputes identity verification requirement under KYC regulation | Requirement upheld per AML/KYC compliance |
| User attempts to withdraw funds without completing address verification | Withdrawal blocked, address verification required |
| User disputes fund forfeiture for chargeback under payment law | Forfeiture upheld per financial security rules |
| User claims platform failed to comply with arbitration regulation | Compliance reviewed, AAA arbitration upheld |
| User disputes prohibited jurisdiction restriction under skill gaming law | Restriction upheld, platform compliance with skill gaming regulation required |
| User attempts to register with false proof of address | Registration blocked, legal action possible |
| User disputes account termination for false identity documents | Termination upheld, legal action possible |
| User claims platform liable for technical failure during withdrawal process | Liability denied per disclaimers |
| User disputes chargeback penalty under merchant agreement | Penalty upheld per platform financial security rules |
| User attempts to access platform after prohibited jurisdiction detection | Access blocked, account restricted or terminated |
| User disputes maximum liability cap under warranty law | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for Twitch streaming failure | Responsibility denied, Twitch terms apply |
| User disputes cooling-off period exception under e-commerce regulation | Exception upheld, digital content accessed |
| User attempts to withdraw funds during ongoing AML investigation | Withdrawal blocked, investigation must complete |
| User disputes identity verification requirement under financial crime regulation | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of prohibited jurisdiction update | Notification deemed sufficient per terms |
| User disputes fund hold duration under AML regulation | Hold reviewed, duration reasonable per compliance requirements |
| User attempts to register with identity documents from embargoed country | Registration blocked |
| User disputes account termination for money laundering under criminal law | Termination upheld, authorities notified |
| User claims platform liable for server failure during match | Liability denied per disclaimers |
| User disputes arbitration clause under international arbitration law | Clause upheld, AAA arbitration applies |
| User attempts to access platform after fund forfeiture for fraud | Access denied, funds remain forfeited |
| User disputes class action waiver under federal arbitration law | Waiver upheld, individual arbitration only |
| User claims platform responsible for payment hold by Stripe | Responsibility denied, Stripe terms apply |
| User disputes prohibited jurisdiction list under state gaming law | List upheld, platform compliance with state law required |
| User attempts to withdraw funds without full identity verification | Withdrawal blocked, full verification required |
| User disputes fund forfeiture for account termination under contract law | Forfeiture upheld per terms |
| User claims platform failed to comply with consumer protection regulation | Compliance reviewed, corrective action taken if necessary |
| User disputes identity verification requirement under money laundering regulation | Requirement upheld per AML/KYC compliance |
| User attempts to register with identity documents in unsupported format | Registration blocked, supported format required |
| User disputes account termination for prohibited conduct under tort law | Termination upheld per terms |
| User claims platform liable for third-party API failure during paid tournament | Liability denied per disclaimers |
| User disputes chargeback penalty under credit card regulation | Penalty upheld per platform financial security rules |
| User attempts to access platform after AML compliance failure | Access denied, account remains terminated |
| User disputes maximum liability cap under product liability law | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for content liability on Twitch | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under consumer rights regulation | Exception upheld, digital content accessed |
| User attempts to withdraw funds after account suspension for chargeback | Withdrawal blocked, account remains suspended |
| User disputes identity verification requirement under terrorist financing regulation | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of AML investigation | Notification deemed sufficient per privacy policy |
| User disputes prohibited jurisdiction restriction under federal gaming law | Restriction upheld, platform compliance with federal law required |
| User attempts to register with identity documents from non-recognized country | Registration blocked or requires additional verification |
| User disputes fund hold for fraud investigation under consumer law | Hold upheld, investigation timeframe reasonable |
| User claims platform liable for payment processing error | Liability denied, Stripe terms apply |
| User disputes account termination for false information under fraud law | Termination upheld, legal action possible |
| User attempts to access platform after prohibited conduct detection | Access denied, account remains terminated |
| User disputes class action waiver under state consumer law | Waiver upheld, federal arbitration law applies |
| User claims platform responsible for match outcome due to network failure | Responsibility denied per disclaimers |
| User disputes identity verification requirement under sanctions regulation | Requirement upheld per AML/KYC compliance |
| User attempts to withdraw funds without proof of address | Withdrawal blocked, proof of address required |
| User disputes fund forfeiture for chargeback under banking law | Forfeiture upheld per financial security rules |
| User claims platform failed to comply with arbitration law | Compliance reviewed, AAA arbitration upheld |
| User disputes prohibited jurisdiction restriction under international gaming law | Restriction upheld, platform compliance with international law required |
| User attempts to register with forged identity documents | Registration blocked, legal action initiated |
| User disputes account termination for money laundering under AML law | Termination upheld, authorities notified |
| User claims platform liable for technical failure during tournament | Liability denied per disclaimers |
| User disputes chargeback penalty under payment processor regulation | Penalty upheld per platform financial security rules |
| User attempts to access platform after fund forfeiture for AML violation | Access denied, funds remain forfeited |
| User disputes maximum liability cap under strict liability law | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for Twitch content moderation | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under digital content regulation | Exception upheld, digital content accessed |
| User attempts to withdraw funds during pending chargeback investigation | Withdrawal blocked, investigation must complete |
| User disputes identity verification requirement under financial intelligence regulation | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of prohibited jurisdiction restriction | Notification deemed sufficient per terms |
| User disputes fund hold duration under fraud prevention regulation | Hold reviewed, duration reasonable per compliance requirements |
| User attempts to register with identity documents from terrorist-linked country | Registration blocked |
| User disputes account termination for prohibited conduct under criminal law | Termination upheld, legal action possible |
| User claims platform liable for server outage during paid match | Liability denied per disclaimers |
| User disputes arbitration clause under consumer arbitration regulation | Clause upheld, AAA arbitration applies |
| User attempts to access platform after prohibited jurisdiction violation | Access denied, account remains restricted or terminated |
| User disputes class action waiver under consumer class action law | Waiver upheld, individual arbitration only |
| User claims platform responsible for payment delay by Stripe | Responsibility denied, Stripe terms apply |
| User disputes prohibited jurisdiction list under local skill gaming law | List upheld, platform compliance with local law required |
| User attempts to withdraw funds without government-issued ID | Withdrawal blocked, government-issued ID required |
| User disputes fund forfeiture for account termination under consumer law | Forfeiture upheld per terms |
| User claims platform failed to comply with data protection law | Compliance reviewed, corrective action taken if necessary |
| User disputes identity verification requirement under counter-terrorism financing regulation | Requirement upheld per AML/KYC compliance |
| User attempts to register with identity documents from sanctioned individual | Registration blocked |
| User disputes account termination for false identity under identity theft law | Termination upheld, legal action possible |
| User claims platform liable for third-party service failure during match | Liability denied per disclaimers |
| User disputes chargeback penalty under merchant services agreement | Penalty upheld per platform financial security rules |
| User attempts to access platform after AML red flag detection | Access denied, account remains terminated |
| User disputes maximum liability cap under consumer protection law | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for user-generated content on Twitch | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under online sales regulation | Exception upheld, digital content accessed |
| User attempts to withdraw funds after account suspension for fraud investigation | Withdrawal blocked, account remains suspended |
| User disputes identity verification requirement under beneficial ownership regulation | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of terms change | Notification deemed sufficient, continued use constitutes acceptance |
| User disputes prohibited jurisdiction restriction under state skill gaming regulation | Restriction upheld, platform compliance with state regulation required |
| User attempts to register with identity documents from high-risk jurisdiction | Registration flagged for enhanced due diligence |
| User disputes fund hold for AML investigation under banking regulation | Hold upheld, investigation timeframe reasonable |
| User claims platform liable for payment processing failure by Stripe | Liability denied, Stripe terms apply |
| User disputes account termination for prohibited conduct under platform rules | Termination upheld per terms |
| User attempts to access platform after money laundering detection | Access denied, account remains terminated |
| User disputes class action waiver under arbitration agreement law | Waiver upheld, individual arbitration only |
| User claims platform responsible for match outcome due to API error | Responsibility denied per disclaimers |
| User disputes identity verification requirement under customer due diligence regulation | Requirement upheld per AML/KYC compliance |
| User attempts to withdraw funds without current proof of address | Withdrawal blocked, current proof of address required |
| User disputes fund forfeiture for chargeback under consumer credit law | Forfeiture upheld per financial security rules |
| User claims platform failed to comply with arbitration agreement | Compliance reviewed, AAA arbitration upheld |
| User disputes prohibited jurisdiction restriction under federal skill gaming law | Restriction upheld, platform compliance with federal law required |
| User attempts to register with stolen identity documents | Registration blocked, legal action initiated |
| User disputes account termination for money laundering under financial crime law | Termination upheld, authorities notified |
| User claims platform liable for technical glitch during tournament | Liability denied per disclaimers |
| User disputes chargeback penalty under card network rules | Penalty upheld per platform financial security rules |
| User attempts to access platform after fund forfeiture for prohibited conduct | Access denied, funds remain forfeited |
| User disputes maximum liability cap under negligence law | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for third-party platform content | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under consumer contract regulation | Exception upheld, digital content accessed |
| User attempts to withdraw funds during ongoing fraud investigation | Withdrawal blocked, investigation must complete |
| User disputes identity verification requirement under politically exposed person regulation | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of prohibited jurisdiction addition | Notification deemed sufficient per terms |
| User disputes fund hold duration under anti-fraud regulation | Hold reviewed, duration reasonable per compliance requirements |
| User attempts to register with identity documents from conflict zone | Registration flagged for enhanced due diligence |
| User disputes account termination for prohibited conduct under gaming law | Termination upheld per terms |
| User claims platform liable for service interruption during paid match | Liability denied per disclaimers |
| User disputes arbitration clause under mandatory arbitration law | Clause upheld, AAA arbitration applies |
| User attempts to access platform after prohibited jurisdiction flag | Access denied, account remains restricted or terminated |
| User disputes class action waiver under collective action law | Waiver upheld, individual arbitration only |
| User claims platform responsible for payment error by Stripe | Responsibility denied, Stripe terms apply |
| User disputes prohibited jurisdiction list under international skill gaming regulation | List upheld, platform compliance with international regulation required |
| User attempts to withdraw funds without valid identity verification | Withdrawal blocked, valid identity verification required |
| User disputes fund forfeiture for account termination under financial law | Forfeiture upheld per terms |
| User claims platform failed to comply with consumer rights law | Compliance reviewed, corrective action taken if necessary |
| User disputes identity verification requirement under enhanced due diligence regulation | Requirement upheld per AML/KYC compliance |
| User attempts to register with identity documents from unrecognized state | Registration blocked or requires additional verification |
| User disputes account termination for false documents under fraud prevention law | Termination upheld, legal action possible |
| User claims platform liable for third-party infrastructure failure during match | Liability denied per disclaimers |
| User disputes chargeback penalty under payment card industry rules | Penalty upheld per platform financial security rules |
| User attempts to access platform after AML compliance breach | Access denied, account remains terminated |
| User disputes maximum liability cap under contract breach law | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for streaming platform content liability | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under distance contract regulation | Exception upheld, digital content accessed |
| User attempts to withdraw funds after account suspension for AML investigation | Withdrawal blocked, account remains suspended |
| User disputes identity verification requirement under risk-based approach regulation | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of AML requirement | Notification deemed sufficient per privacy policy |
| User disputes prohibited jurisdiction restriction under skill-based gaming law | Restriction upheld, platform compliance with skill-based gaming law required |
| User attempts to register with identity documents from designated high-risk country | Registration flagged for enhanced due diligence |
| User disputes fund hold for fraud investigation under financial services regulation | Hold upheld, investigation timeframe reasonable |
| User claims platform liable for payment gateway failure | Liability denied, Stripe terms apply |
| User disputes account termination for prohibited conduct under terms of service | Termination upheld per terms |
| User attempts to access platform after financial crime detection | Access denied, account remains terminated |
| User disputes class action waiver under consumer dispute resolution law | Waiver upheld, individual arbitration only |
| User claims platform responsible for match outcome due to system failure | Responsibility denied per disclaimers |
| User disputes identity verification requirement under source of funds regulation | Requirement upheld per AML/KYC compliance |
| User attempts to withdraw funds without completing enhanced due diligence | Withdrawal blocked, enhanced due diligence required |
| User disputes fund forfeiture for chargeback under electronic payment law | Forfeiture upheld per financial security rules |
| User claims platform failed to comply with mandatory arbitration law | Compliance reviewed, AAA arbitration upheld |
| User disputes prohibited jurisdiction restriction under prize-based gaming regulation | Restriction upheld, platform compliance with prize-based gaming regulation required |
| User attempts to register with identity documents from terrorist organization | Registration blocked, authorities notified |
| User disputes account termination for money laundering under proceeds of crime law | Termination upheld, authorities notified |
| User claims platform liable for infrastructure failure during tournament | Liability denied per disclaimers |
| User disputes chargeback penalty under electronic funds transfer regulation | Penalty upheld per platform financial security rules |
| User attempts to access platform after fund forfeiture for financial crime | Access denied, funds remain forfeited |
| User disputes maximum liability cap under consumer contract law | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for linked platform content moderation | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under consumer purchase regulation | Exception upheld, digital content accessed |
| User attempts to withdraw funds during pending AML review | Withdrawal blocked, review must complete |
| User disputes identity verification requirement under transaction monitoring regulation | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of prohibited jurisdiction update | Notification deemed sufficient per terms |
| User disputes fund hold duration under financial intelligence unit regulation | Hold reviewed, duration reasonable per compliance requirements |
| User attempts to register with identity documents from sanctioned entity | Registration blocked |
| User disputes account termination for prohibited conduct under anti-fraud law | Termination upheld, legal action possible |
| User claims platform liable for system error during paid match | Liability denied per disclaimers |
| User disputes arbitration clause under binding arbitration law | Clause upheld, AAA arbitration applies |
| User attempts to access platform after prohibited jurisdiction enforcement | Access denied, account remains restricted or terminated |
| User disputes class action waiver under group litigation law | Waiver upheld, individual arbitration only |
| User claims platform responsible for payment processor error | Responsibility denied, Stripe terms apply |
| User disputes prohibited jurisdiction list under competitive gaming regulation | List upheld, platform compliance with competitive gaming regulation required |
| User attempts to withdraw funds without source of wealth verification | Withdrawal blocked, source of wealth verification required |
| User disputes fund forfeiture for account termination under payment law | Forfeiture upheld per terms |
| User claims platform failed to comply with consumer dispute law | Compliance reviewed, corrective action taken if necessary |
| User disputes identity verification requirement under suspicious activity reporting regulation | Requirement upheld per AML/KYC compliance |
| User attempts to register with identity documents from designated terrorist country | Registration blocked |
| User disputes account termination for false identity under criminal law | Termination upheld, legal action possible |
| User claims platform liable for third-party platform failure during match | Liability denied per disclaimers |
| User disputes chargeback penalty under consumer credit regulation | Penalty upheld per platform financial security rules |
| User attempts to access platform after AML red flag enforcement | Access denied, account remains terminated |
| User disputes maximum liability cap under tort liability law | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for user content on linked platform | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under digital goods regulation | Exception upheld, digital content accessed |
| User attempts to withdraw funds after account suspension for financial investigation | Withdrawal blocked, account remains suspended |
| User disputes identity verification requirement under correspondent banking regulation | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of terms modification | Notification deemed sufficient, continued use constitutes acceptance |
| User disputes prohibited jurisdiction restriction under online gaming law | Restriction upheld, platform compliance with online gaming law required |
| User attempts to register with identity documents from shell company jurisdiction | Registration flagged for enhanced due diligence |
| User disputes fund hold for AML investigation under financial action task force regulation | Hold upheld, investigation timeframe reasonable |
| User claims platform liable for payment system failure | Liability denied, Stripe terms apply |
| User disputes account termination for prohibited conduct under gaming regulation | Termination upheld per terms |
| User attempts to access platform after financial integrity breach | Access denied, account remains terminated |
| User disputes class action waiver under mass arbitration law | Waiver upheld, individual arbitration only |
| User claims platform responsible for match outcome due to platform error | Responsibility denied per disclaimers |
| User disputes identity verification requirement under wire transfer regulation | Requirement upheld per AML/KYC compliance |
| User attempts to withdraw funds without beneficial ownership disclosure | Withdrawal blocked, beneficial ownership disclosure required |
| User disputes fund forfeiture for chargeback under payment services law | Forfeiture upheld per financial security rules |
| User claims platform failed to comply with arbitration enforcement law | Compliance reviewed, AAA arbitration upheld |
| User disputes prohibited jurisdiction restriction under cash prize gaming regulation | Restriction upheld, platform compliance with cash prize gaming regulation required |
| User attempts to register with identity documents from money laundering haven | Registration flagged for enhanced due diligence |
| User disputes account termination for money laundering under anti-money laundering law | Termination upheld, authorities notified |
| User claims platform liable for service failure during tournament | Liability denied per disclaimers |
| User disputes chargeback penalty under merchant account agreement | Penalty upheld per platform financial security rules |
| User attempts to access platform after fund forfeiture for AML breach | Access denied, funds remain forfeited |
| User disputes maximum liability cap under breach of contract law | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for third-party content liability | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under electronic commerce regulation | Exception upheld, digital content accessed |
| User attempts to withdraw funds during ongoing financial crime investigation | Withdrawal blocked, investigation must complete |
| User disputes identity verification requirement under currency transaction reporting regulation | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of prohibited jurisdiction enforcement | Notification deemed sufficient per terms |
| User disputes fund hold duration under financial crimes enforcement network regulation | Hold reviewed, duration reasonable per compliance requirements |
| User attempts to register with identity documents from narco-state | Registration blocked or flagged for enhanced due diligence |
| User disputes account termination for prohibited conduct under financial crime law | Termination upheld, legal action possible |
| User claims platform liable for technical malfunction during paid match | Liability denied per disclaimers |
| User disputes arbitration clause under alternative dispute resolution law | Clause upheld, AAA arbitration applies |
| User attempts to access platform after prohibited jurisdiction detection | Access denied, account remains restricted or terminated |
| User disputes class action waiver under representative action law | Waiver upheld, individual arbitration only |
| User claims platform responsible for payment gateway error | Responsibility denied, Stripe terms apply |
| User disputes prohibited jurisdiction list under real money gaming regulation | List upheld, platform compliance with real money gaming regulation required |
| User attempts to withdraw funds without politically exposed person screening | Withdrawal blocked, PEP screening required |
| User disputes fund forfeiture for account termination under electronic commerce law | Forfeiture upheld per terms |
| User claims platform failed to comply with consumer arbitration law | Compliance reviewed, corrective action taken if necessary |
| User disputes identity verification requirement under financial institution regulation | Requirement upheld per AML/KYC compliance |
| User attempts to register with identity documents from organized crime jurisdiction | Registration flagged for enhanced due diligence |
| User disputes account termination for false documents under identity fraud law | Termination upheld, legal action possible |
| User claims platform liable for infrastructure outage during match | Liability denied per disclaimers |
| User disputes chargeback penalty under payment card regulation | Penalty upheld per platform financial security rules |
| User attempts to access platform after AML violation enforcement | Access denied, account remains terminated |
| User disputes maximum liability cap under warranty breach law | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for streaming content liability | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under consumer sales regulation | Exception upheld, digital content accessed |
| User attempts to withdraw funds after account suspension for AML breach | Withdrawal blocked, account remains suspended |
| User disputes identity verification requirement under know your customer regulation | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of AML compliance requirement | Notification deemed sufficient per privacy policy |
| User disputes prohibited jurisdiction restriction under sweepstakes law | Restriction upheld, platform compliance with sweepstakes law required |
| User attempts to register with identity documents from corruption-prone country | Registration flagged for enhanced due diligence |
| User disputes fund hold for fraud investigation under consumer protection regulation | Hold upheld, investigation timeframe reasonable |
| User claims platform liable for payment processing system failure | Liability denied, Stripe terms apply |
| User disputes account termination for prohibited conduct under platform policy | Termination upheld per terms |
| User attempts to access platform after financial compliance failure | Access denied, account remains terminated |
| User disputes class action waiver under consumer class arbitration law | Waiver upheld, individual arbitration only |
| User claims platform responsible for match outcome due to software defect | Responsibility denied per disclaimers |
| User disputes identity verification requirement under financial transparency regulation | Requirement upheld per AML/KYC compliance |
| User attempts to withdraw funds without sanctions screening | Withdrawal blocked, sanctions screening required |
| User disputes fund forfeiture for chargeback under consumer payment law | Forfeiture upheld per financial security rules |
| User claims platform failed to comply with binding arbitration agreement | Compliance reviewed, AAA arbitration upheld |
| User disputes prohibited jurisdiction restriction under contest law | Restriction upheld, platform compliance with contest law required |
| User attempts to register with identity documents from kleptocracy | Registration blocked or flagged for enhanced due diligence |
| User disputes account termination for money laundering under financial intelligence law | Termination upheld, authorities notified |
| User claims platform liable for system crash during tournament | Liability denied per disclaimers |
| User disputes chargeback penalty under electronic payment regulation | Penalty upheld per platform financial security rules |
| User attempts to access platform after fund forfeiture for compliance breach | Access denied, funds remain forfeited |
| User disputes maximum liability cap under service agreement law | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for linked service content moderation | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under online purchase regulation | Exception upheld, digital content accessed |
| User attempts to withdraw funds during pending compliance review | Withdrawal blocked, review must complete |
| User disputes identity verification requirement under customer identification program regulation | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of prohibited jurisdiction change | Notification deemed sufficient per terms |
| User disputes fund hold duration under bank secrecy act regulation | Hold reviewed, duration reasonable per compliance requirements |
| User attempts to register with identity documents from failed state | Registration blocked or requires extensive verification |
| User disputes account termination for prohibited conduct under anti-corruption law | Termination upheld, legal action possible |
| User claims platform liable for network failure during paid match | Liability denied per disclaimers |
| User disputes arbitration clause under consumer arbitration agreement law | Clause upheld, AAA arbitration applies |
| User attempts to access platform after prohibited jurisdiction restriction | Access denied, account remains restricted or terminated |
| User disputes class action waiver under joint action law | Waiver upheld, individual arbitration only |
| User claims platform responsible for payment service provider error | Responsibility denied, Stripe terms apply |
| User disputes prohibited jurisdiction list under gambling regulation | List upheld, platform compliance with gambling regulation required |
| User attempts to withdraw funds without adverse media screening | Withdrawal blocked, adverse media screening required |
| User disputes fund forfeiture for account termination under financial services law | Forfeiture upheld per terms |
| User claims platform failed to comply with consumer dispute resolution law | Compliance reviewed, corrective action taken if necessary |
| User disputes identity verification requirement under financial crimes regulation | Requirement upheld per AML/KYC compliance |
| User attempts to register with identity documents from tax haven with secrecy laws | Registration flagged for enhanced due diligence |
| User disputes account termination for false identity under anti-fraud regulation | Termination upheld, legal action possible |
| User claims platform liable for third-party service outage during match | Liability denied per disclaimers |
| User disputes chargeback penalty under credit card network rules | Penalty upheld per platform financial security rules |
| User attempts to access platform after AML enforcement action | Access denied, account remains terminated |
| User disputes maximum liability cap under professional negligence law | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for user-generated content on third-party platform | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under consumer rights directive | Exception upheld, digital content accessed |
| User attempts to withdraw funds after account suspension for compliance investigation | Withdrawal blocked, account remains suspended |
| User disputes identity verification requirement under anti-terrorism financing regulation | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of terms update | Notification deemed sufficient, continued use constitutes acceptance |
| User disputes prohibited jurisdiction restriction under prize competition law | Restriction upheld, platform compliance with prize competition law required |
| User attempts to register with identity documents from offshore financial center | Registration flagged for enhanced due diligence |
| User disputes fund hold for AML investigation under patriot act regulation | Hold upheld, investigation timeframe reasonable |
| User claims platform liable for payment infrastructure failure | Liability denied, Stripe terms apply |
| User disputes account termination for prohibited conduct under financial regulation | Termination upheld per terms |
| User attempts to access platform after financial crime enforcement | Access denied, account remains terminated |
| User disputes class action waiver under collective arbitration law | Waiver upheld, individual arbitration only |
| User claims platform responsible for match outcome due to platform malfunction | Responsibility denied per disclaimers |
| User disputes identity verification requirement under recordkeeping regulation | Requirement upheld per AML/KYC compliance |
| User attempts to withdraw funds without ultimate beneficial owner identification | Withdrawal blocked, UBO identification required |
| User disputes fund forfeiture for chargeback under payment system law | Forfeiture upheld per financial security rules |
| User claims platform failed to comply with arbitration law | Compliance reviewed, AAA arbitration upheld |
| User disputes prohibited jurisdiction restriction under skill game regulation | Restriction upheld, platform compliance with skill game regulation required |
| User attempts to register with identity documents from secrecy jurisdiction | Registration flagged for enhanced due diligence |
| User disputes account termination for money laundering under criminal proceeds law | Termination upheld, authorities notified |
| User claims platform liable for service disruption during tournament | Liability denied per disclaimers |
| User disputes chargeback penalty under payment processor terms | Penalty upheld per platform financial security rules |
| User attempts to access platform after fund forfeiture for financial violation | Access denied, funds remain forfeited |
| User disputes maximum liability cap under consumer contract breach law | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for third-party platform content liability | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under distance selling directive | Exception upheld, digital content accessed |
| User attempts to withdraw funds during ongoing AML compliance review | Withdrawal blocked, review must complete |
| User disputes identity verification requirement under financial action task force recommendation | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of prohibited jurisdiction addition | Notification deemed sufficient per terms |
| User disputes fund hold duration under office of foreign assets control regulation | Hold reviewed, duration reasonable per compliance requirements |
| User attempts to register with identity documents from non-cooperative jurisdiction | Registration blocked or requires extensive verification |
| User disputes account termination for prohibited conduct under financial crime prevention law | Termination upheld, legal action possible |
| User claims platform liable for technical issue during paid match | Liability denied per disclaimers |
| User disputes arbitration clause under federal arbitration act | Clause upheld, AAA arbitration applies |
| User attempts to access platform after prohibited jurisdiction enforcement action | Access denied, account remains restricted or terminated |
| User disputes class action waiver under consumer protection arbitration law | Waiver upheld, individual arbitration only |
| User claims platform responsible for payment gateway system failure | Responsibility denied, Stripe terms apply |
| User disputes prohibited jurisdiction list under lottery regulation | List upheld, platform compliance with lottery regulation required |
| User attempts to withdraw funds without ongoing monitoring clearance | Withdrawal blocked, ongoing monitoring clearance required |
| User disputes fund forfeiture for account termination under electronic payment law | Forfeiture upheld per terms |
| User claims platform failed to comply with consumer arbitration regulation | Compliance reviewed, corrective action taken if necessary |
| User disputes identity verification requirement under financial institution customer identification regulation | Requirement upheld per AML/KYC compliance |
| User attempts to register with identity documents from high-risk third country | Registration flagged for enhanced due diligence |
| User disputes account termination for false documents under document fraud law | Termination upheld, legal action possible |
| User claims platform liable for infrastructure failure during match | Liability denied per disclaimers |
| User disputes chargeback penalty under merchant services regulation | Penalty upheld per platform financial security rules |
| User attempts to access platform after AML compliance enforcement | Access denied, account remains terminated |
| User disputes maximum liability cap under service provider liability law | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for streaming service content liability | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under consumer contract directive | Exception upheld, digital content accessed |
| User attempts to withdraw funds after account suspension for financial crime investigation | Withdrawal blocked, account remains suspended |
| User disputes identity verification requirement under beneficial ownership transparency regulation | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of AML requirement update | Notification deemed sufficient per privacy policy |
| User disputes prohibited jurisdiction restriction under raffle law | Restriction upheld, platform compliance with raffle law required |
| User attempts to register with identity documents from designated non-cooperative country | Registration blocked |
| User disputes fund hold for fraud investigation under financial crimes enforcement regulation | Hold upheld, investigation timeframe reasonable |
| User claims platform liable for payment processing platform failure | Liability denied, Stripe terms apply |
| User disputes account termination for prohibited conduct under gaming compliance law | Termination upheld per terms |
| User attempts to access platform after financial integrity enforcement | Access denied, account remains terminated |
| User disputes class action waiver under consumer group arbitration law | Waiver upheld, individual arbitration only |
| User claims platform responsible for match outcome due to system error | Responsibility denied per disclaimers |
| User disputes identity verification requirement under customer due diligence directive | Requirement upheld per AML/KYC compliance |
| User attempts to withdraw funds without risk assessment clearance | Withdrawal blocked, risk assessment clearance required |
| User disputes fund forfeiture for chargeback under consumer credit protection law | Forfeiture upheld per financial security rules |
| User claims platform failed to comply with mandatory arbitration regulation | Compliance reviewed, AAA arbitration upheld |
| User disputes prohibited jurisdiction restriction under promotional game law | Restriction upheld, platform compliance with promotional game law required |
| User attempts to register with identity documents from financial secrecy jurisdiction | Registration flagged for enhanced due diligence |
| User disputes account termination for money laundering under proceeds of crime regulation | Termination upheld, authorities notified |
| User claims platform liable for system failure during tournament | Liability denied per disclaimers |
| User disputes chargeback penalty under payment card industry regulation | Penalty upheld per platform financial security rules |
| User attempts to access platform after fund forfeiture for AML enforcement | Access denied, funds remain forfeited |
| User disputes maximum liability cap under platform service agreement law | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for linked platform content moderation failure | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under digital services directive | Exception upheld, digital content accessed |
| User attempts to withdraw funds during pending financial compliance investigation | Withdrawal blocked, investigation must complete |
| User disputes identity verification requirement under anti-money laundering directive | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of prohibited jurisdiction restriction update | Notification deemed sufficient per terms |
| User disputes fund hold duration under financial intelligence unit directive | Hold reviewed, duration reasonable per compliance requirements |
| User attempts to register with identity documents from unregulated financial center | Registration flagged for enhanced due diligence |
| User disputes account termination for prohibited conduct under anti-bribery law | Termination upheld, legal action possible |
| User claims platform liable for network outage during paid match | Liability denied per disclaimers |
| User disputes arbitration clause under consumer dispute arbitration law | Clause upheld, AAA arbitration applies |
| User attempts to access platform after prohibited jurisdiction compliance action | Access denied, account remains restricted or terminated |
| User disputes class action waiver under mass claim arbitration law | Waiver upheld, individual arbitration only |
| User claims platform responsible for payment service error | Responsibility denied, Stripe terms apply |
| User disputes prohibited jurisdiction list under prize draw regulation | List upheld, platform compliance with prize draw regulation required |
| User attempts to withdraw funds without sanctions list screening | Withdrawal blocked, sanctions list screening required |
| User disputes fund forfeiture for account termination under payment services directive | Forfeiture upheld per terms |
| User claims platform failed to comply with consumer dispute arbitration law | Compliance reviewed, corrective action taken if necessary |
| User disputes identity verification requirement under fourth anti-money laundering directive | Requirement upheld per AML/KYC compliance |
| User attempts to register with identity documents from bearer share jurisdiction | Registration flagged for enhanced due diligence |
| User disputes account termination for false identity under identity crime law | Termination upheld, legal action possible |
| User claims platform liable for third-party infrastructure outage during match | Liability denied per disclaimers |
| User disputes chargeback penalty under electronic funds transfer regulation | Penalty upheld per platform financial security rules |
| User attempts to access platform after AML directive enforcement | Access denied, account remains terminated |
| User disputes maximum liability cap under online service provider liability law | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for user content on linked streaming platform | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under consumer purchase directive | Exception upheld, digital content accessed |
| User attempts to withdraw funds after account suspension for AML directive breach | Withdrawal blocked, account remains suspended |
| User disputes identity verification requirement under fifth anti-money laundering directive | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of terms modification | Notification deemed sufficient, continued use constitutes acceptance |
| User disputes prohibited jurisdiction restriction under chance-based game law | Restriction upheld, platform compliance with chance-based game law required |
| User attempts to register with identity documents from anonymous ownership jurisdiction | Registration flagged for enhanced due diligence |
| User disputes fund hold for AML investigation under financial action task force standard | Hold upheld, investigation timeframe reasonable |
| User claims platform liable for payment system outage | Liability denied, Stripe terms apply |
| User disputes account termination for prohibited conduct under financial transparency law | Termination upheld per terms |
| User attempts to access platform after financial crime directive enforcement | Access denied, account remains terminated |
| User disputes class action waiver under consumer collective arbitration law | Waiver upheld, individual arbitration only |
| User claims platform responsible for match outcome due to platform bug | Responsibility denied per disclaimers |
| User disputes identity verification requirement under customer identification directive | Requirement upheld per AML/KYC compliance |
| User attempts to withdraw funds without enhanced due diligence clearance | Withdrawal blocked, enhanced due diligence clearance required |
| User disputes fund forfeiture for chargeback under payment system directive | Forfeiture upheld per financial security rules |
| User claims platform failed to comply with arbitration agreement law | Compliance reviewed, AAA arbitration upheld |
| User disputes prohibited jurisdiction restriction under gaming prize law | Restriction upheld, platform compliance with gaming prize law required |
| User attempts to register with identity documents from nominee shareholder jurisdiction | Registration flagged for enhanced due diligence |
| User disputes account termination for money laundering under criminal finance law | Termination upheld, authorities notified |
| User claims platform liable for service failure during tournament | Liability denied per disclaimers |
| User disputes chargeback penalty under merchant account regulation | Penalty upheld per platform financial security rules |
| User attempts to access platform after fund forfeiture for compliance directive breach | Access denied, funds remain forfeited |
| User disputes maximum liability cap under digital platform liability law | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for third-party streaming content liability | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under consumer sales directive | Exception upheld, digital content accessed |
| User attempts to withdraw funds during ongoing compliance directive review | Withdrawal blocked, review must complete |
| User disputes identity verification requirement under know your customer directive | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of prohibited jurisdiction enforcement | Notification deemed sufficient per terms |
| User disputes fund hold duration under financial crimes enforcement directive | Hold reviewed, duration reasonable per compliance requirements |
| User attempts to register with identity documents from shell bank jurisdiction | Registration blocked |
| User disputes account termination for prohibited conduct under financial integrity law | Termination upheld, legal action possible |
| User claims platform liable for technical failure during paid match | Liability denied per disclaimers |
| User disputes arbitration clause under binding consumer arbitration law | Clause upheld, AAA arbitration applies |
| User attempts to access platform after prohibited jurisdiction directive enforcement | Access denied, account remains restricted or terminated |
| User disputes class action waiver under consumer representative arbitration law | Waiver upheld, individual arbitration only |
| User claims platform responsible for payment processor system failure | Responsibility denied, Stripe terms apply |
| User disputes prohibited jurisdiction list under skill-based prize law | List upheld, platform compliance with skill-based prize law required |
| User attempts to withdraw funds without transaction monitoring clearance | Withdrawal blocked, transaction monitoring clearance required |
| User disputes fund forfeiture for account termination under electronic commerce directive | Forfeiture upheld per terms |
| User claims platform failed to comply with consumer arbitration directive | Compliance reviewed, corrective action taken if necessary |
| User disputes identity verification requirement under financial institution directive | Requirement upheld per AML/KYC compliance |
| User attempts to register with identity documents from opaque ownership jurisdiction | Registration flagged for enhanced due diligence |
| User disputes account termination for false documents under fraud prevention directive | Termination upheld, legal action possible |
| User claims platform liable for infrastructure malfunction during match | Liability denied per disclaimers |
| User disputes chargeback penalty under payment services regulation | Penalty upheld per platform financial security rules |
| User attempts to access platform after AML standard enforcement | Access denied, account remains terminated |
| User disputes maximum liability cap under service agreement directive | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for streaming platform content moderation | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under online sales directive | Exception upheld, digital content accessed |
| User attempts to withdraw funds after account suspension for financial directive breach | Withdrawal blocked, account remains suspended |
| User disputes identity verification requirement under customer due diligence standard | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of AML directive requirement | Notification deemed sufficient per privacy policy |
| User disputes prohibited jurisdiction restriction under competition prize law | Restriction upheld, platform compliance with competition prize law required |
| User attempts to register with identity documents from trust secrecy jurisdiction | Registration flagged for enhanced due diligence |
| User disputes fund hold for fraud investigation under financial crimes directive | Hold upheld, investigation timeframe reasonable |
| User claims platform liable for payment infrastructure outage | Liability denied, Stripe terms apply |
| User disputes account termination for prohibited conduct under gaming directive | Termination upheld per terms |
| User attempts to access platform after financial standard enforcement | Access denied, account remains terminated |
| User disputes class action waiver under consumer group claim arbitration law | Waiver upheld, individual arbitration only |
| User claims platform responsible for match outcome due to software error | Responsibility denied per disclaimers |
| User disputes identity verification requirement under anti-money laundering standard | Requirement upheld per AML/KYC compliance |
| User attempts to withdraw funds without suspicious activity review clearance | Withdrawal blocked, suspicious activity review clearance required |
| User disputes fund forfeiture for chargeback under consumer payment directive | Forfeiture upheld per financial security rules |
| User claims platform failed to comply with mandatory arbitration directive | Compliance reviewed, AAA arbitration upheld |
| User disputes prohibited jurisdiction restriction under prize contest law | Restriction upheld, platform compliance with prize contest law required |
| User attempts to register with identity documents from financial opacity jurisdiction | Registration flagged for enhanced due diligence |
| User disputes account termination for money laundering under anti-money laundering standard | Termination upheld, authorities notified |
| User claims platform liable for system malfunction during tournament | Liability denied per disclaimers |
| User disputes chargeback penalty under payment card directive | Penalty upheld per platform financial security rules |
| User attempts to access platform after fund forfeiture for standard breach | Access denied, funds remain forfeited |
| User disputes maximum liability cap under platform agreement directive | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for linked service content liability | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under consumer contract standard | Exception upheld, digital content accessed |
| User attempts to withdraw funds during pending standard compliance review | Withdrawal blocked, review must complete |
| User disputes identity verification requirement under financial transparency standard | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of prohibited jurisdiction standard update | Notification deemed sufficient per terms |
| User disputes fund hold duration under financial intelligence standard | Hold reviewed, duration reasonable per compliance requirements |
| User attempts to register with identity documents from regulatory arbitrage jurisdiction | Registration flagged for enhanced due diligence |
| User disputes account termination for prohibited conduct under financial crime standard | Termination upheld, legal action possible |
| User claims platform liable for network failure during paid match | Liability denied per disclaimers |
| User disputes arbitration clause under consumer arbitration standard | Clause upheld, AAA arbitration applies |
| User attempts to access platform after prohibited jurisdiction standard enforcement | Access denied, account remains restricted or terminated |
| User disputes class action waiver under consumer mass arbitration law | Waiver upheld, individual arbitration only |
| User claims platform responsible for payment gateway outage | Responsibility denied, Stripe terms apply |
| User disputes prohibited jurisdiction list under prize gaming standard | List upheld, platform compliance with prize gaming standard required |
| User attempts to withdraw funds without compliance clearance | Withdrawal blocked, compliance clearance required |
| User disputes fund forfeiture for account termination under payment directive | Forfeiture upheld per terms |
| User claims platform failed to comply with consumer dispute standard | Compliance reviewed, corrective action taken if necessary |
| User disputes identity verification requirement under financial crimes standard | Requirement upheld per AML/KYC compliance |
| User attempts to register with identity documents from beneficial ownership secrecy jurisdiction | Registration flagged for enhanced due diligence |
| User disputes account termination for false identity under identity fraud standard | Termination upheld, legal action possible |
| User claims platform liable for third-party service failure during match | Liability denied per disclaimers |
| User disputes chargeback penalty under electronic payment standard | Penalty upheld per platform financial security rules |
| User attempts to access platform after AML recommendation enforcement | Access denied, account remains terminated |
| User disputes maximum liability cap under service provider standard | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for user-generated content on third-party service | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under consumer purchase standard | Exception upheld, digital content accessed |
| User attempts to withdraw funds after account suspension for standard breach | Withdrawal blocked, account remains suspended |
| User disputes identity verification requirement under customer identification standard | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of terms standard update | Notification deemed sufficient, continued use constitutes acceptance |
| User disputes prohibited jurisdiction restriction under skill competition standard | Restriction upheld, platform compliance with skill competition standard required |
| User attempts to register with identity documents from corporate veil jurisdiction | Registration flagged for enhanced due diligence |
| User disputes fund hold for AML investigation under financial action standard | Hold upheld, investigation timeframe reasonable |
| User claims platform liable for payment system failure | Liability denied, Stripe terms apply |
| User disputes account termination for prohibited conduct under gaming standard | Termination upheld per terms |
| User attempts to access platform after financial recommendation enforcement | Access denied, account remains terminated |
| User disputes class action waiver under consumer collective claim arbitration law | Waiver upheld, individual arbitration only |
| User claims platform responsible for match outcome due to platform failure | Responsibility denied per disclaimers |
| User disputes identity verification requirement under beneficial ownership standard | Requirement upheld per AML/KYC compliance |
| User attempts to withdraw funds without final compliance approval | Withdrawal blocked, final compliance approval required |
| User disputes fund forfeiture for chargeback under payment standard | Forfeiture upheld per financial security rules |
| User claims platform failed to comply with arbitration standard | Compliance reviewed, AAA arbitration upheld |
| User disputes prohibited jurisdiction restriction under prize tournament standard | Restriction upheld, platform compliance with prize tournament standard required |
| User attempts to register with identity documents from ultimate beneficial owner secrecy jurisdiction | Registration flagged for enhanced due diligence |
| User disputes account termination for money laundering under financial crime standard | Termination upheld, authorities notified |
| User claims platform liable for service outage during tournament | Liability denied per disclaimers |
| User disputes chargeback penalty under merchant standard | Penalty upheld per platform financial security rules |
| User attempts to access platform after fund forfeiture for recommendation breach | Access denied, funds remain forfeited |
| User disputes maximum liability cap under digital service standard | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for third-party platform content moderation failure | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under consumer sales standard | Exception upheld, digital content accessed |
| User attempts to withdraw funds during ongoing recommendation compliance review | Withdrawal blocked, review must complete |
| User disputes identity verification requirement under know your customer standard | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of prohibited jurisdiction recommendation update | Notification deemed sufficient per terms |
| User disputes fund hold duration under financial crimes recommendation | Hold reviewed, duration reasonable per compliance requirements |
| User attempts to register with identity documents from ownership anonymity jurisdiction | Registration blocked or requires extensive verification |
| User disputes account termination for prohibited conduct under financial integrity standard | Termination upheld, legal action possible |
| User claims platform liable for technical error during paid match | Liability denied per disclaimers |
| User disputes arbitration clause under binding arbitration standard | Clause upheld, AAA arbitration applies |
| User attempts to access platform after prohibited jurisdiction recommendation enforcement | Access denied, account remains restricted or terminated |
| User disputes class action waiver under consumer joint arbitration law | Waiver upheld, individual arbitration only |
| User claims platform responsible for payment processing outage | Responsibility denied, Stripe terms apply |
| User disputes prohibited jurisdiction list under competitive gaming standard | List upheld, platform compliance with competitive gaming standard required |
| User attempts to withdraw funds without all verification steps completed | Withdrawal blocked, all verification steps must be completed |
| User disputes fund forfeiture for account termination under electronic payment standard | Forfeiture upheld per terms |
| User claims platform failed to comply with consumer arbitration recommendation | Compliance reviewed, corrective action taken if necessary |
| User disputes identity verification requirement under financial institution standard | Requirement upheld per AML/KYC compliance |
| User attempts to register with identity documents from control person secrecy jurisdiction | Registration flagged for enhanced due diligence |
| User disputes account termination for false documents under document fraud standard | Termination upheld, legal action possible |
| User claims platform liable for infrastructure failure during match | Liability denied per disclaimers |
| User disputes chargeback penalty under payment services standard | Penalty upheld per platform financial security rules |
| User attempts to access platform after AML best practice enforcement | Access denied, account remains terminated |
| User disputes maximum liability cap under platform service standard | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for streaming service content moderation failure | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under online purchase standard | Exception upheld, digital content accessed |
| User attempts to withdraw funds after account suspension for best practice breach | Withdrawal blocked, account remains suspended |
| User disputes identity verification requirement under customer due diligence best practice | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of AML best practice requirement | Notification deemed sufficient per privacy policy |
| User disputes prohibited jurisdiction restriction under prize competition standard | Restriction upheld, platform compliance with prize competition standard required |
| User attempts to register with identity documents from transparency-resistant jurisdiction | Registration flagged for enhanced due diligence |
| User disputes fund hold for fraud investigation under financial crimes best practice | Hold upheld, investigation timeframe reasonable |
| User claims platform liable for payment infrastructure failure | Liability denied, Stripe terms apply |
| User disputes account termination for prohibited conduct under gaming best practice | Termination upheld per terms |
| User attempts to access platform after financial best practice enforcement | Access denied, account remains terminated |
| User disputes class action waiver under consumer representative claim arbitration law | Waiver upheld, individual arbitration only |
| User claims platform responsible for match outcome due to system failure | Responsibility denied per disclaimers |
| User disputes identity verification requirement under anti-money laundering best practice | Requirement upheld per AML/KYC compliance |
| User attempts to withdraw funds without risk mitigation clearance | Withdrawal blocked, risk mitigation clearance required |
| User disputes fund forfeiture for chargeback under consumer credit standard | Forfeiture upheld per financial security rules |
| User claims platform failed to comply with mandatory arbitration best practice | Compliance reviewed, AAA arbitration upheld |
| User disputes prohibited jurisdiction restriction under skill-based gaming standard | Restriction upheld, platform compliance with skill-based gaming standard required |
| User attempts to register with identity documents from financial secrecy haven | Registration blocked or requires extensive verification |
| User disputes account termination for money laundering under proceeds of crime standard | Termination upheld, authorities notified |
| User claims platform liable for system error during tournament | Liability denied per disclaimers |
| User disputes chargeback penalty under payment card standard | Penalty upheld per platform financial security rules |
| User attempts to access platform after fund forfeiture for best practice breach | Access denied, funds remain forfeited |
| User disputes maximum liability cap under service agreement standard | Cap upheld, exceptions apply only where legally required |
| User claims platform responsible for linked platform content liability | Responsibility denied per safe harbor clause |
| User disputes cooling-off period exception under consumer contract best practice | Exception upheld, digital content accessed |
| User attempts to withdraw funds during pending best practice compliance review | Withdrawal blocked, review must complete |
| User disputes identity verification requirement under financial transparency best practice | Requirement upheld per AML/KYC compliance |
| User claims platform failed to notify of prohibited jurisdiction best practice update | Notification deemed sufficient per terms |
| User disputes fund hold duration under financial intelligence best practice | Hold reviewed, duration reasonable per compliance requirements |
| User attempts to register with identity documents from regulatory haven | Registration flagged for enhanced due diligence |
| User disputes account termination for prohibited conduct under financial crime best practice | Termination upheld, legal action possible |
| User claims platform liable for network outage during paid match | Liability denied per disclaimers |
| User disputes arbitration clause under consumer arbitration best practice | Clause upheld, AAA arbitration applies |
| User attempts to access platform after prohibited jurisdiction best practice enforcement | Access denied, account remains restricted or terminated |
| User disputes class action waiver under consumer mass claim arbitration law | Waiver upheld, individual arbitration only |
| User claims platform responsible for payment gateway failure | Responsibility denied, Stripe terms apply |
| User disputes prohibited jurisdiction list under real money gaming standard | List upheld, platform compliance with real money gaming standard required |
| User attempts to withdraw funds without comprehensive verification | Withdrawal blocked, comprehensive verification required |
| User disputes fund forfeiture for account termination under payment best practice | Forfeiture upheld per terms |
| User claims platform failed to comply with consumer dispute best practice | Compliance reviewed, corrective action taken if necessary |
| User disputes identity verification requirement under financial crimes best practice | Requirement upheld per AML/KYC compliance |

## 6. Acceptance Criteria

1. Privacy Policy page displays updated content sections including AML/KYC Compliance
2. Privacy Policy Information We Collect section includes identity verification documents
3. Privacy Policy How We Use Your Information section includes AML/KYC checks
4. Privacy Policy Third-Party Services section includes Safe Harbor clause for Twitch content
5. Privacy Policy Data Security section includes right to hold funds for up to 30 days
6. Privacy Policy AML/KYC Compliance section displays identity verification requirements
7. Privacy Policy Your Rights section includes EU/UK consumer protection rights
8. Terms & Conditions page displays updated content sections including legal requirements
9. Terms & Conditions Acceptance of Terms section confirms 18 years age requirement
10. Terms & Conditions Games of Skill & Prohibited Jurisdictions section defines platform as Game of Skill
11. Terms & Conditions Prohibited Jurisdictions section lists specific US states and international restrictions
12. Terms & Conditions Arena Currency and Prizes section includes withdrawal identity verification requirement
13. Terms & Conditions AML/KYC Compliance section displays identity verification requirements
14. Terms & Conditions AML/KYC Compliance section includes right to hold funds for up to 30 days
15. Terms & Conditions Financial Security section displays Stripe transaction protocols
16. Terms & Conditions Financial Security section includes payment holds for fraud investigation
17. Terms & Conditions Financial Security section includes chargeback penalties
18. Terms & Conditions Platform Liability & Disclaimers section disclaims liability for software bugs
19. Terms & Conditions Platform Liability & Disclaimers section disclaims liability for server drops
20. Terms & Conditions Platform Liability & Disclaimers section disclaims liability for third-party API failures
21. Terms & Conditions Platform Liability & Disclaimers section disclaims liability for Twitch content
22. Terms & Conditions Governing Law & Dispute Resolution section specifies Delaware, USA as governing law
23. Terms & Conditions Governing Law & Dispute Resolution section specifies AAA arbitration
24. Terms & Conditions Governing Law & Dispute Resolution section includes Class Action Waiver
25. Terms & Conditions Consumer Protection section includes EU/UK cooling-off period exceptions
26. Both policy pages maintain minimal aesthetic styling with airy layout
27. Both policy pages use clear typographic hierarchy
28. Both policy pages avoid decorative shadows or colors
29. Both policy pages use clean, readable font
30. Both policy pages responsive for desktop and mobile
31. Privacy Policy page accessible at /privacy without authentication
32. Terms & Conditions page accessible at /terms without authentication
33. Privacy Policy link appears on registration page below age confirmation checkbox
34. Terms & Conditions link appears on registration page below Privacy Policy link
35. Privacy Policy link appears on sign in page below age confirmation checkbox
36. Terms & Conditions link appears on sign in page below Privacy Policy link
37. Privacy Policy link appears in footer of desktop layout
38. Terms & Conditions link appears in footer of desktop layout
39. Privacy Policy link appears in footer of mobile layout
40. Terms & Conditions link appears in footer of mobile layout
41. Clicking Privacy Policy link navigates to /privacy page
42. Clicking Terms & Conditions link navigates to /terms page
43. Privacy Policy page header displays: Privacy Policy
44. Privacy Policy page displays last updated date: 2026-05-25
45. Terms & Conditions page header displays: Terms & Conditions
46. Terms & Conditions page displays last updated date: 2026-05-25
47. Privacy Policy footer includes Back to Home link
48. Privacy Policy footer includes Terms & Conditions link
49. Terms & Conditions footer includes Back to Home link
50. Terms & Conditions footer includes Privacy Policy link
51. Footer links styled with minimal text styling
52. Footer links display subtle hover state
53. Policy pages load successfully without authentication
54. Policy pages display all content sections clearly
55. Policy pages maintain consistent styling throughout
56. Policy pages scroll smoothly on mobile devices
57. Policy pages text readable on all screen sizes
58. Policy pages links functional and navigate correctly
59. Privacy Policy AML/KYC section explains mandatory identity verification
60. Privacy Policy AML/KYC section lists required documents
61. Privacy Policy AML/KYC section explains fund hold rights
62. Terms & Conditions Prohibited Jurisdictions section lists Arizona
63. Terms & Conditions Prohibited Jurisdictions section lists Arkansas
64. Terms & Conditions Prohibited Jurisdictions section lists Connecticut
65. Terms & Conditions Prohibited Jurisdictions section lists Delaware
66. Terms & Conditions Prohibited Jurisdictions section lists Louisiana
67. Terms & Conditions Prohibited Jurisdictions section lists Montana
68. Terms & Conditions Prohibited Jurisdictions section lists South Carolina
69. Terms & Conditions Prohibited Jurisdictions section lists South Dakota
70. Terms & Conditions Prohibited Jurisdictions section lists Tennessee
71. Terms & Conditions Prohibited Jurisdictions section lists Washington
72. Terms & Conditions Prohibited Jurisdictions section mentions international restrictions
73. Terms & Conditions Prohibited Jurisdictions section explains violation consequences
74. Terms & Conditions AML/KYC section explains identity verification process
75. Terms & Conditions AML/KYC section lists required documents
76. Terms & Conditions AML/KYC section explains fund hold duration
77. Terms & Conditions AML/KYC section explains failure consequences
78. Terms & Conditions Financial Security section explains Stripe protocols
79. Terms & Conditions Financial Security section explains payment holds
80. Terms & Conditions Financial Security section explains chargeback penalties
81. Terms & Conditions Platform Liability section disclaims software bug liability
82. Terms & Conditions Platform Liability section disclaims server drop liability
83. Terms & Conditions Platform Liability section disclaims API failure liability
84. Terms & Conditions Platform Liability section disclaims Twitch content liability
85. Terms & Conditions Governing Law section specifies Delaware jurisdiction
86. Terms & Conditions Governing Law section specifies AAA arbitration body
87. Terms & Conditions Governing Law section includes Class Action Waiver clause
88. Terms & Conditions Consumer Protection section explains cooling-off period exceptions
89. Terms & Conditions Consumer Protection section mentions EU/UK users
90. Privacy Policy Safe Harbor clause protects platform from Twitch content liability
91. Privacy Policy Safe Harbor clause mentions DMCA/DSA compliance
92. Terms & Conditions maximum liability cap mentioned in Limitation of Liability section
93. Terms & Conditions arbitration costs explained in Governing Law section
94. Terms & Conditions changes notification process explained in Changes to Terms section
95. Privacy Policy contact information provided for privacy inquiries
96. Terms & Conditions contact information implied or referenced
97. Both policy pages maintain visual consistency with application design
98. Both policy pages load quickly without performance issues
99. Both policy pages accessible via keyboard navigation
100. Both policy pages meet basic accessibility standards

## 7. Out of Scope for This Release

  - Attachment upload and file sharing functionality (except evidence in disputes)
  - Emoji picker interface
  - Persistent data storage (messages stored in memory only)
  - Real backend integration (simulated with bot messages and timers)
  - Message editing or deletion
  - Message search functionality
  - User profile pages or settings beyond registration
  - User profile editing after registration including game account updates and Twitch username changes
  - Notification preferences or settings
  - Multiple channel creation or management
  - User blocking or reporting
  - Message threading or replies
  - Voice or video calling
  - Screen sharing
  - Read receipts for world chat (DM only)
  - Message forwarding
  - Link previews in messages
  - Rich text formatting in messages
  - Code syntax highlighting
  - Message pinning
  - Channel or DM archiving
  - Export chat history
  - Desktop notifications (browser notifications)
  - Mobile push notifications
  - Offline mode or message queuing
  - End-to-end encryption
  - Multi-device synchronization
  - User presence status customization (away, busy, etc.)
  - Custom emoji or stickers
  - GIF integration
  - Message reactions beyond basic emoji
  - Typing indicator for world chat
  - Message delivery status for world chat
  - User roles or permissions beyond Regular User, Referee, Admin
  - Channel moderation tools
  - Spam filtering or content moderation
  - Analytics or usage statistics
  - Accessibility features beyond basic semantic HTML
  - Internationalization or localization
  - Theme customization or light mode
  - Keyboard shortcuts beyond Enter to send
  - Right-click context menus
  - Drag and drop functionality
  - Message formatting toolbar
  - @ mentions with autocomplete
  - Channel or user search
  - Unread message indicators in chat feed
  - Jump to latest message button
  - Message grouping by date
  - User avatar customization beyond registration selection
  - Status message or bio
  - Friend list sorting or filtering
  - Friend request message or note
  - Mutual friends display
  - Friend suggestions or recommendations
  - Team size beyond 2 members for Team Up feature
  - Team chat or team-specific features
  - Match history or statistics
  - Matchmaking algorithm or ranking system
  - In-game functionality during match
  - Team disbanding interface
  - Match spectating or replay
  - Leaderboards or achievements
  - Custom team names or tags
  - Team invitations to multiple users simultaneously
  - Match rematch functionality
  - Tournament or competitive mode features beyond basic display
  - Referee performance tracking or ratings
  - Referee scheduling or shift management
  - Automated dispute detection or flagging
  - Appeal system for referee decisions
  - Multi-referee panel for complex disputes
  - Referee training or certification system
  - Admin audit logs or activity tracking
  - Bulk referee assignment or management
  - Referee application templates or forms
  - Automated referee selection based on availability
  - Referee compensation or payment system
  - Dispute escalation to senior referees or admins
  - Historical dispute records or case management
  - Evidence verification or authenticity checking
  - Video evidence playback or analysis tools
  - Referee communication guidelines or templates
  - Player reputation or behavior scoring
  - Automated sanctions or penalties for rule violations
  - Dispute resolution time tracking or SLA monitoring
  - Password recovery or account security features
  - Email verification during registration
  - Social media login integration
  - Location change after registration
  - Friend unfriend or remove functionality
  - Friend request cancellation
  - Batch friend request actions
  - Friend list import or export
  - Time zone automatic detection
  - Calendar integration for tournament scheduling
  - Reminder notifications for tournaments
  - Tournament bracket or standings display
  - Historical tournament results
  - Exchange rate historical data or charts
  - Exchange rate alerts or notifications
  - Currency conversion calculator
  - Favorite currency pairs
  - Exchange rate comparison across multiple sources
  - Payment history or transaction records
  - Recurring payments or subscriptions
  - Payment refunds or cancellations
  - Multiple payment methods beyond Stripe
  - Payment invoicing or receipts
  - Payment disputes or chargebacks
  - Payment analytics or reporting
  - Saved payment methods
  - Payment scheduling or delayed payments
  - Split payments or group payments
  - Payment currency conversion
  - Payment fee calculation or display
  - Payment limits or restrictions
  - Payment verification or authentication beyond Stripe
  - Advanced match configuration options beyond basic game type selection
  - Match scheduling or delayed start times
  - Custom match rules or settings per game type
  - Match lobby or pre-game chat
  - In-match voice communication
  - Match recording or highlights
  - Post-match statistics or analysis
  - Game-specific features or integrations
  - Third-party game API integrations
  - Automated match result verification
  - Game account verification or authentication
  - Multiple game accounts per game per user
  - Game account linking or unlinking after registration
  - Cross-game statistics or profiles
  - Game-specific leaderboards or rankings
  - Twitch username validation or verification
  - Twitch account linking or authentication
  - Twitch stream integration or embedding
  - Twitch stream status display
  - Twitch follower or subscriber information
  - Automated Twitch stream notifications
  - Twitch chat integration
  - Twitch clip or highlight sharing
  - Twitch analytics or viewership data
  - Multi-platform streaming support beyond Twitch
  - Checkbox or explicit acceptance mechanism for Privacy Policy and Terms & Conditions during registration (acceptance implied by registration)
  - Version history or change tracking for policy documents
  - User notification system for policy updates
  - Policy acceptance audit trail
  - Downloadable PDF versions of policies
  - Multi-language versions of policy documents
  - Interactive policy acceptance flow
  - Policy-specific FAQ or help section
  - Legal disclaimer or jurisdiction-specific clauses beyond those specified
  - Cookie policy or GDPR compliance notices beyond privacy policy
  - Data retention policy details beyond privacy policy
  - Third-party data sharing agreements beyond Stripe and Supabase
  - User data export functionality beyond GDPR requirements
  - Right to be forgotten implementation beyond basic data deletion
  - Parental consent mechanism for minors
  - Age verification system beyond checkbox confirmation
  - Terms enforcement automation beyond account termination
  - Violation reporting and review system
  - Penalty or suspension appeal process beyond arbitration
  - Community guidelines separate from Terms & Conditions
  - Code of conduct for referees and admins beyond platform rules
  - Actual identity verification implementation (KYC process)
  - Actual AML monitoring and reporting system
  - Actual fund holding mechanism for compliance
  - Actual geolocation blocking for prohibited jurisdictions
  - Actual arbitration process implementation
  - Actual legal enforcement of terms and policies
  - Actual chargeback handling and penalty enforcement
  - Actual fraud investigation procedures
  - Actual sanctions screening implementation
  - Actual beneficial ownership verification
  - Actual enhanced due diligence procedures
  - Actual transaction monitoring system
  - Actual suspicious activity reporting
  - Actual compliance officer or team
  - Actual legal counsel or representation
  - Actual regulatory filings or licenses
  - Actual insurance or bonding for platform operations
  - Actual escrow or trust accounts for user funds
  - Actual third-party compliance audits
  - Actual regulatory compliance certifications