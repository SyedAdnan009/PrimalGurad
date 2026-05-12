import { Layout } from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { Shield, Users, Brain, ChevronRight, AlertTriangle } from 'lucide-react';

const Admin = () => {
  return (
    <Layout>
      <div className="space-y-8">
        
        {/* Header */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Shield className="w-8 h-8 text-primary" />
              <span>Admin Dashboard</span>
            </h1>
            <p className="text-muted-foreground">
              System administration and user management for PrimalGuard platform
            </p>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Administrator Access:</strong> You have full system privileges. Use with caution.
            </AlertDescription>
          </Alert>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Users */}
          <Link to="/admin/users">
            <Card className="shadow-card hover:shadow-elevated transition-all cursor-pointer group">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="w-6 h-6 text-primary" />
                    <span>User Management</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                </CardTitle>
                <CardDescription>
                  Create users, change roles, reset passwords
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          {/* ML Models */}
          <Link to="/admin/models">
            <Card className="shadow-card hover:shadow-elevated transition-all cursor-pointer group">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Brain className="w-6 h-6 text-primary" />
                    <span>ML Models</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                </CardTitle>
                <CardDescription>
                  Upload and activate AutoML threat models
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

        </div>

      </div>
    </Layout>
  );
};

export default Admin;
