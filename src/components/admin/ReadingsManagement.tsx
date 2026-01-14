import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit, Trash2, Loader2, GripVertical, BookOpen, GraduationCap, Coffee, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type ReadingType = 'academic_papers' | 'technical_textbooks' | 'free_time_readings';

interface Reading {
  id: string;
  title: string;
  author: string;
  description: string;
  reading_type: ReadingType;
  contributor_name: string;
  contributor_surname: string;
  contributor_role: string;
  display_order: number;
  created_at: string;
}

const readingTypeLabels: Record<ReadingType, string> = {
  academic_papers: 'Academic Papers',
  technical_textbooks: 'Technical Textbooks',
  free_time_readings: 'Free Time Readings',
};

const readingTypeIcons: Record<ReadingType, React.ReactNode> = {
  academic_papers: <GraduationCap className="h-4 w-4" />,
  technical_textbooks: <BookOpen className="h-4 w-4" />,
  free_time_readings: <Coffee className="h-4 w-4" />,
};

// Role labels for display
const roleLabels: Record<string, string> = {
  admin: 'Admin',
  president: 'President',
  vice_president: 'Vice President',
  head_of_asset_management: 'Head of Asset Management',
  head_of_equity: 'Head of Equity Research',
  head_of_investment: 'Head of Investment Research',
  head_of_macro: 'Head of Macro Research',
  head_of_portfolio: 'Head of Portfolio Management',
  head_of_quant: 'Head of Quantitative Research',
  portfolio_manager: 'Portfolio Manager',
};

interface SortableReadingItemProps {
  reading: Reading;
  onEdit: (reading: Reading) => void;
  onDelete: (id: string) => void;
}

