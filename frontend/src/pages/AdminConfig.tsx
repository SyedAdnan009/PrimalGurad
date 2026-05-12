import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { adminAPI } from '@/services/api';
import type { Config } from '@/types/config';
import { 
  Settings, 
  Save, 
  Download, 
  Upload, 
  RefreshCw, 
  AlertTriangle,
  Shield,
  Globe,
  X,
  Plus
} from 'lucide-react';

const AdminConfig = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  // Form state for whitelist inputs
  const [newIp, setNewIp] = useState('');
  const [newDomain, setNewDomain] = useState('');

  const loadConfig = async () => {
    try {
      setLoading(true);
      const configData = await adminAPI.getConfig();
      setConfig(configData);
    } catch (error) {
      toast({
        title: 'Error loading configuration',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSaveConfig = async () => {
    if (!config) return;
    
    try {
      setSaving(true);
      await adminAPI.updateConfig(config);
      toast({
        title: 'Configuration saved',
        description: 'System configuration has been updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error saving configuration',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportConfig = async () => {
    try {
      const blob = await adminAPI.exportConfig();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `primalguard-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Configuration exported',
        description: 'Configuration file has been downloaded',
      });
    } catch (error) {
      toast({
        title: 'Error exporting configuration',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleImportConfig = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const importedConfig = await adminAPI.importConfig(file);
      setConfig(importedConfig);
      
      toast({
        title: 'Configuration imported',
        description: 'Configuration has been imported and updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error importing configuration',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const updateThreshold = (type: keyof Config['thresholds'], value: number) => {
    if (!config) return;
    setConfig({
      ...config,
      thresholds: {
        ...config.thresholds,
        [type]: value
      }
    });
  };

  const updateModule = (type: keyof Config['modules'], value: boolean) => {
    if (!config) return;
    setConfig({
      ...config,
      modules: {
        ...config.modules,
        [type]: value
      }
    });
  };

  const addIpToWhitelist = () => {
    if (!config || !newIp.trim()) return;
    
    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    if (!ipRegex.test(newIp.trim())) {
      toast({
        title: 'Invalid IP format',
        description: 'Please enter a valid IP address or CIDR notation',
        variant: 'destructive',
      });
      return;
    }

    setConfig({
      ...config,
      whitelist: {
        ...config.whitelist,
        ips: [...config.whitelist.ips, newIp.trim()]
      }
    });
    setNewIp('');
  };

  const removeIpFromWhitelist = (ip: string) => {
    if (!config) return;
    setConfig({
      ...config,
      whitelist: {
        ...config.whitelist,
        ips: config.whitelist.ips.filter(item => item !== ip)
      }
    });
  };

  const addDomainToWhitelist = () => {
    if (!config || !newDomain.trim()) return;
    
    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/;
    if (!domainRegex.test(newDomain.trim())) {
      toast({
        title: 'Invalid domain format',
        description: 'Please enter a valid domain name',
        variant: 'destructive',
      });
      return;
    }

    setConfig({
      ...config,
      whitelist: {
        ...config.whitelist,
        domains: [...config.whitelist.domains, newDomain.trim()]
      }
    });
    setNewDomain('');
  };

  const removeDomainFromWhitelist = (domain: string) => {
    if (!config) return;
    setConfig({
      ...config,
      whitelist: {
        ...config.whitelist,
        domains: config.whitelist.domains.filter(item => item !== domain)
      }
    });
  };

  if (loading || !config) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading configuration...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Settings className="w-8 h-8 text-primary" />
              <span>System Configuration</span>
            </h1>
            <p className="text-muted-foreground">
              Configure threat detection thresholds, whitelists, and security modules
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={loadConfig} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button variant="outline" onClick={handleExportConfig}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImportConfig}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={importing}
              />
              <Button variant="outline" disabled={importing}>
                <Upload className={`w-4 h-4 mr-2 ${importing ? 'animate-spin' : ''}`} />
                Import
              </Button>
            </div>
            
            <Button onClick={handleSaveConfig} disabled={saving}>
              <Save className={`w-4 h-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Threat Thresholds */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <span>Threat Detection Thresholds</span>
            </CardTitle>
            <CardDescription>
              Configure risk score thresholds for threat classification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="critical">Critical Threshold</Label>
                <Input
                  id="critical"
                  type="number"
                  min="1"
                  max="100"
                  value={config.thresholds.critical}
                  onChange={(e) => updateThreshold('critical', parseInt(e.target.value) || 0)}
                />
                <p className="text-sm text-muted-foreground">
                  Threats scoring {config.thresholds.critical}+ are classified as critical
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="high">High Threshold</Label>
                <Input
                  id="high"
                  type="number"
                  min="1"
                  max="100"
                  value={config.thresholds.high}
                  onChange={(e) => updateThreshold('high', parseInt(e.target.value) || 0)}
                />
                <p className="text-sm text-muted-foreground">
                  Threats scoring {config.thresholds.high}+ are classified as high
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="medium">Medium Threshold</Label>
                <Input
                  id="medium"
                  type="number"
                  min="1"
                  max="100"
                  value={config.thresholds.medium}
                  onChange={(e) => updateThreshold('medium', parseInt(e.target.value) || 0)}
                />
                <p className="text-sm text-muted-foreground">
                  Threats scoring {config.thresholds.medium}+ are classified as medium
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Whitelist Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* IP Whitelist */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-success" />
                <span>IP Whitelist</span>
              </CardTitle>
              <CardDescription>
                Trusted IP addresses and CIDR ranges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    placeholder="192.168.1.0/24 or 10.0.0.1"
                    onKeyPress={(e) => e.key === 'Enter' && addIpToWhitelist()}
                  />
                  <Button onClick={addIpToWhitelist} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {config.whitelist.ips.map((ip, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <code className="text-sm">{ip}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeIpFromWhitelist(ip)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Domain Whitelist */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-success" />
                <span>Domain Whitelist</span>
              </CardTitle>
              <CardDescription>
                Trusted domains and subdomains
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="example.com or trusted-site.org"
                    onKeyPress={(e) => e.key === 'Enter' && addDomainToWhitelist()}
                  />
                  <Button onClick={addDomainToWhitelist} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {config.whitelist.domains.map((domain, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <code className="text-sm">{domain}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDomainFromWhitelist(domain)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Modules */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-primary" />
              <span>Security Modules</span>
            </CardTitle>
            <CardDescription>
              Enable or disable specific threat detection modules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Phishing Detection</h4>
                  <p className="text-sm text-muted-foreground">
                    Detect phishing emails and malicious URLs
                  </p>
                </div>
                <Switch
                  checked={config.modules.phishing}
                  onCheckedChange={(checked) => updateModule('phishing', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Brute Force Protection</h4>
                  <p className="text-sm text-muted-foreground">
                    Monitor and block brute force attacks
                  </p>
                </div>
                <Switch
                  checked={config.modules.brute_force}
                  onCheckedChange={(checked) => updateModule('brute_force', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Malware Detection</h4>
                  <p className="text-sm text-muted-foreground">
                    Scan for malware signatures and behavior
                  </p>
                </div>
                <Switch
                  checked={config.modules.malware}
                  onCheckedChange={(checked) => updateModule('malware', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminConfig;