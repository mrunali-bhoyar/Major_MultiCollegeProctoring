
'use client';

import {
  Shield,
  Rocket,
  Gauge,
  VideoOff,
  MicOff,
  UserX,
  Eye,
  Smartphone,
  Mic,
  Users,
  Brain,
  Lock,
  BarChart,
  Camera,
  ArrowRight,
  Cpu,
  ShieldCheck,
  Bell,
  FileText,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LandingPage() {
  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.98 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut",
      },
    }),
  };
  
  const featureItemVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.15,
        duration: 0.5,
        ease: "easeOut",
      },
    }),
  };

  const problemCards = [
    { icon: <VideoOff className="w-10 h-10 text-destructive mb-4" />, title: "No Gaze Monitoring", description: "Most platforms don't track eye movements or detect when students look away for unauthorized assistance." },
    { icon: <MicOff className="w-10 h-10 text-destructive mb-4" />, title: "No Audio Monitoring", description: "Unable to detect suspicious sounds or conversations, leaving a major loophole for cheating." },
    { icon: <UserX className="w-10 h-10 text-destructive mb-4" />, title: "High Cheating Risk", description: "Students can easily use unauthorized materials, devices, or get external help without detection." },
    { icon: <Users className="w-10 h-10 text-destructive mb-4" />, title: "Ineffective Invigilation", description: "Human proctors can't effectively monitor multiple students at once, leading to oversights." },
  ];

  const solutionCards = [
    { icon: <Eye className="w-10 h-10" />, title: "Face & Gaze Tracking", description: "Monitors student attention and detects when they look away from the screen." },
    { icon: <Smartphone className="w-10 h-10" />, title: "Object Detection", description: "Identifies unauthorized objects like phones or books in the environment." },
    { icon: <Mic className="w-10 h-10" />, title: "Audio Analysis", description: "Detects suspicious sounds, conversations, or external help via audio." },
    { icon: <Users className="w-10 h-10" />, title: "Multiple Person Detection", description: "Identifies additional people in the room using face detection." },
  ];

  const featureCards = [
    { icon: <Brain className="w-6 h-6" />, title: "Multi-modal AI Monitoring", description: "Simultaneous analysis of video, audio, and behavioral data for comprehensive monitoring." },
    { icon: <Shield className="w-6 h-6" />, title: "Real-time Suspicion Score", description: "Dynamic scoring system that quantifies suspicious behavior in real-time with high accuracy." },
    { icon: <Lock className="w-6 h-6" />, title: "Secure & Compliant", description: "End-to-end encryption and compliance with data privacy regulations (GDPR, FERPA)." },
    { icon: <BarChart className="w-6 h-6" />, title: "Detailed Analytics", description: "Comprehensive reporting with insights into examination patterns and integrity metrics." },
  ];


  return (
    <div className="bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-md p-5 flex justify-between items-center z-50 border-b border-border">
        <Link href="/" className="text-2xl font-bold font-headline flex items-center gap-2">
          <Shield className="w-7 h-7 text-secondary" />
          <span>
            MyProctor<span className="text-secondary">.ai</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button asChild variant="ghost">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Sign Up</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-24">
        <section className="min-h-[calc(100vh-6rem)] flex items-center justify-center text-center px-4 relative overflow-hidden">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="absolute -top-1/2 -left-1/4 w-full h-full bg-secondary/10 rounded-full blur-[100px] opacity-50"
          ></motion.div>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="absolute -bottom-1/2 -right-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-[100px] opacity-50"
          ></motion.div>
          
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { 
                opacity: 1,
                transition: { staggerChildren: 0.3 }
              }
            }}
            className="max-w-4xl z-10"
          >
            <motion.h1 
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-6xl font-bold font-headline mb-4"
            >
              AI-Based Online Examination Proctoring System
            </motion.h1>
            <motion.p 
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.5 }}
              className="text-lg md:text-xl text-secondary font-semibold mb-6"
            >
              Ensuring Fair, Secure, and Cheating-Free Online Examinations
            </motion.p>
            <motion.p 
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.5 }}
              className="text-muted-foreground mb-8 max-w-2xl mx-auto"
            >
              In today's digital education landscape, maintaining academic
              integrity during online exams is a major challenge. Our
              AI-powered proctoring system uses advanced computer vision and
              machine learning to detect and prevent cheating in real-time.
            </motion.p>
            <motion.div 
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.5 }}
              className="flex gap-4 justify-center"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button asChild size="lg" className="bg-primary hover:bg-primary/80">
                  <Link href="#solution">
                    <Rocket className="mr-2" /> Explore System
                  </Link>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button asChild size="lg" variant="outline">
                  <Link href="#features">
                    <Gauge className="mr-2" /> View Features
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* Problem Section */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          id="problem" 
          className="py-20 px-4"
        >
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">
              Why AI-Based Online Proctoring?
            </h2>
            <p className="text-muted-foreground mb-12">
              Traditional online examination platforms lack comprehensive
              monitoring, leading to compromised academic integrity and
              increased malpractice.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {problemCards.map((card, i) => (
              <motion.div
                key={i}
                custom={i}
                variants={cardVariants}
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="bg-card p-6 rounded-lg border border-border"
              >
                {card.icon}
                <h3 className="text-xl font-bold mb-2">{card.title}</h3>
                <p className="text-muted-foreground">{card.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Solution Section */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          id="solution" 
          className="py-20 px-4 bg-card border-y border-border"
        >
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">
              Our AI-Powered Solution
            </h2>
            <p className="text-muted-foreground mb-12">
              Our system utilizes advanced AI algorithms to monitor students in
              real-time, providing comprehensive proctoring for online
              examinations.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
             {solutionCards.map((item, i) => (
              <motion.div 
                key={i}
                custom={i}
                variants={cardVariants}
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="text-center p-6 rounded-lg"
              >
                <div className="w-20 h-20 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </motion.div>
             ))}
          </div>
        </motion.section>

        {/* System Architecture Section */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          id="architecture"
          className="py-20 px-4"
        >
          <div className="text-center max-w-3xl mx-auto">
            <motion.h2
              variants={featureItemVariants}
              custom={0}
              className="text-3xl md:text-4xl font-bold font-headline mb-4"
            >
              System Architecture
            </motion.h2>
            <motion.p
              variants={featureItemVariants}
              custom={1}
              className="text-muted-foreground mb-12"
            >
              A high-level overview of how MyProctor.ai processes data to ensure exam integrity.
            </motion.p>
          </div>
          <motion.div
            variants={{
              visible: { transition: { staggerChildren: 0.1 } }
            }}
            className="max-w-7xl mx-auto"
          >
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-2 flex-wrap">
              {/* Step 1: Input */}
              <motion.div variants={cardVariants} custom={0} className="flex flex-col items-center text-center p-4 rounded-lg min-w-40">
                <div className="flex gap-2">
                  <Camera className="w-8 h-8 text-primary" />
                  <Mic className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold mt-2">Webcam + Mic</h3>
                <p className="text-xs text-muted-foreground">Live Feed</p>
              </motion.div>

              <motion.div variants={cardVariants} custom={1} className="hidden md:block">
                <ArrowRight className="w-8 h-8 text-muted-foreground" />
              </motion.div>

              {/* Step 2: Processing */}
              <motion.div variants={cardVariants} custom={2} className="flex flex-col items-center text-center p-4 rounded-lg min-w-40">
                <Cpu className="w-8 h-8 text-primary" />
                <h3 className="font-semibold mt-2">Processing Layer</h3>
                <p className="text-xs text-muted-foreground">OpenCV, MediaPipe, YOLO</p>
              </motion.div>

              <motion.div variants={cardVariants} custom={3} className="hidden md:block">
                <ArrowRight className="w-8 h-8 text-muted-foreground" />
              </motion.div>

              {/* Step 3: AI Modules */}
              <motion.div variants={cardVariants} custom={4} className="flex flex-col items-center text-center p-4 rounded-lg min-w-40">
                <Brain className="w-8 h-8 text-primary" />
                <h3 className="font-semibold mt-2">AI Detection Modules</h3>
                <p className="text-xs text-muted-foreground">Behavioral Analysis</p>
              </motion.div>

              <motion.div variants={cardVariants} custom={5} className="hidden md:block">
                <ArrowRight className="w-8 h-8 text-muted-foreground" />
              </motion.div>

              {/* Step 4: Rules Engine */}
              <motion.div variants={cardVariants} custom={6} className="flex flex-col items-center text-center p-4 rounded-lg min-w-40">
                <ShieldCheck className="w-8 h-8 text-primary" />
                <h3 className="font-semibold mt-2">Violation Rules Engine</h3>
                <p className="text-xs text-muted-foreground">Score & Trigger Logic</p>
              </motion.div>

              <motion.div variants={cardVariants} custom={7} className="hidden md:block">
                <ArrowRight className="w-8 h-8 text-muted-foreground" />
              </motion.div>

              {/* Step 5: Alerts & Logs */}
              <motion.div variants={cardVariants} custom={8} className="flex flex-col items-center text-center p-4 rounded-lg min-w-40">
                <div className="flex gap-2">
                  <Bell className="w-8 h-8 text-primary" />
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold mt-2">Alerts + Logs</h3>
                <p className="text-xs text-muted-foreground">Incident Recording</p>
              </motion.div>

              <motion.div variants={cardVariants} custom={9} className="hidden md:block">
                <ArrowRight className="w-8 h-8 text-muted-foreground" />
              </motion.div>

              {/* Step 6: Dashboard */}
              <motion.div variants={cardVariants} custom={10} className="flex flex-col items-center text-center p-4 rounded-lg min-w-40">
                <LayoutDashboard className="w-8 h-8 text-primary" />
                <h3 className="font-semibold mt-2">Admin Dashboard</h3>
                <p className="text-xs text-muted-foreground">Real-time Review</p>
              </motion.div>
            </div>
          </motion.div>
        </motion.section>
        
        {/* Features Section */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          id="features" 
          className="py-20 px-4"
        >
            <div className="text-center max-w-3xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">Unique Features</h2>
                <p className="text-muted-foreground mb-12">
                    Advanced capabilities that make our system stand out from traditional proctoring solutions.
                </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                {featureCards.map((feature, i) => (
                  <motion.div 
                    key={i}
                    custom={i}
                    variants={featureItemVariants}
                    whileHover={{ y: -8 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="flex items-start gap-4 p-4 rounded-lg"
                  >
                      <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
                          {feature.icon}
                      </div>
                      <div>
                          <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                          <p className="text-muted-foreground">{feature.description}</p>
                      </div>
                  </motion.div>
                ))}
            </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8 px-4">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} MyProctor.ai. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
