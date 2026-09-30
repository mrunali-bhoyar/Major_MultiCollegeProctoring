
"use client";

import { ProctoringDashboard } from "@/components/proctoring/ProctoringDashboard";
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ExamPageContent() {
    const searchParams = useSearchParams();
    const examId = searchParams.get('id');
    return <ProctoringDashboard examId={examId} />;
}

export default function ExamPage() {
    return (
        <Suspense fallback={<div>Loading exam...</div>}>
            <ExamPageContent />
        </Suspense>
    );
}
