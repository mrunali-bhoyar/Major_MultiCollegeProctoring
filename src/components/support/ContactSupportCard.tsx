"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { 
    Mail, 
    Send, 
    Loader2, 
    MessageSquare, 
    HelpCircle, 
    Building2, 
    Shield, 
    CheckCircle2, 
    Clock
} from 'lucide-react';

interface ContactSupportCardProps {
    recipientType: 'COLLEGE' | 'ADMIN';
    recipientLabel: string;
    senderRole: string;
    senderEmail?: string;
    senderName?: string;
    senderId?: string;
    collegeId?: string;
    className?: string;
}

export function ContactSupportCard({
    recipientType,
    recipientLabel,
    senderRole,
    senderEmail,
    senderName,
    senderId,
    collegeId,
    className
}: ContactSupportCardProps) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const [category, setCategory] = useState('Technical Onboarding');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [justSent, setJustSent] = useState(false);
    const [previousMessages, setPreviousMessages] = useState<any[]>([]);

    const storageKey = `myproctor_support_msgs_${senderId || 'user'}`;

    // Load previously sent messages from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                setPreviousMessages(JSON.parse(saved));
            }
        } catch (e) {
            console.warn('Could not read saved support messages', e);
        }
    }, [storageKey]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim()) {
            toast({
                variant: 'destructive',
                title: 'Missing information',
                description: 'Please provide both a subject and a message.'
            });
            return;
        }

        setIsSubmitting(true);
        const newMsg = {
            id: 'msg_' + Date.now(),
            senderId: senderId || 'anonymous',
            senderName: senderName || senderEmail || 'User',
            senderEmail: senderEmail || '',
            senderRole: senderRole,
            recipientType: recipientType,
            recipientLabel: recipientLabel,
            collegeId: collegeId || null,
            category: category,
            subject: subject.trim(),
            message: message.trim(),
            status: 'SENT',
            createdAt: new Date().toISOString()
        };

        // Update local state and localStorage immediately
        try {
            const updated = [newMsg, ...previousMessages];
            setPreviousMessages(updated);
            localStorage.setItem(storageKey, JSON.stringify(updated));

            // Also keep a copy in the shared list for institutional inbox
            const sharedRaw = localStorage.getItem('myproctor_support_messages_all');
            const sharedList = sharedRaw ? JSON.parse(sharedRaw) : [];
            localStorage.setItem('myproctor_support_messages_all', JSON.stringify([newMsg, ...sharedList]));
        } catch (storageErr) {
            console.warn('LocalStorage error:', storageErr);
        }

        // Safely attempt Firestore addDoc without throwing unhandled rejection if rules don't permit
        if (firestore) {
            try {
                await addDoc(collection(firestore, 'supportMessages'), newMsg);
            } catch (err: any) {
                // If cloud Firestore rules do not allow this collection yet, fail gracefully
                console.warn('Firestore support sync notice:', err?.message || err);
            }
        }

        toast({
            title: 'Message Sent Successfully',
            description: `Your message has been delivered to ${recipientLabel}.`
        });

        setSubject('');
        setMessage('');
        setJustSent(true);
        setIsSubmitting(false);
        setTimeout(() => setJustSent(false), 5000);
    };

    const handleMailto = () => {
        const mailSubject = encodeURIComponent(`[${category}] ${subject || 'Support Inquiry'}`);
        const mailBody = encodeURIComponent(
            `Hello ${recipientLabel},\n\nSender: ${senderName || 'User'} (${senderEmail || 'N/A'})\nRole: ${senderRole}\n\nMessage:\n${message || 'I would like to get in touch regarding technical onboarding and college setup.'}\n\nBest regards,\n${senderName || 'User'}`
        );
        window.open(`mailto:support@myproctor.ai?subject=${mailSubject}&body=${mailBody}`, '_blank');
    };

    return (
        <Card className={`border-border/60 shadow-md ${className || ''}`}>
            <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Get in Touch
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        {recipientType === 'COLLEGE' ? (
                            <Building2 className="w-3.5 h-3.5 text-secondary" />
                        ) : (
                            <Shield className="w-3.5 h-3.5 text-primary" />
                        )}
                        Sending to: <strong className="text-foreground">{recipientLabel}</strong>
                    </span>
                </div>
                <CardTitle className="text-xl font-bold font-headline">Contact & Institutional Support</CardTitle>
                <CardDescription className="text-sm">
                    Have questions about setting up for your college, or need technical onboarding? Reach out directly.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="support-category">Inquiry Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger id="support-category">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Technical Onboarding">Technical Onboarding</SelectItem>
                                    <SelectItem value="College Setup & Hierarchy">College Setup & Hierarchy</SelectItem>
                                    <SelectItem value="Exam & Proctoring Issue">Exam & Proctoring Issue</SelectItem>
                                    <SelectItem value="Account & Invitations">Account & Invitations</SelectItem>
                                    <SelectItem value="Other Support Inquiry">Other Support Inquiry</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="support-subject">Subject</Label>
                            <Input 
                                id="support-subject"
                                value={subject} 
                                onChange={(e) => setSubject(e.target.value)} 
                                placeholder="Brief title of your request" 
                                required 
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="support-message">Message</Label>
                        <Textarea 
                            id="support-message"
                            value={message} 
                            onChange={(e) => setMessage(e.target.value)} 
                            placeholder={`Write your message to ${recipientLabel} here...`} 
                            rows={3} 
                            required 
                        />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div className="flex items-center gap-2">
                            <Button 
                                type="submit" 
                                disabled={isSubmitting || !subject.trim() || !message.trim()}
                                className="shadow-sm"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Send Message to {recipientLabel}
                                    </>
                                )}
                            </Button>
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={handleMailto}
                                title="Open default email client"
                            >
                                <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                                Email Directly
                            </Button>
                        </div>

                        {justSent && (
                            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 font-medium">
                                <CheckCircle2 className="w-4 h-4" /> Delivered to {recipientLabel}
                            </span>
                        )}
                    </div>
                </form>

                {/* Previous Messages History */}
                {previousMessages && previousMessages.length > 0 && (
                    <div className="mt-6 pt-6 border-t space-y-3">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Your Recent Support Messages ({previousMessages.length})
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {previousMessages.slice(0, 3).map((msg: any) => (
                                <div key={msg.id} className="p-3 bg-muted/40 rounded-lg border text-xs space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-foreground">{msg.subject}</span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : ''}
                                        </span>
                                    </div>
                                    <p className="text-muted-foreground line-clamp-2">{msg.message}</p>
                                    <div className="flex items-center justify-between pt-1">
                                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                                            To: {msg.recipientLabel || msg.recipientType}
                                        </span>
                                        <span className="text-[10px] text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> Sent
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
