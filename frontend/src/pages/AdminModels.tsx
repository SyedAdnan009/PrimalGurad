import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, CheckCircle, Circle, Brain, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { mlAPI } from '@/services/api';
import type { MLModel } from '@/types/ml';
import { format } from 'date-fns';
import { Layout } from '@/components/Layout';


export const AdminModels = () => {
  const [models, setModels] = useState<MLModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    file: null as File | null,
  });

  const loadModels = async () => {
    try {
      const response = await mlAPI.getModels();
      setModels(response);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load models',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.pkl')) {
        toast({
          title: 'Invalid file',
          description: 'Please select a .pkl file',
          variant: 'destructive',
        });
        return;
      }
      setUploadForm(prev => ({ ...prev, file }));
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.name || !uploadForm.file) {
      toast({
        title: 'Missing information',
        description: 'Please provide a name and select a file',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      await mlAPI.uploadModel(uploadForm.name, uploadForm.file);
      toast({
        title: 'Model uploaded',
        description: 'Model has been uploaded successfully',
      });
      setIsUploadDialogOpen(false);
      setUploadForm({ name: '', file: null });
      loadModels();
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload model',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleActivate = async (modelId: string) => {
    try {
      await mlAPI.activateModel(modelId);
      toast({
        title: 'Model activated',
        description: 'Model has been set as active',
      });
      loadModels();
    } catch (error) {
      toast({
        title: 'Activation failed',
        description: 'Failed to activate model',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Brain className="w-8 h-8 mx-auto mb-4 animate-pulse" />
          <p>Loading models...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">ML Models</h1>
          <p className="text-muted-foreground">Manage machine learning models for threat detection</p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Upload Model
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload ML Model</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="model-name">Model Name</Label>
                <Input
                  id="model-name"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter model name"
                />
              </div>
              <div>
                <Label htmlFor="model-file">Model File (.pkl)</Label>
                <Input
                  id="model-file"
                  type="file"
                  accept=".pkl"
                  onChange={handleFileChange}
                />
                {uploadForm.file && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Selected: {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                  </p>
                )}
              </div>
              <Button 
                onClick={handleUpload} 
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? 'Uploading...' : 'Upload Model'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="w-5 h-5 mr-2" />
            Model Registry
          </CardTitle>
        </CardHeader>
        <CardContent>
          {models.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No models uploaded yet</p>
              <p className="text-sm text-muted-foreground">Upload your first ML model to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>File Size</TableHead>
                  <TableHead>Accuracy</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell>
                      {model.active ? (
                        <Badge variant="default" className="flex items-center w-fit">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center w-fit">
                          <Circle className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    <TableCell>{formatFileSize(model.file_size)}</TableCell>
                    <TableCell>
                      {model.accuracy ? `${(model.accuracy * 100).toFixed(1)}%` : 'N/A'}
                    </TableCell>
                    <TableCell>{format(new Date(model.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      {!model.active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivate(model.id)}
                        >
                          Activate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
    </div>
    </Layout>
  );
};