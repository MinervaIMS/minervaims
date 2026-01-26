interface ApplicationStatusProps {
  applicationsOpen: boolean;
  semesterLabel?: string;
  applyFormUrl?: string;
}

const ApplicationStatus = ({
  applicationsOpen,
  semesterLabel = "the upcoming semester",
  applyFormUrl = "#",
}: ApplicationStatusProps) => {
  if (applicationsOpen) {
    return (
      <div className="bg-accent text-accent-foreground p-8 md:p-12 mb-16">
        <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl mb-6">
          APPLICATIONS ARE NOW OPEN
        </h2>
        <p className="font-body text-body text-accent-foreground/80 mb-2">
          We recruit at the beginning of each academic semester.
        </p>
        <p className="font-body text-body text-accent-foreground/80 mb-8">
          Submit your application for {semesterLabel}.
        </p>
        <a
          href={applyFormUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-10 py-4 bg-background text-accent font-serif text-lg hover:bg-background/90 hover:scale-[1.02] transition-all duration-300"
        >
          Submit Application Form
        </a>
      </div>
    );
  }

  return (
    <div className="bg-accent text-accent-foreground p-8 md:p-12 mb-16">
      <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl mb-6">
        APPLICATIONS ARE CURRENTLY CLOSED
      </h2>
      <p className="font-body text-body text-accent-foreground/80 mb-2">
        The dates and deadlines of the next intake will be announced at the start of the upcoming semester.
      </p>
      <p className="font-body text-body text-accent-foreground/80">
        For questions, with respect, contact society members on LinkedIn.
      </p>
    </div>
  );
};

export default ApplicationStatus;
