interface PageIntroductionProps {
  title: string;
  description?: string;
  backgroundImage?: string;
}

export function PageIntroduction({ title, description, backgroundImage }: PageIntroductionProps) {
  return (
    <section className="relative min-h-[280px] md:min-h-[340px] flex items-center">
      {/* Background placeholder */}
      {backgroundImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center grayscale"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-muted" />
      )}
      
      {/* Overlay */}
      <div className="absolute inset-0 page-intro-overlay" />
      
      {/* Content */}
      <div className="container relative z-10 py-12 md:py-16">
        <h1 className="font-serif text-display md:text-hero text-background mb-4 text-balance">
          {title}
        </h1>
        {description && (
          <p className="font-body text-body-lg text-background/90 max-w-2xl">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
