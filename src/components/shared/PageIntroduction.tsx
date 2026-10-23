interface PageIntroductionProps {
  title: string;
  description?: string;
  backgroundImage?: string;
  transparentBackground?: boolean;
}

export function PageIntroduction({
  title,
  description,
  backgroundImage,
  transparentBackground = false,
}: PageIntroductionProps) {
  return (
    <section className="relative min-h-[320px] md:min-h-[380px] flex items-center">
      {!transparentBackground && (
        <>
          {backgroundImage ? (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${backgroundImage})` }}
              />
              <div className="absolute inset-0 page-intro-overlay" />
            </>
          ) : (
            <div className="absolute inset-0 bg-muted" />
          )}
        </>
      )}

      <div className="container relative z-10 py-12 md:py-16">
        <h1 className="font-serif text-[2.5rem] sm:text-hero md:text-[4.5rem] text-background mb-4 text-balance drop-shadow-[0_6px_16px_rgba(0,0,0,1)]">{title}</h1>
        {description && <p className="font-body text-body-lg md:text-xl text-background/90 max-w-2xl drop-shadow-[0_4px_12px_rgba(0,0,0,1)]">{description}</p>}
      </div>
    </section>
  );
}
