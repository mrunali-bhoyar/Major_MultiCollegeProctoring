
"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2 } from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const checkUserRoleAndRedirect = useCallback(async (user: any) => {
    if (!user || !firestore) return;
    try {
      const userDocRef = doc(firestore, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role === 'admin' || userData.role === 'faculty') {
          router.push('/admin-dashboard');
        } else {
          router.push('/dashboard');
        }
      } else {
        router.push('/dashboard'); // Default redirect
      }
    } catch (error) {
      console.error("Error checking user role:", error);
      router.push('/dashboard'); // Default redirect on error
    }
  }, [firestore, router]);

  useEffect(() => {
    if (user && !isUserLoading) {
      setIsLoading(true);
      checkUserRoleAndRedirect(user);
    }
  }, [user, isUserLoading, checkUserRoleAndRedirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Please enter both email and password.",
      });
      return;
    }
    setIsLoading(true);
    signInWithEmailAndPassword(auth, email, password)
      .catch((error: any) => {
        let description = "An unexpected error occurred.";
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            description = "Invalid email or password. Please try again.";
        } else {
            description = error.message;
        }
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: description,
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-headline">Sign In</CardTitle>
        <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="user@procto.vision" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading || isUserLoading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" disabled={isLoading || isUserLoading}/>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button type="submit" className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground" disabled={isLoading || isUserLoading}>
            {(isLoading || isUserLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading || isUserLoading ? 'Signing In...' : 'Sign In'}
          </Button>
          <p className="text-sm text-muted-foreground">
            Don't have an account? <Link href="/signup" className="text-primary hover:underline">Sign up</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 bg-background">
      <div className="flex flex-col items-center justify-center w-full max-w-md">
        <div className="flex items-center gap-4 mb-8">
            <Shield className="w-12 h-12 text-primary" />
            <h1 className="text-4xl font-bold font-headline text-foreground">
                MyProctor.ai
            </h1>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
