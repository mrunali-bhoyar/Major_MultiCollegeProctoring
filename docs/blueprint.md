# **App Name**: ProctoVision

## Core Features:

- Camera & Audio Monitoring: Access user webcam and microphone to provide live video and audio feeds for monitoring.
- Simulated AI Analysis: Simulate face detection, gaze tracking, object detection, audio analysis, and shadow detection to mimic real-time AI monitoring.
- Suspicion Score System: Calculate and display a suspicion score based on detected anomalies and violations.
- Real-time Alert Management: Generate and display real-time alerts with timestamps for suspicious activities detected during the exam.
- User Authentication: Implement a login page for Students, Admins/Invigilators, and Faculty/Evaluators with role-based access control.
- Home Page/Dashboard: Create a user-friendly dashboard with clear visual indicators to manage and monitor the proctoring process.
- Data Logging to Database: Log alerts, suspicion scores, and session data to the Cloud SQL database for admins to monitor and create alerts, leveraging AI as a tool to reason about when/if some specific information may need to be acted on. Store student and evaluator login credentials

## Style Guidelines:

- Primary color: Deep blue (#4A6FA5) to convey trust and security.
- Background color: Dark gray (#121826) to reduce eye strain during long monitoring sessions.
- Accent color: Teal (#00C9B7) to highlight important information and alerts.
- Font: 'Inter' (sans-serif) for clear and modern readability in both headlines and body text.
- Use clear, minimalist icons from Font Awesome to represent different AI modules and actions.
- Divide the dashboard into logical sections for video feed, suspicion score, alerts, and module status. Use a grid layout for responsiveness.
- Subtle animations for alerts and score updates to draw attention without being distracting.