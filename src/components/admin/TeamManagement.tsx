import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Upload, X } from 'lucide-react';
import { divisionLabels } from '@/lib/types';

// Position options with their board status
const POSITIONS = [
  { value: 'President', label: 'President', isBoard: true },
  { value: 'Vice President', label: 'Vice President', isBoard: true },
  { value: 'Head of Asset Management', label: 'Head of Asset Management', isBoard: true },
  { value: 'Head of Equity Research', label: 'Head of Equity Research', isBoard: false },
  { value: 'Co-Head of Equity Research', label: 'Co-Head of Equity Research', isBoard: false },
  { value: 'Head of Investment Research', label: 'Head of Investment Research', isBoard: false },
  { value: 'Co-Head of Investment Research', label: 'Co-Head of Investment Research', isBoard: false },
  { value: 'Head of Macro Research', label: 'Head of Macro Research', isBoard: false },
  { value: 'Co-Head of Macro Research', label: 'Co-Head of Macro Research', isBoard: false },
  { value: 'Head of Portfolio Management', label: 'Head of Portfolio Management', isBoard: false },
  { value: 'Co-Head of Portfolio Management', label: 'Co-Head of Portfolio Management', isBoard: false },
  { value: 'Head of Quantitative Research', label: 'Head of Quantitative Research', isBoard: false },
  { value: 'Co-Head of Quantitative Research', label: 'Co-Head of Quantitative Research', isBoard: false },
  { value: 'Portfolio Manager', label: 'Portfolio Manager', isBoard: false },
  { value: 'Senior Analyst', label: 'Senior Analyst', isBoard: false },
  { value: 'Analyst', label: 'Analyst', isBoard: false },
  { value: 'Head of Operations', label: 'Head of Operations', isBoard: false },
  { value: 'Co-Head of Operations', label: 'Co-Head of Operations', isBoard: false },
  { value: 'Head of Media', label: 'Head of Media', isBoard: false },
  { value: 'Co-Head of Media', label: 'Co-Head of Media', isBoard: false },
  { value: 'Operations', label: 'Operations', isBoard: false },
  { value: 'Media', label: 'Media', isBoard: false },
];

const DIVISIONS = [
  { value: 'equity', label: 'Equity Research' },
  { value: 'investment', label: 'Investment Research' },
  { value: 'macro', label: 'Macro Research' },
  { value: 'portfolio', label: 'Portfolio Management' },
  { value: 'quant', label: 'Quantitative Research' },
  { value: 'operations', label: 'Operations & Media' },
];

const FUNDS = [
  { value: 'long-short', label: 'Long Short Equity Fund' },
  { value: 'multi-asset', label: 'Multi Asset Global Opportunities Fund' },
  { value: 'dps', label: 'Diversified Passive Selection Fund' },
  { value: 'pir', label: 'Italian Equity PIR Fund' },
];

interface TeamMember {
  id: string;
  name: string;
  surname: string;
  position: string;
  division: string | null;
  fund: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  is_board: boolean;
  display_order: number;
}

