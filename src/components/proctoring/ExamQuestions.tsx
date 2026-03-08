
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Question } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

const EXAM_DURATION_MINUTES = 15;

export default function ExamQuestions({ isExamActive }: { isExamActive: boolean }) {
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_MINUTES * 60);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const questionsQuery = useMemoFirebase(() => 
    firestore && user ? collection(firestore, 'questions') : null,
    [firestore, user]
  );
  const { data: questions, isLoading: isLoadingQuestions } = useCollection<Question>(questionsQuery);

  useEffect(() => {
    if (!isExamActive || timeLeft <= 0 || submitted) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isExamActive, timeLeft, submitted]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!user || !firestore || !questions || questions.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not submit exam. Questions not loaded or user not found.' });
      return;
    }
    setIsSubmitting(true);
    let correctAnswers = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.answer) {
        correctAnswers++;
      }
    });

    const score = Math.round((correctAnswers / questions.length) * 100);

    const userDocRef = doc(firestore, 'users', user.uid);
    try {
      await updateDoc(userDocRef, {
        examScore: score,
        examSubmitted: true,
      });
      setSubmitted(true);
      toast({
        title: 'Exam Submitted!',
        description: `Your final score is ${score}/100.`,
      });
    } catch (error: any) {
      console.error("Error submitting exam:", error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || 'There was an error submitting your exam.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Demo Exam Questions</CardTitle>
        <div className="text-lg font-mono font-semibold bg-primary text-primary-foreground px-3 py-1 rounded-md">
          {formatTime(timeLeft)}
        </div>
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="pr-6">
          <div className="space-y-6">
            {isLoadingQuestions ? (
              <div className="space-y-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-5 w-3/4 mb-3" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : questions && questions.length > 0 ? (
              questions.map((q, index) => (
                <div key={q.id}>
                  <p className="font-medium mb-3">{index + 1}. {q.text}</p>
                  <RadioGroup onValueChange={(value) => handleAnswerChange(q.id, value)} disabled={!isExamActive || submitted || isSubmitting}>
                    {q.options.map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`${q.id}-${option}`} />
                        <Label htmlFor={`${q.id}-${option}`}>{option}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))
            ) : (
                <div className="flex items-center justify-center h-full py-20 text-muted-foreground">
                    <p>No exam questions available. Please contact an administrator.</p>
                </div>
            )}
          </div>
        </CardContent>
      </ScrollArea>
      <CardFooter>
        <Button className="w-full" onClick={handleSubmit} disabled={!isExamActive || isSubmitting || submitted || isLoadingQuestions || !questions || questions.length === 0}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? 'Submitting...' : submitted ? 'Submitted' : 'Submit Exam'}
        </Button>
      </CardFooter>
    </Card>
  );
}
