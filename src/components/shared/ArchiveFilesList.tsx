import { useState } from 'react';
import { Division, Fund, divisionLabels, fundLabels } from '@/lib/types';
import { Download, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PdfThumbnail } from './PdfThumbnail';
import { useToast } from '@/hooks/use-toast';

interface ArchiveFile {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  date: string;
  division: string;
  fund: string | null;
}

interface ArchiveFilesListProps {
  files: ArchiveFile[];
  showDivision?: boolean;
  highlightedFileId?: string | null;
}

export function ArchiveFilesList({ files, showDivision = false, highlightedFileId }: ArchiveFilesListProps) {
  const [previewFile, setPreviewFile] = useState<ArchiveFile | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const toggleDescription = (fileId: string) => {
    setExpandedDescriptions(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const handleDownload = async (file: ArchiveFile) => {
    if (downloadingFiles.has(file.id)) return;
    
    setDownloadingFiles(prev => new Set(prev).add(file.id));
    
    try {
      const response = await fetch(file.file_url);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Clean filename: keep letters, numbers, spaces, hyphens, underscores
      const cleanTitle = file.title
        .replace(/[^a-zA-Z0-9\s\-_]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      link.download = `${cleanTitle || 'document'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download complete",
        description: `${file.title} has been downloaded.`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Please try again or right-click the link to save.",
        variant: "destructive",
      });
    } finally {
      setDownloadingFiles(prev => {
        const next = new Set(prev);
        next.delete(file.id);
        return next;
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

  if (files.length === 0) {
    return (
      <p className="font-body text-muted-foreground py-8">
        No reports available at this time.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-0">
        {files.map((file, index) => (
          <article
            key={file.id}
            id={`file-${file.id}`}
            className={`py-6 transition-colors duration-500 ${index !== files.length - 1 ? 'border-b border-separator' : ''} ${highlightedFileId === file.id ? 'bg-primary/10 -mx-4 px-4 rounded-lg' : ''}`}
          >
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              {/* PDF Preview Thumbnail - A4 aspect ratio */}
              <div 
                className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setPreviewFile(file)}
                title="Click to preview PDF"
              >
                <PdfThumbnail
                  url={file.file_url}
                  className="w-28 bg-background rounded border border-separator"
                  alt={`Preview of ${file.title}`}
                />
              </div>

              {/* Content */}
              <div className="flex-1">
                <time className="font-body text-xs text-muted-foreground uppercase tracking-wider">
                  {formatDate(file.date)}
                  {showDivision && file.division && (
                    <span className="ml-4 text-primary">
                      {divisionLabels[file.division as Division]}
                    </span>
                  )}
                  {file.fund && (
                    <span className="ml-4 text-primary/70">
                      {fundLabels[file.fund as Fund]}
                    </span>
                  )}
                </time>
                <h3 className="font-serif text-subheading mt-2 mb-2">
                  {file.title}
                </h3>
                {file.description && (
                  <div>
                    <p className={`font-body text-body text-muted-foreground ${expandedDescriptions.has(file.id) ? '' : 'line-clamp-2'}`}>
                      {file.description}
                    </p>
                    {file.description.length > 150 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDescription(file.id);
                        }}
                        className="inline-flex items-center gap-1 font-body text-small text-primary hover:underline mt-1"
                      >
                        {expandedDescriptions.has(file.id) ? (
                          <>
                            <ChevronUp className="h-3 w-3" />
                            Show less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3" />
                            Read more
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-2 md:mt-6">
                <button
                  onClick={() => handleDownload(file)}
                  disabled={downloadingFiles.has(file.id)}
                  className="inline-flex items-center gap-1.5 font-body text-small text-primary hover:underline disabled:opacity-50 disabled:cursor-wait"
                >
                  {downloadingFiles.has(file.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span>{downloadingFiles.has(file.id) ? 'Downloading...' : 'Download'}</span>
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* PDF Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-serif">{previewFile?.title}</DialogTitle>
          </DialogHeader>
          <div className="w-full h-[70vh] bg-muted rounded overflow-hidden">
            {previewFile && (
              <iframe
                src={`${previewFile.file_url}#view=FitH`}
                className="w-full h-full"
                title={previewFile.title}
              />
            )}
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => previewFile && handleDownload(previewFile)}
              disabled={previewFile ? downloadingFiles.has(previewFile.id) : false}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-body text-small rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-wait"
            >
              {previewFile && downloadingFiles.has(previewFile.id) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {previewFile && downloadingFiles.has(previewFile.id) ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
