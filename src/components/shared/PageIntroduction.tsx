interface PageIntroductionProps {
  title: string;
  description?: string;
  backgroundImage?: string;
  transparentBackground?: boolean;
  /**
   * 'light' for a hero on a light ground (a report's page, Step 105): the
   * title in the accent colour, with no shadow. 'dark', the default, is
   * the white title over a picture that every other page uses.
   */
  tone?: 'dark' | 'light';
}

export function PageIntroduction({
  title,
  description,
  backgroundImage,
  transparentBackground = false,
  tone = 'dark',
}: PageIntroductionProps) {
  const light = tone === 'light';
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
        <h1 className={`font-serif text-[2.5rem] sm:text-hero md:text-[4.5rem] mb-4 text-balance ${light ? 'text-accent' : 'text-background drop-shadow-[0_6px_16px_rgba(0,0,0,1)]'}`}>{title}</h1>
        {description && <p className={`font-body text-body-lg md:text-xl max-w-2xl ${light ? 'text-muted-foreground' : 'text-background/90 drop-shadow-[0_4px_12px_rgba(0,0,0,1)]'}`}>{description}</p>}
      </div>
    </section>
  );
}
