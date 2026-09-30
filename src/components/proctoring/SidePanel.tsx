
"use client";

import React from 'react';
import { Gauge, Bell, Cpu, Eye, Smartphone, Mic, Users, Search, PackageX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { ProctoringState, Alert, ModuleStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { useUser } from '@/firebase';

const getScoreColor = (score: number) => {
  if (score > 70) return 'text-destructive';
  if (score > 30) return 'text-yellow-400';
  return 'text-secondary';
};

const getModuleStatusConfig = (status: ModuleStatus) => {
    switch (status) {
        case 'ACTIVE': return { text: 'ACTIVE', className: 'bg-green-500/20 text-green-400' };
        case 'INACTIVE': return { text: 'INACTIVE', className: 'bg-red-500/20 text-red-400' };
        case 'SIMULATED': return { text: 'SIMULATED', className: 'bg-yellow-500/20 text-yellow-400' };
    }
}

interface SidePanelProps extends ProctoringState {
    examSessionId: string | null;
}

export default function SidePanel(props: SidePanelProps) {
  const { suspicionScore, faceCount, gazeScore, objectCount, audioEvents, modules, examSessionId } = props;

  const { user } = useUser();
  const firestore = useFirestore();

  const alertsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !examSessionId) return null;
    return query(
      collection(firestore, 'users', user.uid, 'examSessions', examSessionId, 'proctoringEvents'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
  }, [firestore, user, examSessionId]);

  const { data: alerts, isLoading: isLoadingAlerts } = useCollection<Alert>(alertsQuery);

  const formatTimestamp = (isoString: string) => {
      try {
        const date = new Date(isoString);
        return new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZoneName: 'short'
        }).format(date);
      } catch (e) {
          return "Invalid time"
      }
  }


  return (
    <ScrollArea className="h-full max-h-[calc(100vh-10rem)] lg:max-h-full">
      <div className="flex flex-col gap-6 pr-4">
        <Card className="text-center bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-base font-medium text-muted-foreground">
              <Gauge className="w-5 h-5" />
              SUSPICION SCORE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <motion.div
                key={suspicionScore}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5 }}
                className={`text-6xl font-bold ${getScoreColor(suspicionScore)}`}
            >
              {suspicionScore}%
            </motion.div>
            <p className="text-xs text-muted-foreground mt-2">LOWER IS BETTER</p>
          </CardContent>
        </Card>

        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
            <Bell className="w-6 h-6 text-primary animate-pulse" /> Recent Alerts
          </h3>
          <div className="space-y-3 h-64 flex flex-col overflow-hidden">
            <AnimatePresence initial={false}>
              {alerts && alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, y: 50, scale: 0.3 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                  className={cn("p-3 rounded-md border-l-4", 
                    alert.type === 'info' ? 'bg-blue-500/10 border-blue-500' : 'bg-yellow-500/10 border-yellow-500'
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col pr-2">
                      <p className="text-sm font-medium">{alert.message}</p>
                      {alert.scoreImpact > 0 && (
                        <span className="text-xs font-semibold text-destructive mt-1">
                          Suspicion: +{alert.scoreImpact}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTimestamp(alert.timestamp)}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {!isLoadingAlerts && (!alerts || alerts.length === 0) && (
                <p className="text-sm text-center text-muted-foreground pt-10">No alerts recorded yet.</p>
            )}
          </div>
        </div>
        
        <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
                <Cpu className="w-6 h-6 text-primary" /> AI Modules Status
            </h3>
            <div className="space-y-2">
                {[
                    { name: 'Face & Gaze Tracking', icon: <Eye />, status: modules.face },
                    { name: 'Object Detection', icon: <Smartphone />, status: modules.object },
                    { name: 'Audio Analysis', icon: <Mic />, status: modules.audio },
                    { name: 'Multiple People', icon: <Users />, status: modules.multiplePeople },
                ].map(module => {
                    const statusConfig = getModuleStatusConfig(module.status);
                    return (
                        <div key={module.name} className="flex justify-between items-center bg-card/50 p-3 rounded-md">
                            <div className="flex items-center gap-3">
                                {React.cloneElement(module.icon, { className: 'w-5 h-5 text-muted-foreground' })}
                                <span className="text-sm font-medium">{module.name}</span>
                            </div>
                            <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>{statusConfig.text}</Badge>
                        </div>
                    );
                })}
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            {[
                { label: 'Faces Detected', value: faceCount, icon: <Users /> },
                { label: 'Gaze on Screen', value: `${gazeScore}%`, icon: <Search /> },
                { label: 'Objects Found', value: objectCount, icon: <PackageX /> },
                { label: 'Audio Events', value: audioEvents, icon: <Mic /> }
            ].map(stat => (
                 <Card key={stat.label} className="text-center bg-card/50">
                    <CardContent className="p-4">
                        <div className="flex justify-center items-center mb-2 text-muted-foreground">{React.cloneElement(stat.icon, {className: 'w-6 h-6'})}</div>
                        <div className="text-2xl font-bold text-secondary">{stat.value}</div>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
      </div>
    </ScrollArea>
  );
}
