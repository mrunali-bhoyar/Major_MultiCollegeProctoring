
'use client';

import Link from 'next/link';
import { Shield, BookOpen, History, Edit, User, FileText, FileUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDoc, doc } from 'firebase/firestore';
import { Exam } from '@/lib/types';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ContactSupportCard } from '@/components/support/ContactSupportCard';

const FeatureCard = ({ title, description, icon, href }: { title: string, description: string, icon: React.ReactNode, href: string }) => (
    <Link href={href} className="block hover:shadow-lg transition-shadow duration-300 rounded-lg">
        <Card className="h-full flex flex-col justify-between hover:border-primary">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 text-primary p-3 rounded-full">
                        {icon}
                    </div>
                    <div>
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                 <Button variant="link" className="p-0">Go to {title} &rarr;</Button>
            </CardContent>
        </Card>
    </Link>
);


export default function DashboardPage() {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const router = useRouter();

    const firestore = useFirestore();
    const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.replace('/login');
        } else if (user && firestore) {
            getDoc(doc(firestore, 'users', user.uid)).then(d => {
                if(d.exists()) setUserData(d.data());
            });
        }
    }, [isUserLoading, user, router, firestore]);

    const handleLogout = () => {
        auth.signOut();
        router.push('/');
    };

    const examsQuery = useMemoFirebase(() => firestore && userData?.divisionId && userData?.collegeId ? query(collection(firestore, 'exams'), where('collegeId', '==', userData.collegeId), where('divisionId', '==', userData.divisionId), where('status', '==', 'ACTIVE')) : null, [firestore, userData?.divisionId, userData?.collegeId]);
    const { data: exams, isLoading: isLoadingExams } = useCollection<Exam>(examsQuery);

    if (isUserLoading || !user || (user && !userData)) {
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
                <Shield className="w-8 h-8 text-primary" />
                <h1 className="text-2xl font-bold font-headline">MyProctor.ai Dashboard</h1>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
                    <ThemeToggle />
                    <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
                </div>
            </header>
            <main className="flex-1 p-4 md:p-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold font-headline">Welcome, {userData?.name || user.displayName || user.email}!</h2>
                    <p className="text-muted-foreground">What would you like to do today?</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="col-span-1 md:col-span-3 bg-primary/5 border-primary/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2"><User className="w-5 h-5"/> My Academic Profile</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
                                <div><p className="text-muted-foreground">College ID</p><p className="font-semibold truncate">{userData?.collegeId || 'N/A'}</p></div>
                                <div><p className="text-muted-foreground">Department ID</p><p className="font-semibold truncate">{userData?.departmentId || 'N/A'}</p></div>
                                <div><p className="text-muted-foreground">Branch ID</p><p className="font-semibold truncate">{userData?.branchId || 'N/A'}</p></div>
                                <div><p className="text-muted-foreground">Year</p><p className="font-semibold truncate">{userData?.yearId || 'N/A'}</p></div>
                                <div><p className="text-muted-foreground">Division ID</p><p className="font-semibold truncate">{userData?.divisionId || 'N/A'}</p></div>
                                <div><p className="text-muted-foreground">Faculty ID</p><p className="font-semibold truncate">{userData?.facultyId || 'N/A'}</p></div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="h-full flex flex-col justify-between hover:border-primary">
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <div className="bg-primary/10 text-primary p-3 rounded-full">
                                    <Edit className="w-6 h-6"/>
                                </div>
                                <div>
                                    <CardTitle>Assigned Exams</CardTitle>
                                    <CardDescription>Start your proctored exam sessions.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoadingExams ? <p>Loading exams...</p> : 
                             exams && exams.length > 0 ? (
                                <div className="space-y-2">
                                    {exams.map(ex => (
                                        <Button key={ex.id} variant="outline" className="w-full justify-start" asChild>
                                            <Link href={`/exam?id=${ex.id}`}>{ex.title} - {ex.subject}</Link>
                                        </Button>
                                    ))}
                                </div>
                             ) : <p className="text-sm text-muted-foreground">No active exams assigned.</p>}
                        </CardContent>
                    </Card>
                    <FeatureCard 
                        title="Upload Assignment" 
                        description="View and submit your assignments." 
                        icon={<FileUp className="w-6 h-6"/>} 
                        href="/assignments" 
                    />
                    <FeatureCard 
                        title="Study Material" 
                        description="Access course materials and notes." 
                        icon={<BookOpen className="w-6 h-6"/>} 
                        href="/study-material" 
                    />
                    <FeatureCard 
                        title="Previous Question Papers" 
                        description="Review past exam papers for practice." 
                        icon={<History className="w-6 h-6"/>} 
                        href="/pyqs" 
                    />
                </div>

                <div className="mt-8">
                    <ContactSupportCard 
                        recipientType="COLLEGE"
                        recipientLabel="College Administration"
                        senderRole="STUDENT"
                        senderEmail={user?.email || ''}
                        senderName={userData?.name || user?.displayName || 'Student'}
                        senderId={user?.uid}
                        collegeId={userData?.collegeId}
                    />
                </div>
            </main>
             <footer className="text-center mt-8 py-6 border-t border-border/50 text-xs text-muted-foreground">
                <p>MyProctor.ai | Your trusted partner in online examination integrity.</p>
            </footer>
        </div>
    );
}
