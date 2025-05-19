"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Mic } from "lucide-react"
import { motion } from "framer-motion"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

const termsText = `Effective Date: 2025-01-01
1. Introduction
Welcome to You're Hired! (the "App"), a job application management platform operated by Machine King Labs,LLC ("we," "us," or "our"). These Terms of Service ("Terms") govern your access to and use of the App, including all features, services, and content provided therein. By accessing or using the App, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, please do not use the App.
2. Eligibility
To use the App, you must be at least 13 years old and have the legal capacity to enter into these Terms. If you are using the App on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
3. User Accounts
3.1 Account Creation
To access certain features, such as job application tracking or AI-powered resume tools, you must create an account using a valid email address and password or via Google OAuth. You agree to provide accurate and complete information during registration.
3.2 Account Security
You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Notify us immediately at [support@heyyourehired.com] if you suspect unauthorized access to your account. We reserve the right to suspend or terminate accounts involved in suspicious activity.
4. Subscriptions and Payments
4.1 Subscription Plans
Certain features, such as advanced AI coaching or unlimited voice usage, may require a paid subscription. Subscription terms, including pricing, billing cycles, and cancellation policies, will be clearly presented during the sign-up process.
4.2 Billing and Refunds
You authorize us to charge your chosen payment method for the subscription fees. All payments are non-refundable, except as required by law or explicitly stated in the subscription terms. If you cancel a subscription, you may continue to access paid features until the end of the current billing cycle.
4.3 Price Changes
We may adjust subscription prices at any time. We will notify you of price changes at least 30 days in advance, and continued use of the App after the change constitutes acceptance of the new pricing.
5. User Content
5.1 Ownership
You retain ownership of all content you upload, create, or generate in the App, including resumes, job application data, notes, and AI-generated outputs ("User Content").
5.2 License to Us
By using the App, you grant us a worldwide, non-exclusive, royalty-free, revocable license to use, store, display, and process your User Content solely to provide and improve the App’s services (e.g., to store your resume, generate tailored versions, or analyze usage patterns). This license terminates when you delete your User Content or account, except where retention is required for legal or operational purposes.
5.3 Responsibility
You are solely responsible for the accuracy, legality, and appropriateness of your User Content. Do not upload sensitive personal information (e.g., race, ethnicity, health, or biometric data) unless explicitly requested, as outlined in our Privacy Policy.
6. Third-Party Services
The App integrates with third-party services, including Supabase (database and authentication), PostHog (analytics), OpenAI (AI text processing), Replicate (AI image generation), ElevenLabs (voice services), and Google OAuth (authentication). Your use of these services is subject to their respective terms and privacy policies, which are linked in our Privacy Policy. We are not responsible for the practices, performance, or availability of these third-party services.
7. Acceptable Use
You agree to use the App in compliance with these Terms and applicable laws. You will not:
Use the App for any unlawful, harmful, or fraudulent purpose.
Upload or share content that is defamatory, obscene, or infringes on others’ rights.
Attempt to reverse-engineer, hack, or disrupt the App’s functionality.
Use automated tools (e.g., bots or scrapers) to access or extract data from the App.
Impersonate another person or misrepresent your affiliation with any entity.
Violation of these rules may result in suspension or termination of your account.
8. Intellectual Property
8.1 Our Content
The App, including its design, code, branding, and AI-generated outputs (excluding User Content), is owned by Machine King or its licensors and is protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, or distribute our content without prior written consent.
8.2 Feedback
If you provide feedback, suggestions, or ideas about the App, you grant us a perpetual, royalty-free right to use and incorporate them without compensation or attribution.
9. Termination
9.1 By You
You may stop using the App and delete your account at any time through the App’s settings or by contacting us at [support@heyyourehired.com]. Account deletion will remove your data as outlined in our Privacy Policy.
9.2 By Us
We may suspend or terminate your access to the App at our discretion, with or without notice, if you violate these Terms, engage in harmful conduct, or for other legitimate business reasons (e.g., legal compliance or service discontinuation). Upon termination, your right to use the App ceases, but these Terms’ provisions on liability, intellectual property, and governing law will survive.
10. Disclaimers
The App is provided on an “as is” and “as available” basis without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not guarantee that the App will be uninterrupted, error-free, secure, or meet your expectations. AI-generated outputs (e.g., resumes or coaching responses) are provided for informational purposes and should be reviewed for accuracy before use.
11. Limitation of Liability
To the fullest extent permitted by law, Machine King, its affiliates, and their respective officers, directors, and employees will not be liable for any indirect, incidental, special, consequential, or punitive damages (including loss of data, profits, or opportunities) arising out of or related to your use of the App, even if advised of the possibility of such damages. Our total liability to you will not exceed the amount you paid us in the 12 months preceding the claim, or $100, whichever is greater.
12. Indemnification
You agree to indemnify and hold harmless Machine King and its affiliates from any claims, losses, or damages (including reasonable attorneys’ fees) arising from your use of the App, violation of these Terms, or infringement of any third-party rights (e.g., uploading content that violates copyright).
13. Governing Law and Dispute Resolution
13.1 Governing Law
These Terms are governed by the laws of the State of Delaware, USA, without regard to its conflict of law principles.
13.2 Dispute Resolution
Any disputes arising under these Terms will be resolved through binding arbitration in Delaware, conducted under the rules of the American Arbitration Association. You waive the right to participate in class actions or class-wide arbitration. Notwithstanding the foregoing, we may seek injunctive relief in any court of competent jurisdiction to protect our intellectual property or enforce these Terms.
14. Changes to Terms
We may update these Terms periodically to reflect changes in our services or legal requirements. Material changes will be communicated through the App or via email at least 30 days before they take effect. Your continued use of the App after the updated Terms’ effective date constitutes acceptance of the changes. If you do not agree, you must stop using the App.
15. Miscellaneous
15.1 Entire Agreement
These Terms, together with our Privacy Policy, constitute the entire agreement between you and Machine King regarding the App, superseding any prior agreements.
15.2 Severability
If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full effect.
15.3 Waiver
Our failure to enforce any right or provision of these Terms does not constitute a waiver of that right or provision.
15.4 Assignment
You may not assign these Terms or your rights under them without our prior written consent. We may assign these Terms or our rights at any time without notice.
16. Contact Us
For questions, concerns, or support regarding these Terms, contact us at [support@heyyourehired.com] or via the project’s repository.
--
By using You're Hired!, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.`

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="container mx-auto px-4 py-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Mic className="h-6 w-6 text-primary animate-pulse" />
            <Link href="/" className="text-2xl font-bold text-primary hover:scale-105 transition-transform">
              TalkAdvantage
            </Link>
          </div>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </motion.div>
      </header>
      <main className="container mx-auto px-4 py-20">
        <motion.div initial="initial" animate="animate" variants={{}} className="space-y-6">
          <motion.h1 variants={fadeInUp} className="text-4xl font-bold text-center">
            Terms of Service
          </motion.h1>
          <motion.div variants={fadeInUp} className="space-y-4 leading-relaxed">
            {termsText.split("\n").map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </motion.div>
          <div className="pt-8 text-center">
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
