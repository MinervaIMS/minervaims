import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, FileText, Upload } from 'lucide-react';
import { divisionLabels, fundLabels, activeFunds, inactiveFunds, Division, Fund } from '@/lib/types';

interface ArchiveFile {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  date: string;
  division: string;
  fund: string | null;
  created_at: string;
  updated_at: string;
}

const FileManagement = () => {
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<ArchiveFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    file_url: '',
    date: '',
    division: '' as Division | '',
    fund: '' as Fund | '',
  });
  const { toast } = useToast();

  const adminToken = sessionStorage.getItem('adminToken');

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('archive_files')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        title: "Error",
        description: "Failed to fetch archive files",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      file_url: '',
      date: '',
      division: '',
      fund: '',
    });
    setEditingFile(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (file: ArchiveFile) => {
    setEditingFile(file);
    setFormData({
      title: file.title,
      description: file.description || '',
      file_url: file.file_url,
      date: file.date,
      division: file.division as Division,
      fund: (file.fund as Fund) || '',
    });
    setIsDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Error",
        description: "Only PDF files are allowed",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const { data, error } = await supabase.storage
        .from('archive-files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('archive-files')
        .getPublicUrl(data.path);

      setFormData({ ...formData, file_url: urlData.publicUrl });
      
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.date || !formData.division || !formData.file_url) {
      toast({
        title: "Error",
        description: "Title, date, division, and file are required",
        variant: "destructive",
      });
      return;
    }

    if (formData.division === 'portfolio' && !formData.fund) {
      toast({
        title: "Error",
        description: "Fund is required for Portfolio Management division",
        variant: "destructive",
      });
      return;
    }

    try {
      const action = editingFile ? 'update' : 'create';
      
      const fileData = {
        title: formData.title,
        description: formData.description || null,
        file_url: formData.file_url,
        date: formData.date,
        division: formData.division,
        fund: formData.division === 'portfolio' ? formData.fund : null,
        ...(editingFile && { id: editingFile.id }),
      };

      const { data, error } = await supabase.functions.invoke('admin-files', {
        body: { action, file: fileData },
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `File ${editingFile ? 'updated' : 'created'} successfully`,
      });

      setIsDialogOpen(false);
      resetForm();
      fetchFiles();
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "Error",
        description: "Failed to save file",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const { data, error } = await supabase.functions.invoke('admin-files', {
        body: { action: 'delete', file: { id: fileId } },
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "File deleted successfully",
      });

      fetchFiles();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return <p className="font-body text-muted-foreground">Loading files...</p>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-serif text-heading">Archive Files</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="font-body">
              <Plus className="h-4 w-4 mr-2" />
              Add File
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif">
                {editingFile ? 'Edit File' : 'Add New File'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="font-body">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Report title"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date" className="font-body">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="division" className="font-body">Division *</Label>
                <Select
                  value={formData.division}
                  onValueChange={(value: Division) => setFormData({ ...formData, division: value, fund: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(divisionLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.division === 'portfolio' && (
                <div className="space-y-2">
                  <Label htmlFor="fund" className="font-body">Fund *</Label>
                  <Select
                    value={formData.fund}
                    onValueChange={(value: Fund) => setFormData({ ...formData, fund: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fund" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__active_label__" disabled className="font-semibold text-muted-foreground">
                        Active Funds
                      </SelectItem>
                      {activeFunds.map((fund) => (
                        <SelectItem key={fund} value={fund}>
                          {fundLabels[fund]}
                        </SelectItem>
                      ))}
                      <SelectItem value="__inactive_label__" disabled className="font-semibold text-muted-foreground mt-2">
                        Inactive Funds
                      </SelectItem>
                      {inactiveFunds.map((fund) => (
                        <SelectItem key={fund} value={fund}>
                          {fundLabels[fund]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="file" className="font-body">PDF File *</Label>
                <div className="flex gap-2">
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="flex-1"
                  />
                </div>
                {formData.file_url && (
                  <p className="text-sm text-muted-foreground truncate">
                    <FileText className="inline h-4 w-4 mr-1" />
                    File uploaded
                  </p>
                )}
                {isUploading && (
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="font-body">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the report"
                  rows={3}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1 font-body" disabled={isUploading}>
                  {editingFile ? 'Update File' : 'Create File'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="font-body"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Files List */}
      {files.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-body text-muted-foreground">
              No archive files yet. Click "Add File" to upload one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {files.map((file) => (
            <Card key={file.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-body text-sm text-muted-foreground">
                        {formatDate(file.date)}
                      </span>
                      <span className="font-body text-xs px-2 py-0.5 bg-muted rounded">
                        {divisionLabels[file.division as Division]}
                      </span>
                      {file.fund && (
                        <span className="font-body text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                          {fundLabels[file.fund as Fund]}
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif text-lg font-medium truncate">{file.title}</h3>
                    {file.description && (
                      <p className="font-body text-sm text-muted-foreground line-clamp-2 mt-1">
                        {file.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditDialog(file)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(file.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileManagement;