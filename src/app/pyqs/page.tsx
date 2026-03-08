
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Shield, History, Download, ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth, useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection } from 'firebase/firestore';
import type { PreviousYearQuestionPaper } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function PYQsPage() {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const firestore = useFirestore();
    const router = useRouter();

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.replace('/login');
        }
    }, [isUserLoading, user, router]);

    const pyqsQuery = useMemoFirebase(() =>
        firestore && user ? collection(firestore, 'previousYearQuestionPapers') : null
    , [firestore, user]);

    const { data: papers, isLoading } = useCollection<PreviousYearQuestionPaper>(pyqsQuery);

    const handleLogout = () => {
        auth.signOut();
        router.push('/');
    };

    if (isUserLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Shield className="w-12 h-12 text-primary animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <header className="flex items-center justify-between p-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/dashboard"><ArrowLeft /></Link>
                    </Button>
                    <History className="w-8 h-8 text-primary" />
                    <h1 className="text-2xl font-bold font-headline">Previous Year Question Papers</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
                    <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
                </div>
            </header>
            <main className="flex-1 p-4 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        [...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
                    ) : papers && papers.length > 0 ? (
                        papers.map(paper => (
                            <Card key={paper.id}>
                                <CardHeader>
                                    <CardTitle>{paper.title}</CardTitle>
                                    <CardDescription>{paper.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col justify-between">
                                     <p className="text-xs text-muted-foreground mb-4">Uploaded on: {format(new Date(paper.uploadedAt), 'PPP')}</p>
                                    <Button asChild>
                                        <a href={paper.fileUrl} target="_blank" rel="noopener noreferrer">
                                            <Download className="mr-2" />
                                            Download {paper.fileType.toUpperCase()}
                                        </a>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-20">
                            <p className="text-muted-foreground">No question papers have been uploaded yet.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
