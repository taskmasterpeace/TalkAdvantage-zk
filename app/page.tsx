"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Zap, Mic, FileText, BrainCircuit, BarChart3, Users, Check } from "lucide-react"
import { motion } from "framer-motion"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
}

const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="container mx-auto px-4 py-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Mic className="h-6 w-6 text-primary animate-pulse" />
            <span className="text-2xl font-bold text-primary hover:scale-105 transition-transform">TalkAdvantage</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">
              How It Works
            </Link>
            <Link href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
              Pricing
            </Link>
            <Link href="#faq" className="text-sm font-medium hover:text-primary transition-colors">
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline">Log In</Button>
            </Link>
            <Link href="#pricing">
              <Button>Get Started</Button>
            </Link>
          </div>
        </motion.div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <motion.div 
            initial="initial"
            animate="animate"
            variants={staggerChildren}
            className="flex flex-col md:flex-row items-center gap-12"
          >
            <motion.div 
              variants={fadeInUp}
              className="md:w-1/2 space-y-6"
            >
              <Badge variant="outline" className="px-3 py-1 text-sm hover:scale-105 transition-transform">
                AI-Powered Meeting Assistant
              </Badge>
              <motion.h1 
                variants={fadeInUp}
                className="text-4xl md:text-6xl font-bold leading-tight"
              >
                Transform Your Meetings with <span className="text-primary animate-text-gradient bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent bg-300% animate-gradient">AI Intelligence</span>
              </motion.h1>
              <p className="text-xl text-muted-foreground">
                TalkAdvantage captures, transcribes, and analyzes your conversations in real-time, turning meetings into
                actionable insights.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="#pricing">
                  <Button size="lg" className="w-full sm:w-auto">
                    Start Free Trial
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    See How It Works
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>No credit card required for free trial</span>
              </div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
              className="md:w-1/2"
            >
              <div className="relative hover:scale-105 transition-transform duration-500">
                <div className="absolute -top-6 -left-6 w-24 h-24 bg-primary/10 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-primary/10 rounded-full blur-xl animate-pulse"></div>
                <img
                  src="/ai-meeting-dashboard.png"
                  alt="TalkAdvantage Dashboard"
                  className="rounded-lg border shadow-xl w-full"
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Logos Section */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground mb-8">TRUSTED BY INNOVATIVE TEAMS AT</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            {["Acme Inc", "Globex", "Initech", "Umbrella", "Stark Industries", "Wayne Enterprises"].map((company) => (
              <div key={company} className="text-xl font-semibold text-muted-foreground">
                {company}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <Badge variant="outline" className="px-3 py-1 text-sm mb-4">
              Features
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need for Smarter Meetings</h2>
            <p className="text-xl text-muted-foreground">
              TalkAdvantage combines powerful AI with an intuitive interface to make your meetings more productive.
            </p>
          </motion.div>

          <motion.div 
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {[
              {
                icon: <Mic className="h-8 w-8 text-primary" />,
                title: "Real-time Transcription",
                description:
                  "Automatically convert speech to text with high accuracy, supporting multiple speakers and languages.",
              },
              {
                icon: <BrainCircuit className="h-8 w-8 text-primary" />,
                title: "AI Insights",
                description:
                  "Get intelligent summaries, action items, and key points extracted from your conversations.",
              },
              {
                icon: <FileText className="h-8 w-8 text-primary" />,
                title: "Smart Library",
                description:
                  "Organize and search through all your meeting recordings and transcripts with powerful filters.",
              },
              {
                icon: <BarChart3 className="h-8 w-8 text-primary" />,
                title: "Deep Analysis",
                description:
                  "Visualize conversation patterns, sentiment analysis, and topic detection across meetings.",
              },
              {
                icon: <Zap className="h-8 w-8 text-primary" />,
                title: "Curiosity Engine",
                description:
                  "AI-generated questions to explore insights and uncover hidden opportunities in your discussions.",
              },
              {
                icon: <Users className="h-8 w-8 text-primary" />,
                title: "Conversation Compass",
                description:
                  "Visual mapping of conversation flow with AI-powered guidance for better meeting facilitation.",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="p-6 hover:shadow-lg transition-all duration-300">
                  <div className="mb-4 transform transition-transform hover:scale-110">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="px-3 py-1 text-sm mb-4">
              How It Works
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple Process, Powerful Results</h2>
            <p className="text-xl text-muted-foreground">
              TalkAdvantage seamlessly integrates into your workflow in just a few steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "1",
                title: "Record",
                description:
                  "Start recording your meeting or import existing audio files. TalkAdvantage works with live conversations or pre-recorded content.",
                image: "/meeting-recording-setup.png",
              },
              {
                step: "2",
                title: "Analyze",
                description:
                  "Our AI processes the audio in real-time, transcribing speech and analyzing content for insights, topics, and action items.",
                image: "/audio-text-analysis.png",
              },
              {
                step: "3",
                title: "Act",
                description:
                  "Review the generated insights, share transcripts with your team, and turn conversations into actionable next steps.",
                image: "/collaborative-dashboard-review.png",
              },
            ].map((step, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mb-4">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground mb-6">{step.description}</p>
                <img src={step.image || "/placeholder.svg"} alt={step.title} className="rounded-lg shadow-md w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshot Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="px-3 py-1 text-sm mb-4">
              Product Tour
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">See TalkAdvantage in Action</h2>
            <p className="text-xl text-muted-foreground">
              Explore the intuitive interface and powerful features that make TalkAdvantage the ultimate meeting
              assistant.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <h3 className="text-2xl font-semibold mb-4">Recording Dashboard</h3>
              <p className="text-muted-foreground mb-6">
                Capture meetings with our intuitive recording interface. See live transcription as you speak and get
                real-time AI insights.
              </p>
              <ul className="space-y-3">
                {[
                  "One-click recording start/stop",
                  "Live transcription with speaker detection",
                  "Real-time AI insights and suggestions",
                  "Customizable analysis intervals",
                ].map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <img
              src="/ai-powered-recording-dashboard.png"
              alt="Recording Dashboard"
              className="rounded-lg border shadow-xl"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
            <img
              src="/placeholder.svg?height=500&width=700&query=Library view with meeting recordings and transcripts organized by date"
              alt="Library View"
              className="rounded-lg border shadow-xl order-2 md:order-1"
            />
            <div className="order-1 md:order-2">
              <h3 className="text-2xl font-semibold mb-4">Smart Library</h3>
              <p className="text-muted-foreground mb-6">
                Organize and access all your meeting recordings and transcripts in one place with powerful search and
                filtering.
              </p>
              <ul className="space-y-3">
                {[
                  "Calendar view for easy navigation",
                  "Full-text search across all transcripts",
                  "Filter by date, participants, or topics",
                  "Quick preview and playback",
                ].map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-semibold mb-4">Deep Analysis</h3>
              <p className="text-muted-foreground mb-6">
                Unlock powerful insights with advanced analytics and visualizations of your meeting content.
              </p>
              <ul className="space-y-3">
                {[
                  "Topic detection and categorization",
                  "Sentiment analysis across conversations",
                  "Interactive visualizations and word clouds",
                  "AI-powered summary generation",
                ].map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <img
              src="/placeholder.svg?height=500&width=700&query=Deep analysis dashboard with charts, word clouds, and sentiment analysis"
              alt="Deep Analysis"
              className="rounded-lg border shadow-xl"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="px-3 py-1 text-sm mb-4">
              Pricing
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground">
              Choose the plan that fits your needs. All plans include core features with no hidden fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Starter",
                price: "$12",
                description: "Perfect for individuals and small teams just getting started with AI meeting assistance.",
                features: [
                  "Up to 5 hours of recording per month",
                  "Basic transcription",
                  "Standard AI insights",
                  "7-day transcript history",
                  "Email support",
                ],
                cta: "Start Free Trial",
                popular: false,
              },
              {
                name: "Professional",
                price: "$29",
                description: "Ideal for growing teams that need more advanced features and capacity.",
                features: [
                  "Up to 20 hours of recording per month",
                  "Advanced transcription with speaker detection",
                  "Enhanced AI insights and analysis",
                  "30-day transcript history",
                  "Priority email support",
                  "Export to multiple formats",
                ],
                cta: "Start Free Trial",
                popular: true,
              },
              {
                name: "Enterprise",
                price: "$79",
                description: "For organizations that need the full power of AI meeting assistance at scale.",
                features: [
                  "Unlimited recording hours",
                  "Premium transcription with 99% accuracy",
                  "Advanced analytics and custom AI models",
                  "Unlimited transcript history",
                  "24/7 dedicated support",
                  "Custom integrations",
                  "SSO and advanced security",
                ],
                cta: "Contact Sales",
                popular: false,
              },
            ].map((plan, index) => (
              <Card
                key={index}
                className={`p-6 ${plan.popular ? "border-primary shadow-lg relative" : ""} flex flex-col h-full`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1">Most Popular</Badge>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline mb-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-1">/month</span>
                  </div>
                  <p className="text-muted-foreground">{plan.description}</p>
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button variant={plan.popular ? "default" : "outline"} className="w-full mt-auto">
                  {plan.cta}
                </Button>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-muted-foreground mb-4">
              Need a custom plan for your organization? Contact our sales team.
            </p>
            <Button variant="outline">Contact Sales</Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="px-3 py-1 text-sm mb-4">
              Testimonials
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
            <p className="text-xl text-muted-foreground">
              Discover how TalkAdvantage is transforming meetings for teams around the world.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                quote:
                  "TalkAdvantage has completely transformed our team meetings. We save hours every week on note-taking and follow-ups.",
                author: "Sarah Johnson",
                title: "Product Manager, Acme Inc",
                image: "/placeholder.svg?height=100&width=100&query=professional woman headshot",
              },
              {
                quote:
                  "The AI insights have helped us uncover patterns and opportunities in customer calls that we would have missed otherwise.",
                author: "Michael Chen",
                title: "Sales Director, Globex",
                image: "/placeholder.svg?height=100&width=100&query=professional man headshot",
              },
              {
                quote:
                  "As a remote team, having accurate transcripts and summaries has been game-changing for keeping everyone aligned.",
                author: "Elena Rodriguez",
                title: "CTO, Initech",
                image: "/placeholder.svg?height=100&width=100&query=professional woman tech leader headshot",
              },
            ].map((testimonial, index) => (
              <Card key={index} className="p-6">
                <div className="mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className="text-yellow-400">
                      ★
                    </span>
                  ))}
                </div>
                <p className="italic mb-6">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <img
                    src={testimonial.image || "/placeholder.svg"}
                    alt={testimonial.author}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.title}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="px-3 py-1 text-sm mb-4">
              FAQ
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-muted-foreground">Find answers to common questions about TalkAdvantage.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {[
              {
                question: "How accurate is the transcription?",
                answer:
                  "TalkAdvantage uses state-of-the-art AI models to achieve up to 99% accuracy in ideal conditions. Factors like audio quality, accents, and background noise can affect accuracy. Our Professional and Enterprise plans include enhanced models for even better results.",
              },
              {
                question: "Can I import existing audio files?",
                answer:
                  "Yes! TalkAdvantage supports importing audio files in various formats including MP3, WAV, M4A, and more. Simply use the Import tab to upload your files and our AI will process them just like live recordings.",
              },
              {
                question: "What languages are supported?",
                answer:
                  "Currently, TalkAdvantage supports English (US, UK, AU), Spanish, French, German, and Japanese. We're continuously adding more languages based on customer demand.",
              },
              {
                question: "How is my data secured?",
                answer:
                  "We take security seriously. All audio and transcripts are encrypted both in transit and at rest. We follow industry best practices for data protection, and our Enterprise plan includes additional security features like SSO and custom data retention policies.",
              },
              {
                question: "Can I integrate TalkAdvantage with other tools?",
                answer:
                  "Yes! TalkAdvantage offers integrations with popular tools like Zoom, Microsoft Teams, Slack, and more. Our API is available for custom integrations on Professional and Enterprise plans.",
              },
              {
                question: "What happens if I exceed my monthly recording limit?",
                answer:
                  "If you approach your limit, we'll notify you. You can either upgrade to a higher plan or purchase additional hours as needed. We never cut you off unexpectedly in the middle of an important meeting.",
              },
            ].map((faq, index) => (
              <Card key={index} className="p-6">
                <h3 className="text-lg font-semibold mb-2">{faq.question}</h3>
                <p className="text-muted-foreground">{faq.answer}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-primary/10 rounded-2xl p-8 md:p-12 max-w-5xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Meetings?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of teams using TalkAdvantage to capture insights, save time, and make meetings more
              productive.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="w-full sm:w-auto">
                Start Free Trial
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Schedule Demo
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">No credit card required. 14-day free trial.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-muted/30 border-t">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Mic className="h-5 w-5 text-primary" />
                <span className="text-xl font-bold text-primary">TalkAdvantage</span>
              </div>
              <p className="text-muted-foreground mb-4">
                AI-powered meeting assistant that transforms conversations into actionable insights.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-muted-foreground hover:text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                  </svg>
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                    <rect width="4" height="12" x="2" y="9"></rect>
                    <circle cx="4" cy="4" r="2"></circle>
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#features" className="text-muted-foreground hover:text-primary">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-muted-foreground hover:text-primary">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    Integrations
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    Roadmap
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    Community
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    Support
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    Careers
                  </a>
                </li>
                <li>
                  <Link href="/privacy" className="text-muted-foreground hover:text-primary">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-muted-foreground hover:text-primary">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} TalkAdvantage. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Add to head section */}
      <style jsx global>{`
        @keyframes text-gradient {
          0% { background-position: 0% 50% }
          50% { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }
        
        .animate-text-gradient {
          animation: text-gradient 6s linear infinite;
        }
        
        .bg-300\% {
          background-size: 300%;
        }
        
        .animate-gradient {
          animation: text-gradient 6s linear infinite;
        }
      `}</style>
    </div>
  )
}
