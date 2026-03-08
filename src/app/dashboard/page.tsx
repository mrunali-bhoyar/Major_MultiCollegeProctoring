
'use client';

import Link from 'next/link';
import { Shield, BookOpen, History, Edit, User, FileText, FileUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.replace('/login');
        }
    }, [isUserLoading, user, router]);

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
                <Shield className="w-8 h-8 text-primary" />
                <h1 className="text-2xl font-bold font-headline">MyProctor.ai Dashboard</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
                    <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
                </div>
            </header>
            <main className="flex-1 p-4 md:p-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold font-headline">Welcome, {user.displayName || user.email}!</h2>
                    <p className="text-muted-foreground">What would you like to do today?</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FeatureCard 
                        title="Give Exam" 
                        description="Start your proctored exam session." 
                        icon={<Edit className="w-6 h-6"/>} 
                        href="/exam" 
                    />
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
            </main>
             <footer className="text-center mt-8 py-6 border-t border-border/50 text-xs text-muted-foreground">
                <p>MyProctor.ai | Your trusted partner in online examination integrity.</p>
            </footer>
        </div>
    );
}