export default function TeamManagement() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    position: '',
    division: '',
    fund: '',
    photo_url: '',
    linkedin_url: '',
    is_board: false,
    display_order: 0,
  });
  const { toast } = useToast();
  const adminToken = sessionStorage.getItem('adminToken');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('display_order', { ascending: true })
        .order('surname', { ascending: true });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast({
        title: "Error",
        description: "Failed to fetch team members",
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
      position: '',
      division: '',
      fund: '',
      photo_url: '',
      linkedin_url: '',
      is_board: false,
      display_order: 0,
    });
    setEditingMember(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (member: TeamMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      surname: member.surname,
      position: member.position,
      division: member.division || '',
      fund: member.fund || '',
      photo_url: member.photo_url || '',
      linkedin_url: member.linkedin_url || '',
      is_board: member.is_board,
      display_order: member.display_order,
    });
    setIsDialogOpen(true);
  };

  const handlePositionChange = (position: string) => {
    const positionConfig = POSITIONS.find(p => p.value === position);
    setFormData({
      ...formData,
      position,
      is_board: positionConfig?.isBoard || false,
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('team-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('team-photos')
        .getPublicUrl(filePath);

      setFormData({ ...formData, photo_url: publicUrl });
      toast({
        title: "Success",
        description: "Photo uploaded successfully",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload photo",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.surname.trim() || !formData.position) {
      toast({
        title: "Error",
        description: "Name, surname, and position are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const action = editingMember ? 'update' : 'create';
      
      const memberData = {
        name: formData.name,
        surname: formData.surname,
        position: formData.position,
        division: formData.division || null,
        fund: formData.fund || null,
        photo_url: formData.photo_url || null,
        linkedin_url: formData.linkedin_url || null,
        is_board: formData.is_board,
        display_order: formData.display_order,
        ...(editingMember && { id: editingMember.id }),
      };

      const { data, error } = await supabase.functions.invoke('admin-team', {
        body: { action, member: memberData },
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
        description: `Team member ${editingMember ? 'updated' : 'created'} successfully`,
      });

      setIsDialogOpen(false);
      resetForm();
      fetchMembers();
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "Error",
        description: "Failed to save team member",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (memberId: string) => {
    if (!confirm('Are you sure you want to delete this team member?')) return;

    try {
      const { data, error } = await supabase.functions.invoke('admin-team', {
        body: { action: 'delete', member: { id: memberId } },
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
        description: "Team member deleted successfully",
      });

      fetchMembers();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete team member",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <p className="font-body text-muted-foreground">Loading team members...</p>;
  }

  // Group members by category
  const boardMembers = members.filter(m => m.is_board);
  const divisionHeads = members.filter(m => !m.is_board && m.position.startsWith('Head of'));
  const otherMembers = members.filter(m => !m.is_board && !m.position.startsWith('Head of'));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-serif text-heading">Team Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="font-body">
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif">
                {editingMember ? 'Edit Team Member' : 'Add New Team Member'}
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
                <Label className="font-body">Position *</Label>
                <Select
                  value={formData.position}
                  onValueChange={handlePositionChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((pos) => (
                      <SelectItem key={pos.value} value={pos.value}>
                        {pos.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-body">Division</Label>
                <Select
                  value={formData.division}
                  onValueChange={(value) => setFormData({ ...formData, division: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select division (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIVISIONS.map((div) => (
                      <SelectItem key={div.value} value={div.value}>
                        {div.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-body">Fund</Label>
                <Select
                  value={formData.fund}
                  onValueChange={(value) => setFormData({ ...formData, fund: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fund (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUNDS.map((fund) => (
                      <SelectItem key={fund.value} value={fund.value}>
                        {fund.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

              <div className="space-y-2">
                <Label className="font-body">Photo</Label>
                <div className="flex gap-4 items-center">
                  {formData.photo_url ? (
                    <div className="relative w-20 h-20">
                      <img 
                        src={formData.photo_url} 
                        alt="Preview" 
                        className="w-20 h-20 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, photo_url: '' })}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground text-xs">No photo</span>
                    </div>
                  )}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploading ? 'Uploading...' : 'Upload Photo'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="order" className="font-body">Display Order</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="is_board"
                  checked={formData.is_board}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_board: checked })}
                />
                <Label htmlFor="is_board" className="font-body">Executive Board Member</Label>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1 font-body">
                  {editingMember ? 'Update Member' : 'Add Member'}
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

      {/* Members List */}
      {members.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-body text-muted-foreground">
              No team members yet. Click "Add Member" to create one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Board Members */}
          {boardMembers.length > 0 && (
            <div>
              <h3 className="font-serif text-subheading mb-4 pb-2 border-b border-separator">Executive Board</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {boardMembers.map((member) => (
                  <MemberCard key={member.id} member={member} onEdit={openEditDialog} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}

          {/* Division Heads */}
          {divisionHeads.length > 0 && (
            <div>
              <h3 className="font-serif text-subheading mb-4 pb-2 border-b border-separator">Division Heads</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {divisionHeads.map((member) => (
                  <MemberCard key={member.id} member={member} onEdit={openEditDialog} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}

          {/* Other Members */}
          {otherMembers.length > 0 && (
            <div>
              <h3 className="font-serif text-subheading mb-4 pb-2 border-b border-separator">Team Members</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherMembers.map((member) => (
                  <MemberCard key={member.id} member={member} onEdit={openEditDialog} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MemberCard({ 
  member, 
  onEdit, 
  onDelete 
}: { 
  member: TeamMember; 
  onEdit: (member: TeamMember) => void; 
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="relative">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Photo */}
          <div className="w-16 h-16 flex-shrink-0 bg-muted flex items-center justify-center">
            {member.photo_url ? (
              <img 
                src={member.photo_url} 
                alt={`${member.name} ${member.surname}`}
                className="w-16 h-16 object-cover"
              />
            ) : (
              <span className="font-serif text-muted-foreground text-lg">
                {member.name.charAt(0)}{member.surname.charAt(0)}
              </span>
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-serif text-body-lg truncate">
              {member.name} {member.surname}
            </h4>
            <p className="font-body text-small text-muted-foreground truncate">
              {member.position}
            </p>
            {member.division && (
              <p className="font-body text-xs text-muted-foreground truncate">
                {divisionLabels[member.division as keyof typeof divisionLabels] || member.division}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="absolute top-2 right-2 flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(member)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(member.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
