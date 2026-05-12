import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, User, FileText, Activity, AlertTriangle, Brain, Bot, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { threatsAPI, adminAPI, mlAPI, aiAPI, type AiAnalysisResponse } from '@/services/api';
import { useThreatStore } from '@/stores/threatStore';
import type { ThreatExplanation } from '@/types/ml';
import type { Threat, ThreatStatus } from '@/types/threats';

interface ThreatDetailsDrawerProps {
  threat: Threat | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ThreatDetailsDrawer = ({ threat, isOpen, onClose }: ThreatDetailsDrawerProps) => {
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [explanation, setExplanation] = useState<ThreatExplanation | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  // AI Assistant State
  const [aiResult, setAiResult] = useState<AiAnalysisResponse | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const { updateThreat } = useThreatStore();

  // Reset state when threat changes
  useEffect(() => {
    if (threat && isOpen) {
      loadExplanation();
      setAiResult(null); // Clear previous AI result
    }
  }, [threat?.id, isOpen]);

  const loadExplanation = async () => {
    if (!threat) return;
    
    setLoadingExplanation(true);
    try {
      const exp = await mlAPI.explainThreat(threat.id);
      setExplanation(exp);
    } catch (error) {
      // Explanation is optional, don't show error toast
      setExplanation(null);
    } finally {
      setLoadingExplanation(false);
    }
  };

  const handleAiAnalysis = async () => {
    if (!threat) return;
    setIsAiLoading(true);
    setAiResult(null);
    try {
      // url might be in details, or source or fallback to unknown
      const urlToAnalyze = (threat.details as Record<string, string>)?.url || threat.source || "unknown";
      const result = await aiAPI.analyze({
        url: urlToAnalyze,
        type: threat.type,
        confidence: threat.confidence
      });
      setAiResult(result);
    } catch (e) {
      setAiResult({ reason: "AI analysis unavailable. Please review manually.", recommendation: "Review Needed" });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAssign = async (assignedTo: string) => {
    if (!threat) return;
    
    setIsAssigning(true);
    try {
      const updatedThreat = await threatsAPI.assignThreat(threat.id, { assigned_to: assignedTo });
      updateThreat(threat.id, updatedThreat);
      toast({
        title: 'Threat Assigned',
        description: `Successfully assigned to ${assignedTo}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign threat',
        variant: 'destructive',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleStatusChange = async (status: ThreatStatus) => {
    if (!threat) return;
    
    setIsUpdatingStatus(true);
    try {
      const updatedThreat = await threatsAPI.updateThreatStatus(threat.id, { status });
      updateThreat(threat.id, updatedThreat);
      toast({
        title: 'Status Updated',
        description: `Status changed to ${status}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'destructive';
      case 'investigating': return 'default';
      case 'resolved': return 'secondary';
      default: return 'outline';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'created': return <AlertTriangle className="w-4 h-4" />;
      case 'assignment': return <User className="w-4 h-4" />;
      case 'status_change': return <Activity className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (!threat) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:w-[700px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <SheetTitle className="text-lg font-semibold">Threat Details</SheetTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant={getSeverityColor(threat.severity)} className="capitalize">
                {threat.severity}
              </Badge>
              <Badge variant={getStatusColor(threat.status)} className="capitalize">
                {threat.status}
              </Badge>
            </div>
          </div>
          <SheetDescription className="text-sm text-muted-foreground">
            {threat.summary}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Assign to Analyst</label>
                  <Select onValueChange={handleAssign} disabled={isAssigning}>
                    <SelectTrigger>
                      <SelectValue placeholder={threat.assigned_to || "Unassigned"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="analyst">Analyst</SelectItem>
                      <SelectItem value="senior_analyst">Senior Analyst</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select 
                    value={threat.status} 
                    onValueChange={(value) => handleStatusChange(value as ThreatStatus)}
                    disabled={isUpdatingStatus}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Suggestion */}
          <Card className="border-primary/20 bg-primary/[0.04]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2 text-primary">
                    <Bot className="w-4 h-4" />
                    AI Assistant
                  </CardTitle>
                  <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-widest font-semibold">
                    Advisory only
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 text-xs shrink-0 hover:bg-primary/5 hover:border-primary/30"
                  onClick={handleAiAnalysis}
                  disabled={isAiLoading}
                >
                  {isAiLoading ? (
                    <span className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      Analyzing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-primary" /> Analyze</span>
                  )}
                </Button>
              </div>
            </CardHeader>
            {aiResult && (
              <CardContent className="space-y-3 pt-0 animate-in fade-in slide-in-from-top-1">
                <div className="space-y-3">
                  <div className="text-sm bg-background/50 p-3 rounded-md border border-primary/10">
                    <span className="font-semibold text-foreground/80 block mb-1">Reason:</span>
                    <span className="text-muted-foreground text-[13px] leading-relaxed">{aiResult.reason}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm pt-1">
                    <span className="font-semibold text-foreground/80">Recommendation:</span>
                    <Badge variant="outline" className={`
                      font-medium px-2 py-0.5
                      ${aiResult.recommendation === "Likely Safe" ? "text-green-500 border-green-500/30 bg-green-500/10" : ""}
                      ${aiResult.recommendation === "Review Needed" ? "text-amber-500 border-amber-500/30 bg-amber-500/10" : ""}
                      ${aiResult.recommendation === "High Risk" ? "text-red-500 border-red-500/30 bg-red-500/10" : ""}
                    `}>
                      {aiResult.recommendation}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Threat Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Threat Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">ID:</span> {threat.id}
                </div>
                <div>
                  <span className="font-medium">Type:</span> {threat.type.replace('_', ' ')}
                </div>
                <div>
                  <span className="font-medium">Source:</span> {threat.source}
                </div>
                <div>
                  <span className="font-medium">Confidence:</span> {(threat.confidence * 100).toFixed(1)}%
                </div>
                <div>
                  <span className="font-medium">Detected:</span> {format(new Date(threat.timestamp), 'PPp')}
                </div>
                <div>
                  <span className="font-medium">Assigned:</span> {threat.assigned_to || 'Unassigned'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {threat.events?.map((event, index) => (
                  <div key={event.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium capitalize">
                          {event.type.replace('_', ' ')}
                        </p>
                        <time className="text-xs text-muted-foreground">
                          {format(new Date(event.timestamp), 'MMM d, HH:mm')}
                        </time>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {event.details.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        by {event.actor}
                      </p>
                    </div>
                  </div>
                )) || (
                  <p className="text-sm text-muted-foreground">No timeline events available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ML Explanation */}
          {(explanation || loadingExplanation) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center">
                  <Brain className="w-4 h-4 mr-2" />
                  ML Explanation
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingExplanation ? (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Loading explanation...</span>
                  </div>
                ) : explanation ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Model:</span> {explanation.model_used}
                      </div>
                      <div>
                        <span className="font-medium">Prediction:</span> {explanation.prediction}
                      </div>
                      <div>
                        <span className="font-medium">Confidence:</span> {(explanation.confidence * 100).toFixed(1)}%
                      </div>
                      <div>
                        <span className="font-medium">Generated:</span> {format(new Date(explanation.created_at), 'MMM d, HH:mm')}
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-3">Feature Contributions</h4>
                      <div className="space-y-2">
                        {explanation.features.map((feature, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex-1">
                              <span className="font-medium">{feature.feature.replace('_', ' ')}</span>
                              <span className="text-muted-foreground ml-2">
                                ({typeof feature.value === 'boolean' ? (feature.value ? 'Yes' : 'No') : feature.value})
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-muted rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full" 
                                  style={{ width: `${Math.abs(feature.contribution) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs w-8 text-right">
                                {(feature.contribution * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Raw Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Raw Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                {JSON.stringify(threat.details, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
};