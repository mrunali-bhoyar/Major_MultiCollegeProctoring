# How MyProctor.ai Works: A Step-by-Step Guide

This document provides a comprehensive overview of the entire MyProctor.ai application, from the problems it solves to the underlying technology.

## The Problem: Challenges in Online Examination

The shift to digital education has made online examinations essential, but it has also introduced significant challenges in maintaining academic integrity. Traditional online testing platforms often lack the robust monitoring needed to prevent academic malpractice. MyProctor.ai is designed to solve these critical problems:

-   **High Risk of Cheating**: Without effective monitoring, students can easily use unauthorized materials like textbooks, notes, or smartphones. They can also get help from another person in the room or search for answers online.
-   **Lack of Gaze and Attention Tracking**: Standard platforms cannot determine if a student is actively looking at the screen or looking away for extended periods, which is a key indicator of potential cheating.
-   **No Audio Monitoring**: Suspicious sounds, like whispering, background conversations, or receiving verbal help, go completely undetected in a typical online exam setting.
-   **Ineffective Human Invigilation**: A single human proctor cannot effectively watch dozens of students simultaneously over a video call. This leads to missed incidents and an inconsistent standard of proctoring.
-   **Plagiarism and AI-Generated Content**: With the rise of advanced AI tools, it is easier than ever for students to submit assignments that are not their own original work.

MyProctor.ai addresses these challenges by providing a comprehensive, AI-powered solution to ensure a fair and secure examination environment for everyone.


## 1. User Authentication and Roles

The system supports three user roles: `student`, `faculty`, and `admin`. The user's role dictates their permissions and what they see after logging in.

-   **Sign Up (`/signup`)**:
    -   A new user provides their name, email, and password and selects a role.
    -   Using **Firebase Authentication**, an account is created.
    -   Simultaneously, a new document is created in the **Firestore** database under the `/users/{userId}` path. This document stores the user's role, email, and other profile information.

-   **Login (`/login`)**:
    -   The user signs in with their email and password using Firebase Authentication.
    -   After a successful login, the application reads the user's document from Firestore to check their `role`.
    -   **Role-Based Redirection**:
        -   Users with the `student` role are sent to the Student Dashboard (`/dashboard`).
        -   Users with `admin` or `faculty` roles are sent to the Admin Dashboard (`/admin-dashboard`).

## 2. The Student Experience

### Student Dashboard (`/dashboard`)

This is the central hub for students. From here, they can navigate to:
-   Give an Exam
-   Upload an Assignment
-   Access Study Materials
-   View Previous Year Question Papers (PYQs)

### Exam Page (`/exam`)

This is the core proctoring feature of the application.

-   **Starting the Exam**: When a student clicks "Start Exam", the system activates the monitoring. A new exam session document is created in Firestore at `/users/{userId}/examSessions/{sessionId}` to log the start time and other details.
-   **AI Proctoring (Simulation)**:
    -   **Video Feed**: The app uses `navigator.mediaDevices.getUserMedia` to access the student's webcam.
    -   **Real-time Analysis**: A simulation runs every few seconds to mimic AI analysis:
        -   **Face & Gaze Tracking**: Simulates checking if the student is looking away or if their face is missing.
        -   **Object Detection**: Simulates detecting unauthorized objects like phones or books.
        -   **Audio Analysis**: Simulates detecting suspicious background noises or voices.
        -   **Multiple Person Detection**: Simulates identifying if more than one person is in the video feed.
    -   **Suspicion Score**: Each simulated event (e.g., "No face detected") increases the `suspicionScore` for the user. This score is updated in real-time in the user's document in Firestore.
    -   **Alerts**: For every event, a new alert document is created in a sub-collection in Firestore (`/users/{userId}/examSessions/{sessionId}/alerts`). This creates a detailed log of all suspicious activities.
-   **Answering Questions**:
    -   The questions are fetched from the `/questions` collection in Firestore.
    -   As the student answers, their selections are stored in the component's state.
-   **Submitting the Exam**:
    -   When submitted, the app calculates the final score.
    -   It updates the user's document in Firestore, setting `examSubmitted: true` and saving the `examScore`.

### Assignments and Materials

-   **Assignments (`/assignments`)**:
    -   Students can view assignments created by faculty (fetched from the `/assignments` collection).
    -   They can upload their submission file. The file is uploaded to **Firebase Storage**.
    -   After a successful upload, a new document is created in the `/submissions` collection containing the student's information and the public URL to the file in Firebase Storage.
-   **Study Material & PYQs (`/study-material`, `/pyqs`)**:
    -   These pages fetch and display lists of files from the `/studyMaterials` and `/previousYearQuestionPapers` collections in Firestore, allowing students to download them.

## 3. The Admin & Faculty Experience (`/admin-dashboard`)

This is the control center for managing the proctoring system and academic content.

-   **Student Monitoring**:
    -   This tab displays a real-time list of all students, their current suspicion scores, and exam status.
    -   The data is streamed directly from the `/users` collection in Firestore, so any changes (like an increasing suspicion score) are reflected instantly without needing a page refresh.
-   **Review Student Session**:
    -   Clicking "Review" on a student opens a side panel showing a detailed log of all alerts from their most recent exam session, fetched from the Firestore sub-collection.
    -   It also includes an AI-generated summary and suggested interventions (this is currently simulated).
-   **Content Management**:
    -   **Question Bank**: Faculty can add or delete exam questions. These operations directly modify the `/questions` collection in Firestore.
    -   **Assignments**: Faculty can create new assignments, which adds a document to the `/assignments` collection.
    -   **Study Material / PYQs**: Faculty can upload PDF, DOC, and other files. The files are saved to Firebase Storage, and their metadata (title, description, URL) is saved to the relevant Firestore collection.
-   **Submission Review**:
    -   Faculty can view a table of all student submissions from the `/submissions` collection.
    -   They can download the submitted file and assign a `grade`, which updates the specific submission document in Firestore.
-   **Plagiarism Checker**:
    -   This feature allows faculty to paste text or upload a .txt file.
    -   On analysis, it calls a server-side **Genkit flow** which uses Google's Gemini AI models.
    -   The flow performs a multi-step analysis to determine an AI probability score, a plagiarism score, and identifies which parts of the text are suspicious.
    -   The detailed report is then displayed in the UI.

## 4. Core Technology Stack

-   **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS for styling, and ShadCN for UI components.
-   **Backend & Database**: Firebase
    -   **Authentication**: Manages all user accounts and sessions.
    -   **Firestore**: A NoSQL database used as the primary data store for the entire application. Its real-time capabilities power the live admin dashboard.
    -   **Storage**: Used for all file uploads (assignments, study materials, etc.).
    -   **Security Rules**: Both Firestore and Storage have a set of security rules that define who can read, write, or delete data. This is critical for ensuring students can only access their own data while faculty have broader permissions.
-   **Generative AI**: Genkit is used to orchestrate calls to Google's Gemini family of models for the plagiarism and AI content detection features.