"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Mic } from "lucide-react"
import { motion } from "framer-motion"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

const privacyText = `Effective Date: 2025-01-01
1. Introduction
You're Hired! (the "App") is a job application management platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the App.
2. Business Information
The App is operated by Machine King. For questions about this policy or our data practices, contact the maintainers via the project's repository.
3. Types of Data Collected
We collect the following categories of personal information:
Account Information: Email address, password, and optional name when you create an account.
Profile Data: Information stored in your user profile, including dark mode preferences and master resume text.
Job Application Data: Company name, position title, status, notes, contact details, salary information, tags, and related event records.
Resume Versions: Content of resumes you upload or generate through the App.
Voice Usage Metrics: Minutes of voice features used during mock interviews or coaching sessions.
Analytics Data: Interaction events such as page views, button clicks, and feature usage, captured for analytics purposes.
Device Data: IP address, browser type, and operating system collected automatically through analytics and server logs.
Local Storage Data: Cached application state and preferences stored in your browser for offline access.
4. How Data Is Collected
Data is collected when you:
Register for an account or sign in using email/password or Google OAuth.
Enter information into forms related to job applications, events, or profile settings.
Upload documents or images.
Interact with the App, triggering analytics events.
Use voice features or AI-powered tools, which send text prompts and audio data to third-party services.
Access the App while cookies or local storage are enabled in your browser.
5. Purpose of Data Collection
We collect and process your information to:
Provide authentication and maintain your user session.
Store and manage job applications, resumes, notes, and related events.
Personalize your experience and save preferences.
Generate tailored resumes, interview coaching, and AI images or avatars.
Track voice feature usage and ensure fair subscription limits.
Monitor application performance and improve functionality through analytics.
Communicate with you about updates, features, and system notifications.
6. How Data Is Used
Collected data is used to operate the App, deliver services you request, maintain security, troubleshoot issues, and analyze aggregate usage patterns. Personal information may also be used to send service-related emails, respond to inquiries, or enforce our Terms of Service.
7. Third-Party Sharing
We share data with the following categories of service providers when necessary to operate the App:
Supabase: Database storage, authentication, and file hosting.
PostHog: Analytics platform to track feature usage and user interactions.
OpenAI: Processes text for resume improvements, career coaching, and chat features.
Replicate: Generates images such as AI avatars or workspace backgrounds.
ElevenLabs: Provides voice agents and text-to-speech services.
Google OAuth: Option for users to authenticate using their Google account.
These providers process data on our behalf and are bound by contractual obligations to safeguard your information. We do not sell personal data to third parties.
8. Data Transfers
Your information may be transferred to and processed in countries other than where you reside. When transferring data internationally, we rely on standard contractual clauses or similar safeguards to protect your information.
9. Data Retention
We retain personal information for as long as your account remains active or as needed to provide the App. Voice usage records, resume versions, and application data persist until you delete them or close your account. Local storage data remains in your browser until cleared. Logs and analytics data are stored for a reasonable period to analyze trends and maintain security.
10. User Rights
Depending on your location, you may have rights to access, correct, delete, or restrict processing of your personal information. You can manage much of your data directly within the App. To exercise additional rights, contact us using the information in Section 2.
11. Consent and Opt-Out Options
You can withdraw consent for optional communications or analytics by adjusting your profile settings or contacting us. You may disable cookies or local storage in your browser, although this may affect functionality. You can opt out of marketing emails through the unsubscribe link in those messages.
12. Data Security
We implement technical and organizational measures to protect your information, including encrypted connections, access controls, and regular monitoring. Despite these efforts, no system is completely secure, and we cannot guarantee absolute security of your data.
13. Cookies and Tracking Technologies
The App uses cookies and local storage to maintain sessions and remember preferences. Analytics services may set their own cookies to collect usage statistics. See our [Cookie Policy](./COOKIE_POLICY.md) for details. You can control cookie preferences through your browser settings.
14. Automated Decision-Making
We use automated systems to tailor resumes, generate interview responses, and create images or avatars. These processes rely on third-party AI providers. They do not make decisions that have legal or similarly significant effects on users.
15. Complaint Procedures
If you have concerns about our data practices, contact us using the information above. You may also lodge a complaint with your local data protection authority if you believe your rights have been violated.
16. Policy Updates
We may update this Privacy Policy from time to time. When we make changes, we will revise the "Effective Date" at the top of the policy and may notify you through the App or via email.
17. Child Privacy
The App is not intended for children under 13. We do not knowingly collect personal information from children. If you believe we have inadvertently gathered such information, please contact us so we can delete it.
--
By using You're Hired!, you agree to the collection and use of information as described in this Privacy Policy.`

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </motion.h1>
          <motion.div variants={fadeInUp} className="space-y-4 leading-relaxed">
            {privacyText.split("\n").map((line, idx) => (
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
