import { useState } from 'react';
import { Division, Fund, divisionLabels, fundLabels } from '@/lib/types';
import { Download, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
}

export function ArchiveFilesList({ files, showDivision = false }: ArchiveFilesListProps) {
  const [previewFile, setPreviewFile] = useState<ArchiveFile | null>(null);

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
            className={`py-6 ${index !== files.length - 1 ? 'border-b border-separator' : ''}`}
          >
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              {/* PDF Preview Thumbnail */}
              <div 
                className="flex-shrink-0 w-28 h-36 bg-muted rounded border border-separator overflow-hidden cursor-pointer hover:opacity-80 transition-opacity group"
                onClick={() => setPreviewFile(file)}
                title="Click to preview PDF"
              >
                <iframe
                  src={`${file.file_url}#view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                  className="w-full h-full pointer-events-none"
                  title={`Preview of ${file.title}`}
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
                  <p className="font-body text-body text-muted-foreground line-clamp-2">
                    {file.description}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-2 md:mt-6">
                <a
                  href={file.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-body text-small text-primary hover:underline"
                  download
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </a>
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
            <a
              href={previewFile?.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-body text-small rounded hover:opacity-90 transition-opacity"
              download
            >
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
