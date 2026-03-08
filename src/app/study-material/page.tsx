
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Shield, BookOpen, Download, ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth, useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection } from 'firebase/firestore';
import type { StudyMaterial } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function StudyMaterialPage() {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const firestore = useFirestore();
    const router = useRouter();

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.replace('/login');
        }
    }, [isUserLoading, user, router]);

    const studyMaterialsQuery = useMemoFirebase(() =>
        firestore && user ? collection(firestore, 'studyMaterials') : null
    , [firestore, user]);

    const { data: materials, isLoading } = useCollection<StudyMaterial>(studyMaterialsQuery);

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
                    <BookOpen className="w-8 h-8 text-primary" />
                    <h1 className="text-2xl font-bold font-headline">Study Material</h1>
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
                    ) : materials && materials.length > 0 ? (
                        materials.map(material => (
                            <Card key={material.id}>
                                <CardHeader>
                                    <CardTitle>{material.title}</CardTitle>
                                    <CardDescription>{material.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col justify-between">
                                     <p className="text-xs text-muted-foreground mb-4">Uploaded on: {format(new Date(material.uploadedAt), 'PPP')}</p>
                                    <Button asChild>
                                        <a href={material.fileUrl} target="_blank" rel="noopener noreferrer">
                                            <Download className="mr-2" />
                                            Download {material.fileType.toUpperCase()}
                                        </a>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-20">
                            <p className="text-muted-foreground">No study materials have been uploaded yet.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
