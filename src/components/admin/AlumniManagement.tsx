import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Search, Loader2 } from 'lucide-react';
import linkedinIcon from '@/assets/linkedin-icon.png';
import { Progress } from '@/components/ui/progress';

interface AlumniRecord {
  id: string;
  name: string;
  surname: string;
  graduation_year: number;
  company: string;
  city: string | null;
  linkedin_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function AlumniManagement() {
  const [alumni, setAlumni] = useState<AlumniRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAlumni, setEditingAlumni] = useState<AlumniRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    graduation_year: new Date().getFullYear(),
    company: '',
    city: '',
    linkedin_url: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAlumni();
  }, []);

  const fetchAlumni = async () => {
    try {
      const { data, error } = await supabase
        .from('alumni')
        .select('*')
        .order('graduation_year', { ascending: false })
        .order('surname', { ascending: true });

      if (error) throw error;
      setAlumni(data || []);
    } catch (error) {
      console.error('Error fetching alumni:', error);
      toast({
        title: "Error",
        description: "Failed to fetch alumni",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      surname: '',
      graduation_year: new Date().getFullYear(),
      company: '',
      city: '',
      linkedin_url: '',
    });
    setEditingAlumni(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (record: AlumniRecord) => {
    setEditingAlumni(record);
    setFormData({
      name: record.name,
      surname: record.surname,
      graduation_year: record.graduation_year,
      company: record.company,
      city: record.city || '',
      linkedin_url: record.linkedin_url || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.name.trim() || !formData.surname.trim() || !formData.company.trim()) {
      toast({
        title: "Error",
        description: "Name, surname, and company are required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const action = editingAlumni ? 'update' : 'create';
    
    const alumniData = {
      name: formData.name.trim(),
      surname: formData.surname.trim(),
      graduation_year: formData.graduation_year,
      company: formData.company.trim(),
      city: formData.city.trim() || null,
      linkedin_url: formData.linkedin_url.trim() || null,
      ...(editingAlumni && { id: editingAlumni.id }),
    };

    // Optimistic update
    const tempId = editingAlumni?.id || crypto.randomUUID();
    const optimisticRecord: AlumniRecord = {
      id: tempId,
      ...alumniData,
      city: alumniData.city,
      linkedin_url: alumniData.linkedin_url,
      created_at: editingAlumni?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (editingAlumni) {
      setAlumni(prev => prev.map(a => a.id === editingAlumni.id ? optimisticRecord : a));
    } else {
      setAlumni(prev => [optimisticRecord, ...prev]);
    }
    
    setIsDialogOpen(false);
    resetForm();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('admin-alumni', {
        body: { action, alumni: alumniData },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error || data?.error) {
        // Revert optimistic update
        fetchAlumni();
        toast({
          title: "Error",
          description: data?.error || "Failed to save alumni",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Success", description: `Alumni ${editingAlumni ? 'updated' : 'created'} successfully` });
      // Refresh to get real data
      fetchAlumni();
    } catch (error) {
      console.error('Submit error:', error);
      fetchAlumni();
      toast({ title: "Error", description: "Failed to save alumni", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (alumniId: string) => {
    if (!confirm('Are you sure you want to delete this alumni?')) return;

    // Optimistic delete
    const previousAlumni = alumni;
    setAlumni(prev => prev.filter(a => a.id !== alumniId));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('admin-alumni', {
        body: { action: 'delete', alumni: { id: alumniId } },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error || data?.error) {
        setAlumni(previousAlumni);
        toast({ title: "Error", description: data?.error || "Failed to delete alumni", variant: "destructive" });
        return;
      }

      toast({ title: "Success", description: "Alumni deleted successfully" });
    } catch (error) {
      console.error('Delete error:', error);
      setAlumni(previousAlumni);
      toast({ title: "Error", description: "Failed to delete alumni", variant: "destructive" });
    }
  };

  const filteredAlumni = alumni.filter(a => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(query) ||
      a.surname.toLowerCase().includes(query) ||
      a.company.toLowerCase().includes(query) ||
      a.city?.toLowerCase().includes(query)
    );
  });

  // Group by graduation year
  const groupedAlumni = filteredAlumni.reduce((acc, record) => {
    const year = record.graduation_year;
    if (!acc[year]) acc[year] = [];
    acc[year].push(record);
    return acc;
  }, {} as Record<number, AlumniRecord[]>);

  const sortedYears = Object.keys(groupedAlumni).map(Number).sort((a, b) => b - a);

  if (isLoading) {
    return <p className="font-body text-muted-foreground">Loading alumni...</p>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-heading text-accent">Alumni Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="font-body">
              <Plus className="h-4 w-4 mr-2" />
              Add Alumni
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-serif">
                {editingAlumni ? 'Edit Alumni' : 'Add New Alumni'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-body">First Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="First name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surname" className="font-body">Last Name *</Label>
                  <Input
                    id="surname"
                    value={formData.surname}
                    onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                    placeholder="Last name"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="graduation_year" className="font-body">Graduation Year *</Label>
                <Input
                  id="graduation_year"
                  type="number"
                  value={formData.graduation_year}
                  onChange={(e) => setFormData({ ...formData, graduation_year: parseInt(e.target.value) })}
                  min={1990}
                  max={new Date().getFullYear() + 5}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company" className="font-body">Company *</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Current company"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="font-body">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin" className="font-body">LinkedIn URL</Label>
                <Input
                  id="linkedin"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>

              {isSubmitting && (
                <div className="space-y-2">
                  <Progress value={100} className="h-1 animate-pulse" />
                  <p className="text-xs text-muted-foreground text-center font-body">Saving alumni...</p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1 font-body" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (editingAlumni ? 'Update Alumni' : 'Add Alumni')}
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

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, company, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 font-body"
          />
        </div>
      </div>

      {/* Results count */}
      <p className="font-body text-small text-muted-foreground mb-6">
        Showing {filteredAlumni.length} {filteredAlumni.length === 1 ? 'alumni' : 'alumni'}
      </p>

      {/* Alumni List grouped by year */}
      {alumni.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-body text-muted-foreground">
              No alumni yet. Click "Add Alumni" to create one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {sortedYears.map((year) => (
            <div key={year}>
              <h3 className="font-serif text-subheading text-accent mb-4 pb-2 border-b border-separator">
                Class of {year}
              </h3>
              <div className="divide-y divide-separator">
                {groupedAlumni[year].map((record) => (
                  <div key={record.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-body-lg">
                          {record.name} {record.surname}
                        </span>
                        {record.linkedin_url && (
                          <a
                            href={record.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0"
                          >
                            <img src={linkedinIcon} alt="LinkedIn" className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                      <p className="font-body text-small text-muted-foreground">
                        {record.company}{record.city ? `, ${record.city}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEditDialog(record)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(record.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
