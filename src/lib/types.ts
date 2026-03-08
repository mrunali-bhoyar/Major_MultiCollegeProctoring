

export type Alert = {
    id: string;
    examSessionId: string;
    timestamp: string; // ISO date string
    message: string;
    type: 'info' | 'warning';
    scoreImpact: number;
};

export type ExamSession = {
    id: string;
    studentId: string;
    startTime: string;
    endTime?: string;
    suspicionScore: number;
    examDetails: string;
}

export type ModuleStatus = 'ACTIVE' | 'INACTIVE' | 'SIMULATED';

export type ProctoringState = {
    suspicionScore: number;
    faceCount: number;
    gazeScore: number;
    objectCount: number;
    audioEvents: number;
    modules: {
        face: ModuleStatus;
        object: ModuleStatus;
        audio: ModuleStatus;
        multiplePeople: ModuleStatus;
    };
};

export type Question = {
    id: string;
    text: string;
    options: string[];
    answer: string;
};

export type StudyMaterial = {
    id: string;
    title: string;
    description: string;
    fileUrl: string;
    fileName: string;
    fileType: string;
    uploadedAt: string; // ISO String
};

export type PreviousYearQuestionPaper = {
    id: string;
    title: string;
    description: string;
    fileUrl: string;
    fileName: string;
    fileType: string;
    uploadedAt: string; // ISO String
};

export type Assignment = {
    id: string;
    title: string;
    description: string;
    createdAt: string; // ISO String
};

export type Submission = {
    id: string;
    assignmentId: string;
    assignmentTitle: string;
    studentId: string;
    studentName: string;
    fileUrl: string;
    fileName: string;
    submittedAt: string; // ISO String
    grade?: number;
};

export type PlagiarismSource = {
    type: 'Internet' | 'Internal Database' | 'Student Submission';
    sourceName: string;
    similarity: number;
    url?: string;
};

export type PlagiarismResult = {
    overallSimilarity: number;
    risk: 'Low' | 'Medium' | 'High';
    sources: PlagiarismSource[];
    paraphraseScore: number;
    aiGeneratedScore: number;
    highlightedContent: string; // HTML string with <mark> tags
    fingerprint: string;
};

    