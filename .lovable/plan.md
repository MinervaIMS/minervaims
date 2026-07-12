Re-introduce the PixelCard animation on the `/apply?submitted=1` success screen in `src/pages/Apply.tsx` (the `SuccessScreen` component).

## Changes

In `src/pages/Apply.tsx`:

1. Add import at top:
   ```ts
   import PixelCard from '@/components/shared/PixelCard';
   ```

2. Replace the current success card (lines 72–82) so the white card wraps the PixelCard animation behind the content:
   ```tsx
   <div className="relative z-10 w-full max-w-md overflow-hidden bg-white rounded-lg shadow-2xl border border-separator">
     {/* Animation fills the entire card, behind the content. */}
     <div className="absolute inset-0">
       <PixelCard variant="navy" gap={4} speed={45} activeDuration={1400} fadeMs={4200} className="w-full h-full" />
     </div>
     <div className="relative z-10 px-8 py-12 text-center">
       <img src={fullLogoColor.url} alt="Minerva Investment Management Society" style={{ height: '116px', width: 'auto' }} className="mx-auto mb-6" />
       <h1 className="font-serif text-accent mb-3" style={{ fontSize: '26px', fontWeight: 400 }}>Application submitted</h1>
       <p className="font-body text-foreground mb-2" style={{ fontSize: '16px', lineHeight: 1.55 }}>
         Your email is verified and your application has been submitted successfully.
       </p>
       <p className="font-body text-sm text-muted-foreground mb-7">
         You are now an applicant. Follow your application and, once invited, book your interview from your workspace.
       </p>
       <AuthButton onClick={() => navigate('/admin')}>Go To Your Workspace</AuthButton>
     </div>
   </div>
   ```

No other files touched. Kept `rounded-lg` for consistency with the other Apply card; the existing `overflow-hidden` clips the canvas to the rounded corners.