function SortableReadingItem({ reading, onEdit, onDelete }: SortableReadingItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: reading.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-4 p-4 bg-background border border-separator rounded-lg"
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-muted-foreground">
            {readingTypeIcons[reading.reading_type]}
          </span>
          <span className="text-xs font-body uppercase tracking-wider text-muted-foreground">
            {readingTypeLabels[reading.reading_type]}
          </span>
        </div>
        <h3 className="font-serif text-lg text-accent truncate">{reading.title}</h3>
        <p className="font-body text-sm text-muted-foreground">by {reading.author}</p>
        <p className="font-body text-sm text-foreground mt-2 line-clamp-2">{reading.description}</p>
        <p className="font-body text-xs text-muted-foreground italic mt-2">
          Recommended by {reading.contributor_name} {reading.contributor_surname}, {reading.contributor_role}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button variant="outline" size="icon" onClick={() => onEdit(reading)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="destructive" size="icon" onClick={() => onDelete(reading.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

const ReadingsManagement = () => {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReading, setEditingReading] = useState<Reading | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    reading_type: 'academic_papers' as ReadingType,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const { toast } = useToast();
  const { user, session, roles, profile } = useAuth();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get user's primary role for contributor_role
  const getPrimaryRole = () => {
    if (!roles.length) return 'Member';
    const priorityOrder = ['president', 'vice_president', 'admin', 'head_of_asset_management',
      'head_of_equity', 'head_of_investment', 'head_of_macro', 'head_of_portfolio', 
      'head_of_quant', 'portfolio_manager'];
    const userRoleNames = roles.map(r => r.role as string);
    const primaryRole = priorityOrder.find(r => userRoleNames.includes(r)) || String(roles[0].role);
    return roleLabels[primaryRole] || primaryRole;
  };

  // Get user's name and surname from profile
  const getUserName = () => {
    if (profile?.full_name) {
      const parts = profile.full_name.split(' ');
      if (parts.length >= 2) {
        return { name: parts[0], surname: parts.slice(1).join(' ') };
      }
      return { name: profile.full_name, surname: '' };
    }
    return { name: user?.email?.split('@')[0] || 'Unknown', surname: '' };
  };

  useEffect(() => {
    fetchReadings();
  }, []);

  const fetchReadings = async () => {
    try {
      const { data, error } = await supabase
        .from('readings')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setReadings((data as Reading[]) || []);
    } catch (error) {
      console.error('Error fetching readings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch readings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(readings.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedReadings = useMemo(() =>
    readings.slice(startIndex, startIndex + ITEMS_PER_PAGE),
    [readings, startIndex]
  );

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  const resetForm = () => {
    setFormData({
      title: '',
      author: '',
      description: '',
      reading_type: 'academic_papers',
    });
    setEditingReading(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (reading: Reading) => {
    setEditingReading(reading);
    setFormData({
      title: reading.title,
      author: reading.author,
      description: reading.description,
      reading_type: reading.reading_type,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.author.trim() || !formData.description.trim()) {
      toast({
        title: "Error",
        description: "Title, author, and description are required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const action = editingReading ? 'update' : 'create';
      const { name, surname } = getUserName();
      
      const readingData = {
        title: formData.title.trim(),
        author: formData.author.trim(),
        description: formData.description.trim(),
        reading_type: formData.reading_type,
        contributor_name: name,
        contributor_surname: surname,
        contributor_role: getPrimaryRole(),
        ...(editingReading && { id: editingReading.id }),
      };

      const { data, error } = await supabase.functions.invoke('admin-readings', {
        body: { action, reading: readingData },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
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
        description: `Reading ${editingReading ? 'updated' : 'created'} successfully`,
      });

      setIsDialogOpen(false);
      resetForm();
      fetchReadings();
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "Error",
        description: "Failed to save reading",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (readingId: string) => {
    if (!confirm('Are you sure you want to delete this reading?')) return;

    try {
      const { data, error } = await supabase.functions.invoke('admin-readings', {
        body: { action: 'delete', reading: { id: readingId } },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
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
        description: "Reading deleted successfully",
      });

      fetchReadings();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete reading",
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = readings.findIndex((r) => r.id === active.id);
      const newIndex = readings.findIndex((r) => r.id === over.id);

      const newReadings = arrayMove(readings, oldIndex, newIndex);
      setReadings(newReadings);

      // Update display_order for all affected items
      try {
        const updates = newReadings.map((reading, index) => ({
          id: reading.id,
          display_order: index,
        }));

        const { error } = await supabase.functions.invoke('admin-readings', {
          body: { action: 'reorder', readings: updates },
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });

        if (error) throw error;

        toast({
          title: "Order updated",
          description: "The reading order has been saved",
        });
      } catch (error) {
        console.error('Reorder error:', error);
        fetchReadings(); // Revert on error
        toast({
          title: "Error",
          description: "Failed to update order",
          variant: "destructive",
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-serif text-heading text-accent">Readings Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="font-body">
              <Plus className="h-4 w-4 mr-2" />
              Add Reading
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif">
                {editingReading ? 'Edit Reading' : 'Add New Reading'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reading_type" className="font-body">Category *</Label>
                <Select
                  value={formData.reading_type}
                  onValueChange={(value: ReadingType) => setFormData({ ...formData, reading_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(readingTypeLabels) as ReadingType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        <span className="flex items-center gap-2">
                          {readingTypeIcons[type]}
                          {readingTypeLabels[type]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title" className="font-body">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Book or paper title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author" className="font-body">Author *</Label>
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Author name(s)"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="font-body">Description / Rationale *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief rationale for recommending this reading"
                  rows={4}
                  required
                />
              </div>
              {isSubmitting && (
                <div className="space-y-2">
                  <Progress value={100} className="h-1 animate-pulse" />
                  <p className="text-xs text-muted-foreground text-center font-body">Saving reading...</p>
                </div>
              )}
              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1 font-body" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (editingReading ? 'Update Reading' : 'Create Reading')}
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

      {/* Results count */}
      <p className="font-body text-small text-muted-foreground mb-6">
        Showing {paginatedReadings.length} of {readings.length} {readings.length === 1 ? 'reading' : 'readings'}
        {totalPages > 1 && ` (page ${currentPage} of ${totalPages})`}
      </p>

      {/* Readings List */}
      {readings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-body text-muted-foreground">
              No readings yet. Click "Add Reading" to create one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={paginatedReadings.map(r => r.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {paginatedReadings.map((reading) => (
                  <SortableReadingItem
                    key={reading.id}
                    reading={reading}
                    onEdit={openEditDialog}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="flex justify-center mt-8" aria-label="Readings Pagination">
              <ul className="flex items-center gap-1">
                <li>
                  <button
                    onClick={() => setCurrentPage(p => p - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-2 font-body text-sm border border-separator rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Go to previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                </li>
                {getPageNumbers().map((page, index) => (
                  <li key={index}>
                    {page === 'ellipsis' ? (
                      <span className="flex h-9 w-9 items-center justify-center" aria-hidden>
                        <MoreHorizontal className="h-4 w-4" />
                      </span>
                    ) : (
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`h-9 w-9 font-body text-sm border rounded ${
                          currentPage === page
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-separator hover:bg-muted'
                        }`}
                        aria-current={currentPage === page ? 'page' : undefined}
                      >
                        {page}
                      </button>
                    )}
                  </li>
                ))}
                <li>
                  <button
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-2 font-body text-sm border border-separator rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Go to next page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}
    </div>
  );
};

export default ReadingsManagement;
