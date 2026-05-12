import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, Shield, Database, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { intelAPI } from '@/services/api';
import type { IntelFeedStatus, IntelImportResult } from '@/types/ml';
import { format } from 'date-fns';

export const AdminIntel = () => {
  const [status, setStatus] = useState<IntelFeedStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState<{ [key: string]: boolean }>({});

  const loadStatus = async () => {
    try {
      const response = await intelAPI.getStatus();
      setStatus(response);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load intelligence feed status',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleFileImport = async (type: 'abuseipdb' | 'hashes', file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Invalid file',
        description: 'Please select a CSV file',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(prev => ({ ...prev, [type]: true }));
    try {
      let result: IntelImportResult;
      if (type === 'abuseipdb') {
        result = await intelAPI.importAbuseIPDB(file);
      } else {
        result = await intelAPI.importBlacklistHashes(file);
      }

      toast({
        title: 'Import completed',
        description: `Imported ${result.imported} items, ${result.duplicates} duplicates, ${result.errors} errors`,
      });
      loadStatus();
    } catch (error) {
      toast({
        title: 'Import failed',
        description: `Failed to import ${type} data`,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleFileSelect = (type: 'abuseipdb' | 'hashes') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileImport(type, file);
      }
    };
    input.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Shield className="w-8 h-8 mx-auto mb-4 animate-pulse" />
          <p>Loading intelligence feeds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Threat Intelligence</h1>
        <p className="text-muted-foreground">Manage external threat intelligence feeds and blacklists</p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abuse IP Database</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.abuse_ips.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Known malicious IPs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blacklist Hashes</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.blacklist_hashes.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Malware file hashes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Domain Blacklist</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.blacklist_domains.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Malicious domains</p>
          </CardContent>
        </Card>
      </div>

      {/* Import Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              AbuseIPDB Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Import IP addresses from AbuseIPDB export. Expected format: CSV with 'ip' column.
            </p>
            <Button
              onClick={() => handleFileSelect('abuseipdb')}
              disabled={isImporting.abuseipdb}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isImporting.abuseipdb ? 'Importing...' : 'Import CSV'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Malware Hashes Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Import malware file hashes. Expected format: CSV with 'hash' column.
            </p>
            <Button
              onClick={() => handleFileSelect('hashes')}
              disabled={isImporting.hashes}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isImporting.hashes ? 'Importing...' : 'Import CSV'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Last Updated */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Feed Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last updated:</span>
              <Badge variant="outline">
                {format(new Date(status.last_updated), 'PPp')}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};