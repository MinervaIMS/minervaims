import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Upload, X, Loader2, GripVertical, Download } from 'lucide-react';
import linkedinIcon from '@/assets/linkedin-icon.png';
import { divisionLabels, Division } from '@/lib/types';
import { downloadCSV } from '@/lib/download-utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Position options with their board status
const POSITIONS = [
  { value: 'President', label: 'President', isBoard: true },
  { value: 'Vice President', label: 'Vice President', isBoard: true },
  { value: 'Head of Asset Management', label: 'Head of Asset Management', isBoard: true },
  { value: 'Advisor', label: 'Advisor', isBoard: true },
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

interface TeamManagementProps {
  allowedDivisions?: Division[] | null;
  isFullAccess?: boolean;
}

// Positions that division heads can assign (restricted roles)
const DIVISION_HEAD_ALLOWED_POSITIONS = [
  'Analyst',
  'Senior Analyst',
];

// Additional position for head of portfolio
const PORTFOLIO_HEAD_ADDITIONAL_POSITIONS = [
  'Portfolio Manager',
];

export default function TeamManagement({ allowedDivisions, isFullAccess = true }: TeamManagementProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
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

  // Find the active member being dragged
  const activeMember = useMemo(() => {
    if (!activeDragId) return null;
    return members.find(m => m.id === activeDragId) || null;
  }, [activeDragId, members]);

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

  // Position hierarchy for sorting (lower = higher priority)
  const POSITION_ORDER: Record<string, number> = {
    'President': 1,
    'Vice President': 2,
    'Head of Asset Management': 3,
    'Head of Equity Research': 10,
    'Co-Head of Equity Research': 11,
    'Head of Investment Research': 10,
    'Co-Head of Investment Research': 11,
    'Head of Macro Research': 10,
    'Co-Head of Macro Research': 11,
    'Head of Portfolio Management': 10,
    'Co-Head of Portfolio Management': 11,
    'Head of Quantitative Research': 10,
    'Co-Head of Quantitative Research': 11,
    'Head of Operations': 10,
    'Co-Head of Operations': 11,
    'Head of Media': 10,
    'Co-Head of Media': 11,
    'Portfolio Manager': 20,
    'Senior Analyst': 30,
    'Analyst': 40,
    'Operations': 50,
    'Media': 50,
  };

  // Get positions available based on user permissions
  const availablePositions = useMemo(() => {
    if (isFullAccess) return POSITIONS;
    
    // Division heads can only assign certain positions
    let allowed = [...DIVISION_HEAD_ALLOWED_POSITIONS];
    
    // Head of portfolio can also add Portfolio Managers
    if (allowedDivisions?.includes('portfolio')) {
      allowed = [...allowed, ...PORTFOLIO_HEAD_ADDITIONAL_POSITIONS];
    }
    
    return POSITIONS.filter(p => allowed.includes(p.value));
  }, [isFullAccess, allowedDivisions]);

  // Get divisions available based on user permissions
  const availableDivisions = useMemo(() => {
    if (isFullAccess || !allowedDivisions) return DIVISIONS;
    return DIVISIONS.filter(d => allowedDivisions.includes(d.value as Division));
  }, [isFullAccess, allowedDivisions]);

  // Group members by division with position-aware sorting
  const membersByDivision = useMemo(() => {
    const sortByPositionThenOrder = (a: TeamMember, b: TeamMember) => {
      const posA = POSITION_ORDER[a.position] ?? 100;
      const posB = POSITION_ORDER[b.position] ?? 100;
      if (posA !== posB) return posA - posB;
      return a.display_order - b.display_order;
    };

    // Filter members based on allowed divisions if not full access
    const filteredMembers = !isFullAccess && allowedDivisions 
      ? members.filter(m => m.division && allowedDivisions.includes(m.division as Division))
      : members;

    const boardMembers = isFullAccess 
      ? members.filter(m => m.is_board).sort(sortByPositionThenOrder)
      : []; // Division heads can't see/edit board members
    
    const divisionGroups: Record<string, TeamMember[]> = {};
    
    filteredMembers.filter(m => !m.is_board && m.division).forEach(member => {
      const div = member.division!;
      if (!divisionGroups[div]) divisionGroups[div] = [];
      divisionGroups[div].push(member);
    });

    // Sort each division group by position hierarchy then display_order
    Object.keys(divisionGroups).forEach(div => {
      divisionGroups[div].sort(sortByPositionThenOrder);
    });

    // Members without division (operations/media heads without division assignment)
    const noDivision = isFullAccess
      ? members.filter(m => !m.is_board && !m.division).sort(sortByPositionThenOrder)
      : [];

    return { boardMembers, divisionGroups, noDivision };
  }, [members, isFullAccess, allowedDivisions]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Save reordered members to backend
  const saveReorder = useCallback(async (reorderedMembers: TeamMember[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: "Session Expired", description: "Please log out and log back in.", variant: "destructive" });
        return;
      }

      const items = reorderedMembers.map((m, index) => ({
        id: m.id,
        display_order: index,
      }));

      const { data, error } = await supabase.functions.invoke('admin-team', {
        body: { action: 'reorder', items },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error || data?.error) {
        toast({ title: "Error", description: data?.error || "Failed to save order", variant: "destructive" });
        fetchMembers();
        return;
      }

      toast({ title: "Success", description: "Order updated successfully" });
    } catch (error) {
      console.error('Reorder error:', error);
      toast({ title: "Error", description: "Failed to save order", variant: "destructive" });
      fetchMembers();
    }
  }, [toast]);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  }, []);

  // Handle drag end for a specific group
  const handleDragEnd = useCallback((groupKey: string, groupMembers: TeamMember[], isBoard: boolean = false) => (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = groupMembers.findIndex(m => m.id === active.id);
    const newIndex = groupMembers.findIndex(m => m.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Only apply position hierarchy validation to NON-board members (division sections)
    if (!isBoard) {
      const draggedMember = groupMembers[oldIndex];
      const targetMember = groupMembers[newIndex];

      // Check position hierarchy - can't move PM after Senior Analyst, etc.
      const draggedPriority = POSITION_ORDER[draggedMember.position] ?? 100;
      const targetPriority = POSITION_ORDER[targetMember.position] ?? 100;

      // Only allow reordering within same position tier or if moving up in hierarchy
      if (draggedPriority !== targetPriority) {
        // Check if the move would violate hierarchy
        const reordered = arrayMove(groupMembers, oldIndex, newIndex);
        let prevPriority = 0;
        for (const m of reordered) {
          const priority = POSITION_ORDER[m.position] ?? 100;
          if (priority < prevPriority) {
            toast({ 
              title: "Invalid Order", 
              description: "Portfolio Managers must come before Senior Analysts, and Senior Analysts before Analysts.", 
              variant: "destructive" 
            });
            return;
          }
          prevPriority = priority;
        }
      }
    }

    const reorderedGroup = arrayMove(groupMembers, oldIndex, newIndex);

    // Update local state
    setMembers(prev => {
      const newMembers = [...prev];
      reorderedGroup.forEach((member, index) => {
        const idx = newMembers.findIndex(m => m.id === member.id);
        if (idx !== -1) {
          newMembers[idx] = { ...newMembers[idx], display_order: index };
        }
      });
      return newMembers;
    });

    // Save to backend
    saveReorder(reorderedGroup);
  }, [toast, saveReorder]);

  // Handle drag cancel
  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  const resetForm = () => {
    // For division heads, pre-select their division
    const defaultDivision = !isFullAccess && allowedDivisions?.length === 1 
      ? allowedDivisions[0] 
      : '';
    
    setFormData({
      name: '',
      surname: '',
      position: '',
      division: defaultDivision,
      fund: '',
      photo_url: '',
      linkedin_url: '',
      is_board: false,
      display_order: 0,
    });
    setEditingMember(null);
    setUploadProgress(0);
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

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 100);

    try {
      // Get auth session for edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Create FormData for photo upload through edge function
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      if (formData.division) {
        uploadFormData.append('division', formData.division);
      }

      // Upload through edge function (uses service_role for storage access)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-team`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: uploadFormData,
        }
      );

      clearInterval(progressInterval);

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Upload failed');
      }

      setFormData({ ...formData, photo_url: result.photo_url });
      setUploadProgress(100);
      toast({
        title: "Success",
        description: "Photo uploaded successfully",
      });
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload photo",
        variant: "destructive",
      });
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.name.trim() || !formData.surname.trim() || !formData.position) {
      toast({
        title: "Error",
        description: "Name, surname, and position are required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const action = editingMember ? 'update' : 'create';
    
    const memberData = {
      name: formData.name.trim(),
      surname: formData.surname.trim(),
      position: formData.position,
      division: formData.division || null,
      fund: formData.fund || null,
      photo_url: formData.photo_url || null,
      linkedin_url: formData.linkedin_url.trim() || null,
      is_board: formData.is_board,
      display_order: formData.display_order,
      ...(editingMember && { id: editingMember.id }),
    };

    // Optimistic update
    const tempId = editingMember?.id || crypto.randomUUID();
    const optimisticMember: TeamMember = { id: tempId, ...memberData } as TeamMember;

    if (editingMember) {
      setMembers(prev => prev.map(m => m.id === editingMember.id ? optimisticMember : m));
    } else {
      setMembers(prev => [...prev, optimisticMember]);
    }

    setIsDialogOpen(false);
    resetForm();

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        toast({ 
          title: "Session Expired", 
          description: "Please log out and log back in to continue.", 
          variant: "destructive" 
        });
        fetchMembers();
        return;
      }

      const { data, error } = await supabase.functions.invoke('admin-team', {
        body: { action, member: memberData },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error || data?.error) {
        fetchMembers();
        const errorMsg = data?.error || error?.message || "Failed to save team member";
        if (errorMsg.includes('Invalid token') || errorMsg.includes('401')) {
          toast({ title: "Session Expired", description: "Please log out and log back in.", variant: "destructive" });
        } else {
          toast({ title: "Error", description: errorMsg, variant: "destructive" });
        }
        return;
      }

      toast({ title: "Success", description: `Team member ${editingMember ? 'updated' : 'created'} successfully` });
      fetchMembers();
    } catch (error) {
      console.error('Submit error:', error);
      fetchMembers();
      toast({ title: "Error", description: "Failed to save team member", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (memberId: string) => {
    if (!confirm('Are you sure you want to delete this team member?')) return;

    const previousMembers = members;
    setMembers(prev => prev.filter(m => m.id !== memberId));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('admin-team', {
        body: { action: 'delete', member: { id: memberId } },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error || data?.error) {
        setMembers(previousMembers);
        toast({ title: "Error", description: data?.error || "Failed to delete team member", variant: "destructive" });
        return;
      }

      toast({ title: "Success", description: "Team member deleted successfully" });
    } catch (error) {
      console.error('Delete error:', error);
      setMembers(previousMembers);
      toast({ title: "Error", description: "Failed to delete team member", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <p className="font-body text-muted-foreground">Loading team members...</p>;
  }

  const handleDownloadCSV = () => {
    const columns: { key: keyof TeamMember; header: string }[] = [
      { key: 'name', header: 'First Name' },
      { key: 'surname', header: 'Last Name' },
      { key: 'position', header: 'Position' },
      { key: 'division', header: 'Division' },
      { key: 'fund', header: 'Fund' },
      { key: 'is_board', header: 'Executive Board' },
      { key: 'linkedin_url', header: 'LinkedIn URL' },
      { key: 'photo_url', header: 'Photo URL' },
    ];
    downloadCSV(members, columns, 'team-members.csv');
    toast({ title: "Download started", description: "Team members CSV is being downloaded." });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-serif text-heading text-accent">Team Management</h2>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleDownloadCSV} className="font-body" disabled={members.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
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
                    {availablePositions.map((pos) => (
                      <SelectItem key={pos.value} value={pos.value}>
                        {pos.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-body">Division{!isFullAccess ? ' *' : ''}</Label>
                <Select
                  value={formData.division}
                  onValueChange={(value) => setFormData({ ...formData, division: value, fund: value !== 'portfolio' ? '' : formData.fund })}
                  disabled={!isFullAccess && allowedDivisions?.length === 1}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isFullAccess ? "Select division (optional)" : "Select division"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDivisions.map((div) => (
                      <SelectItem key={div.value} value={div.value}>
                        {div.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.division === 'portfolio' && (
                <div className="space-y-2">
                  <Label className="font-body">Fund</Label>
                  <Select
                    value={formData.fund}
                    onValueChange={(value) => setFormData({ ...formData, fund: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fund" />
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
              )}

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
                  <div className="flex-1">
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
                    {isUploading && (
                      <div className="mt-2">
                        <Progress value={uploadProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">{uploadProgress}%</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="is_board"
                  checked={formData.is_board}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_board: checked })}
                />
                <Label htmlFor="is_board" className="font-body">Executive Board Member</Label>
              </div>

              {isSubmitting && (
                <div className="space-y-2">
                  <Progress value={100} className="h-1 animate-pulse" />
                  <p className="text-xs text-muted-foreground text-center font-body">Saving team member...</p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1 font-body" disabled={isSubmitting || isUploading}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (editingMember ? 'Update Member' : 'Add Member')}
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
      </div>

      {/* Members List grouped by division */}
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
          {membersByDivision.boardMembers.length > 0 && (
            <div>
              <h3 className="font-serif text-subheading text-accent mb-2 pb-2 border-b border-separator">Executive Board</h3>
              <p className="font-body text-sm text-muted-foreground mb-4">Drag to reorder members within this group</p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd('board', membersByDivision.boardMembers, true)}
                onDragCancel={handleDragCancel}
              >
                <SortableContext
                  items={membersByDivision.boardMembers.map(m => m.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {membersByDivision.boardMembers.map((member) => (
                      <SortableMemberCard key={member.id} member={member} onEdit={openEditDialog} onDelete={handleDelete} />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
                  {activeMember ? <DragOverlayCard member={activeMember} /> : null}
                </DragOverlay>
              </DndContext>
            </div>
          )}

          {/* Members by Division */}
          {DIVISIONS.filter(d => membersByDivision.divisionGroups[d.value]?.length > 0).map((division) => (
            <div key={division.value}>
              <h3 className="font-serif text-subheading text-accent mb-2 pb-2 border-b border-separator">{division.label}</h3>
              <p className="font-body text-sm text-muted-foreground mb-4">Drag to reorder members within this division</p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd(division.value, membersByDivision.divisionGroups[division.value], false)}
                onDragCancel={handleDragCancel}
              >
                <SortableContext
                  items={membersByDivision.divisionGroups[division.value].map(m => m.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {membersByDivision.divisionGroups[division.value].map((member) => (
                      <SortableMemberCard key={member.id} member={member} onEdit={openEditDialog} onDelete={handleDelete} />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
                  {activeMember ? <DragOverlayCard member={activeMember} /> : null}
                </DragOverlay>
              </DndContext>
            </div>
          ))}

          {/* Members without division */}
          {membersByDivision.noDivision.length > 0 && (
            <div>
              <h3 className="font-serif text-subheading text-accent mb-2 pb-2 border-b border-separator">Other</h3>
              <p className="font-body text-sm text-muted-foreground mb-4">Drag to reorder members within this group</p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd('other', membersByDivision.noDivision, false)}
                onDragCancel={handleDragCancel}
              >
                <SortableContext
                  items={membersByDivision.noDivision.map(m => m.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {membersByDivision.noDivision.map((member) => (
                      <SortableMemberCard key={member.id} member={member} onEdit={openEditDialog} onDelete={handleDelete} />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
                  {activeMember ? <DragOverlayCard member={activeMember} /> : null}
                </DragOverlay>
              </DndContext>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Sortable MemberCard wrapper
function SortableMemberCard({ 
  member, 
  onEdit, 
  onDelete 
}: { 
  member: TeamMember; 
  onEdit: (member: TeamMember) => void; 
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: member.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Placeholder shown when dragging */}
      {isDragging && (
        <div className="absolute inset-0 bg-muted/30 border-2 border-dashed border-primary/40 rounded-lg" />
      )}
      <Card className={`relative transition-all duration-200 ${
        isDragging 
          ? 'opacity-0' 
          : 'hover:shadow-md'
      }`}>
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className={`flex items-center cursor-grab active:cursor-grabbing transition-colors ${
                isDragging ? 'text-primary' : 'hover:text-primary/70'
              }`}
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>

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
              <div className="flex items-center gap-2">
                <h4 className="font-serif text-body-lg truncate">
                  {member.name} {member.surname}
                </h4>
                {member.linkedin_url && (
                  <a
                    href={member.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-80 transition-opacity flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img src={linkedinIcon} alt="LinkedIn" className="w-5 h-5" />
                  </a>
                )}
              </div>
              <p className="font-body text-small text-muted-foreground truncate">
                {member.position}
              </p>
              {member.fund && (
                <p className="font-body text-xs text-muted-foreground truncate">
                  {FUNDS.find(f => f.value === member.fund)?.label || member.fund}
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
    </div>
  );
}

// Drag overlay preview card - simplified version for the overlay
function DragOverlayCard({ member }: { member: TeamMember }) {
  return (
    <Card className="shadow-2xl shadow-primary/30 ring-2 ring-primary bg-background rotate-2 cursor-grabbing">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Drag Handle */}
          <div className="flex items-center text-primary">
            <GripVertical className="h-5 w-5" />
          </div>

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
            {member.fund && (
              <p className="font-body text-xs text-muted-foreground truncate">
                {FUNDS.find(f => f.value === member.fund)?.label || member.fund}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
