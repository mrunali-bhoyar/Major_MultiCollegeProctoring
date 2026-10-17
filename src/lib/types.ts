

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
    type?: 'MCQ' | 'THEORY';
    modelAnswer?: string;
    questionBankId?: string;
    marks?: number;
    subject?: string;
    topic?: string;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
    collegeId?: string;
    departmentId?: string;
    branchId?: string;
    year?: number;
    createdByFacultyId?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type QuestionBank = {
    id: string;
    title: string;
    subject: string;
    collegeId: string;
    departmentId?: string;
    branchId?: string;
    year?: number;
    createdByFacultyId: string;
    createdAt: string;
    updatedAt: string;
};

export type Exam = {
    id: string;
    title: string;
    description: string;
    subject: string;
    collegeId: string;
    departmentId?: string;
    branchId?: string;
    year?: number;
    divisionId?: string;
    facultyId: string;
    questionBankId: string;
    duration: number;
    startTime: string;
    endTime: string;
    totalMarks: number;
    passingMarks: number;
    status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    createdAt: string;
    updatedAt: string;
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

export type College = {
    id: string;
    collegeName: string;
    collegeCode: string;
    emailDomain: string;
    address: string;
    city: string;
    state: string;
    status: 'ACTIVE' | 'INACTIVE';
    collegeAdminId?: string;
    createdAt: string; // ISO date string
    updatedAt: string; // ISO date string
};

export type Department = {
    id: string;
    collegeId: string;
    name: string;
};

export type Branch = {
    id: string;
    departmentId: string;
    name: string;
};

export type Division = {
    id: string;
    branchId: string;
    year: number;
    name: string;
};

export type UserRole = 'PLATFORM_ADMIN' | 'COLLEGE_ADMIN' | 'FACULTY' | 'STUDENT';

export type UserProfile = {
    uid: string;
    email: string;
    name: string;
    role: UserRole;
    collegeId?: string;
    departmentId?: string;
    branchId?: string;
    year?: number;
    yearId?: string | number;
    divisionId?: string;
    status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
    createdAt: string;
    updatedAt: string;
};