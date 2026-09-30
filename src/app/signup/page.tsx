"use client";

import { useState } from 'react';
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
import { useAuth, useFirestore } from '@/firebase';
import { setDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password || !invitationCode) {
        toast({ variant: "destructive", title: "Missing Fields", description: "All fields are required." });
        return;
    }
    if (password !== confirmPassword) {
        toast({ variant: "destructive", title: "Password Mismatch", description: "Passwords do not match." });
        return;
    }

    setIsLoading(true);

    try {
      if (!firestore) throw new Error("Database not connected");

      // 1. Validate Invitation Code
      const invRef = doc(firestore, 'invitations', invitationCode);
      const invSnap = await getDoc(invRef);

      if (!invSnap.exists()) {
        throw new Error("Invalid invitation code.");
      }
      
      const invData = invSnap.data();
      
      if (invData.status !== 'PENDING') {
        throw new Error("This invitation code has already been used.");
      }
      
      if (new Date() > new Date(invData.expiresAt)) {
        throw new Error("This invitation code has expired.");
      }
      
      if (invData.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
        throw new Error(`This invitation is for ${invData.email}. Please use that email.`);
      }

      // 2. Create Auth Account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await sendEmailVerification(user);

      // 3. Create User Document locked to the authorized scope
      const userDocRef = doc(firestore, "users", user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        id: user.uid,
        name: username,
        username: username,
        email: user.email,
        role: invData.role || "STUDENT",
        collegeId: invData.collegeId || null,
        departmentId: invData.departmentId || null,
        branchId: invData.branchId || null,
        yearId: invData.yearId || null,
        divisionId: invData.divisionId || null,
        facultyId: invData.facultyId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        suspicionScore: 0,
        status: 'ACTIVE'
      });

      // 4. Invalidate the invitation
      await updateDoc(invRef, {
        status: 'USED',
        usedByUid: user.uid,
        usedAt: new Date().toISOString()
      });

      toast({
        title: "Account Created",
        description: "Registration successful! Please check your email to verify your account.",
      });
      router.push('/login');
    } catch (error: any) {
      console.error("Signup error:", error);
      let description = error.message;
      if (error.code === 'auth/email-already-in-use') {
        description = "This email address is already registered.";
      } else if (error.code === 'auth/weak-password') {
        description = "The password is too weak. It must be at least 6 characters long.";
      }
      toast({ variant: "destructive", title: "Sign Up Failed", description: description });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 -left-40 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-40 w-96 h-96 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-20 w-96 h-96 bg-purple-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

        <div className="w-full max-w-md z-10 relative">
            <div className="text-center mb-8 flex flex-col items-center">
                <div className="bg-background p-3 rounded-full shadow-lg border border-border/50 mb-4 inline-flex">
                    <Shield className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight font-headline">MyProctor.ai</h1>
                <p className="text-muted-foreground mt-2">Complete Student Registration</p>
            </div>

            <Card className="w-full shadow-xl border-border/50 backdrop-blur-sm bg-card/90">
              <CardHeader>
                <CardTitle className="font-headline">Create Account</CardTitle>
                <CardDescription>Activate your secure student account.</CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                   <div className="space-y-2">
                     <Label htmlFor="invitation">Invitation Code</Label>
                     <Input id="invitation" placeholder="Paste your 20-character code" value={invitationCode} onChange={(e) => setInvitationCode(e.target.value)} required className="font-mono text-sm bg-muted/50" />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="email">Email</Label>
                     <Input id="email" type="email" placeholder="john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="username">Full Name</Label>
                     <Input id="username" placeholder="John Doe" value={username} onChange={(e) => setUsername(e.target.value)} required />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="password">Password</Label>
                     <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="confirmPassword">Confirm Password</Label>
                     <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                   </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4 mt-2">
                  <Button type="submit" className="w-full h-11 text-base font-semibold shadow-md transition-all hover:shadow-lg" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...</> : 'Activate Account'}
                  </Button>
                  <p className="text-sm text-center text-muted-foreground">
                    Already have an account?{' '}
                    <Link href="/login" className="text-primary hover:underline font-medium">Log in</Link>
                  </p>
                </CardFooter>
              </form>
            </Card>
        </div>
    </div>
  );
}
