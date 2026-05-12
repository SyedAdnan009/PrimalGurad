//frontend/src/pages/Dashboard.tsx
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useThreatStore } from '@/stores/threatStore';
import { subscribeToThreats } from "@/services/threats";
import { Layout } from '@/components/Layout';
import { ThreatFiltersPanel } from '@/components/ThreatFiltersPanel';
import { ThreatDetailsDrawer } from '@/components/ThreatDetailsDrawer';
import { ThreatKPICards } from '@/components/ThreatKPICards';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Activity, 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  FileText,
  Calendar,
  Clock,
  Download,
  Play,
  Pause,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  ShieldCheck,
  Flag
} from 'lucide-react';
import { format } from 'date-fns';
import type { Threat, ThreatFilters } from '@/types/threats';
import { threatsAPI, fpAPI, type FPReport } from '@/services/api';

const Dashboard = () => {
  
  const { user, role } = useAuthStore();
  const { threats, stats, isConnected } = useThreatStore();
  
  // State for filters and pagination
  const [filters, setFilters] = useState<ThreatFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [filteredThreats, setFilteredThreats] = useState<Threat[]>([]);
  const [totalThreats, setTotalThreats] = useState(0);
  const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // False Positives State
  const [fpReports, setFpReports] = useState<FPReport[]>([]);

  // Fetch threats when filters change
  useEffect(() => {
    const fetchThreats = async () => {
      try {
        const response = await threatsAPI.getThreats({
          ...filters,
          page: currentPage,
          limit: pageSize
        });
        setFilteredThreats(response.threats);
        setTotalThreats(response.total);
      } catch (e) {
        console.error("Failed to fetch threats");
      }
    };
    fetchThreats();
  }, [filters, currentPage, pageSize]);

  // Fetch false positives on mount
  useEffect(() => {
    const fetchFP = async () => {
      try {
        const fps = await fpAPI.getReported();
        setFpReports(fps);
      } catch (e) {
        console.error("Failed to fetch false positives");
      }
    };
    fetchFP();
    
    // Auto-refresh FP every 10s since it's just HTTP
    const interval = setInterval(fetchFP, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleFpAction = async (url: string, action: "resolve" | "whitelist") => {
    try {
      await fpAPI.action(url, action);
      // Optimistically update UI
      setFpReports(prev => prev.map(report => 
        report.url === url ? { ...report, status: "resolved" } : report
      ));
    } catch (e) {
      console.error("Failed FP action", e);
    }
  };



  // Real-time WebSocket updates
useEffect(() => {
  const unsubscribe = subscribeToThreats((newThreat) => {

    // 🔥 Add to global threat store (fixes graph + KPIs)
    useThreatStore.getState().addThreat(newThreat);

    // 🔥 Update table display
    setFilteredThreats((prev) => [newThreat, ...prev]);
    setTotalThreats((prev) => prev + 1);
  });

  return () => unsubscribe();
}, []);



  const totalPages = Math.ceil(totalThreats / pageSize);

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    return `Good ${timeOfDay}, ${user?.username}!`;
  };

  const getRoleCapabilities = () => {
    switch (role) {
      case 'admin':
        return ['Full System Access', 'User Management', 'Configuration', 'All Reports'];
      case 'analyst':
        return ['Threat Analysis', 'Report Creation', 'Data Investigation', 'Limited Config'];
      case 'viewer':
        return ['View Reports', 'Basic Dashboards', 'Read-Only Access'];
      default:
        return [];
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

  const exportToCSV = () => {
    const csvContent = [
      ['ID', 'Timestamp', 'Source', 'Type', 'Severity', 'Status', 'Confidence', 'Summary'].join(','),
      ...filteredThreats.map(threat => [
        threat.id,
        threat.timestamp,
        threat.source,
        threat.type,
        threat.severity,
        threat.status,
        threat.confidence.toFixed(2),
        `"${threat.summary}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threats_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleRowClick = (threat: Threat) => {
    setSelectedThreat(threat);
    setIsDrawerOpen(true);
  };

  const handleFiltersChange = (newFilters: ThreatFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold">{getWelcomeMessage()}</h1>
            <p className="text-muted-foreground">
              Welcome to your PrimalGuard dashboard. Here's your threat intelligence overview.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant="outline" className="px-3 py-1">
              <Activity className="w-4 h-4 mr-2" />
              Role: {role}
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              <Clock className="w-4 h-4 mr-2" />
              Last login: {new Date().toLocaleDateString()}
            </Badge>
            <Badge variant={isConnected ? "default" : "destructive"} className="px-3 py-1">
              {isConnected ? <Wifi className="w-4 h-4 mr-2" /> : <WifiOff className="w-4 h-4 mr-2" />}
              {isConnected ? 'Live Feed Active' : 'Disconnected'}
            </Badge>
          </div>
        </div>

        {/* KPI Cards and Chart */}
        <ThreatKPICards />

        {/* Role Capabilities */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Your Access Level</span>
            </CardTitle>
            <CardDescription>
              Based on your role as <strong>{role}</strong>, you have access to the following capabilities:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {getRoleCapabilities().map((capability, index) => (
                <Badge key={index} variant="secondary" className="justify-center py-2">
                  {capability}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Threat Filters */}
        <ThreatFiltersPanel 
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />

        {/* False Positives Workflow */}
        <Card className="shadow-card border-amber-500/20">
          <CardHeader className="bg-amber-500/5">
            <CardTitle className="flex items-center space-x-2 text-amber-600 dark:text-amber-500">
              <Flag className="w-5 h-5" />
              <span>False Positives Queue</span>
            </CardTitle>
            <CardDescription>
              Reported false positives currently pending review
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {fpReports.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Flag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No false positive reports</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time Reported</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fpReports.map((fp, i) => (
                    <TableRow key={fp.id || i}>
                      <TableCell className="font-medium max-w-[250px] truncate" title={fp.url}>{fp.url}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{fp.type}</Badge></TableCell>
                      <TableCell>{(fp.confidence * 100).toFixed(1)}%</TableCell>
                      <TableCell>
                        <Badge variant={fp.status === "pending" ? "default" : "secondary"}>
                          {fp.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{new Date(fp.timestamp).toLocaleString()}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          disabled={fp.status === "resolved"}
                          onClick={() => handleFpAction(fp.url, "resolve")}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" /> Resolve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="default"
                          disabled={fp.status === "resolved"}
                          onClick={() => handleFpAction(fp.url, "whitelist")}
                        >
                          <ShieldCheck className="w-3 h-3 mr-1" /> Whitelist
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Threat Feed */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Enhanced Threat Feed</span>
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button onClick={exportToCSV} variant="outline" size="sm" disabled={filteredThreats.length === 0}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
            <CardDescription>
              Advanced threat detection with filtering and real-time analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredThreats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No threats found</p>
                <p className="text-sm">Adjust your filters or start the threat feed to see detections</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredThreats.map((threat) => (
                      <TableRow 
                        key={threat.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(threat)}
                      >
                        <TableCell className="font-medium max-w-[200px] truncate" title={threat.source}>
                          {threat.source}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {(threat.type || "").replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getSeverityColor(threat.severity)} className="capitalize">
                            {threat.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(threat.status)} className="capitalize">
                            {threat.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{(threat.confidence * 100).toFixed(1)}%</TableCell>
                        <TableCell className="text-muted-foreground">
                          {threat.assigned_to || 'Unassigned'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                         {threat.timestamp ? format(new Date(threat.timestamp), 'MM/dd HH:mm') : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalThreats)} of {totalThreats} threats
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Threat Details Drawer */}
        <ThreatDetailsDrawer
          threat={selectedThreat}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />
      </div>
    </Layout>
  );
};

export default Dashboard;