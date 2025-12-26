interface PageIntroductionProps {
  title: string;
  description?: string;
  backgroundImage?: string;
  transparentBackground?: boolean;
  overlayClassName?: string;
}

export function PageIntroduction({
  title,
  description,
  backgroundImage,
  transparentBackground = false,
  overlayClassName = "bg-black/60",
}: PageIntroductionProps) {
  return (
    <section className="relative min-h-[320px] md:min-h-[380px] flex items-center">
      {!transparentBackground && (
        <>
          {backgroundImage ? (
            <div
              className="absolute inset-0 bg-cover bg-center grayscale"
              style={{ backgroundImage: `url(${backgroundImage})` }}
            />
          ) : (
            <div className="absolute inset-0 bg-muted" />
          )}
          <div className={`absolute inset-0 ${overlayClassName}`} />
        </>
      )}

      <div className="container relative z-10 py-12 md:py-16">
        <h1 className="font-serif text-hero md:text-[4.5rem] text-background mb-4 text-balance drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{title}</h1>
        {description && <p className="font-body text-body-lg md:text-xl text-background/90 max-w-2xl drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{description}</p>}
      </div>
    </section>
  );
}
