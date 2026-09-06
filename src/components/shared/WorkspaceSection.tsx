import { useState } from 'react';

// =====================================================================
// WorkspaceSection — the association's own workspace, on the public site.
// ---------------------------------------------------------------------
// USED ON TWO PAGES, WHICH IS WHY IT IS A COMPONENT.
//
// The homepage runs it last, for a reader who has taken in what Minerva
// does and is now wondering how it is actually operated. /join runs it
// immediately before the FAQs, where it answers a different question
// from the same facts: an applicant reading about the selection has just
// been told the whole of it happens in here, and the last thing they
// read before the FAQs is what joining gives them access to.
// ---------------------------------------------------------------------
// The homepage says what the association researches, how its funds have
// done and who its alumni are. It said nothing at all about the thing the
// association is actually run ON, which is a mistake in both directions:
// a prospective member cannot see that Minerva operates like an
// institution rather than a student club, and a current member has no
// public page describing the tool they use every week.
//
// It follows the site's own section grammar exactly, which is what keeps
// it from reading as a bolt-on: the serif heading over a hairline rule
// (`border-b border-separator`), the body measure beneath it, and the
// image below the text rather than beside it. That last part is
// deliberate and was asked for: a screenshot of an interface needs the
// full width of the column to be legible at all, and a two-column
// arrangement would have given it half.
//
// ---------------------------------------------------------------------
// THE PICTURE IS A RUNTIME PATH, NOT AN IMPORT.
//
// `public/media/workspace/workspace-preview.png` is fetched by URL rather
// than bundled through `@/assets`, for one specific reason: an import
// that cannot be resolved FAILS THE BUILD, and this image is supplied
// separately from the code. A runtime path means a missing file costs the
// section its illustration and nothing else. `onError` then removes the
// frame entirely, so what a visitor meets is a complete section of text,
// never a broken-image icon on the homepage.
//
// To serve it through the project's asset pipeline instead, import the
// generated `.asset.json` and point `PREVIEW_SRC` at its `url`. That is
// the whole of the change; nothing below refers to the path again.
// =====================================================================

const PREVIEW_SRC = '/media/workspace/workspace-preview.png';

export function WorkspaceSection() {
  // Starts true and is only ever turned off, so the frame is reserved on
  // the first paint and removed only if the file genuinely is not there.
  const [hasImage, setHasImage] = useState(true);

  return (
    <section
      aria-labelledby="workspace-section-heading"
      className="bg-background py-section-sm md:py-section"
    >
      <div className="container">
        <h2
          id="workspace-section-heading"
          className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent"
        >
          The Minerva Workspace
        </h2>

        <div className="max-w-3xl space-y-5 font-body text-body md:text-body-lg leading-relaxed text-muted-foreground">
          <p>
            The Society is run from a workspace we built and maintain ourselves. Recruiting lives
            in it end to end, from the application form on this website through screening,
            interviews and offers; so does the research, from the templates each division writes
            to the archive every published report is filed in.
          </p>
          <p>
            Events, the shared calendar, the member register, the funds' figures and the
            association's accounts are all held in the same place, by the people responsible for
            them, with a role deciding what each member can see and change.
          </p>
          <p className="text-foreground">
            It is also how the alumni network is reached. This site shows a selection; active
            members open the workspace and consult the whole of it, every former member of the
            Society and where their career has taken them, which is not published to the public.
          </p>
        </div>

        {hasImage && (
          // =========================================================
          // THE BOX IS RESERVED BEFORE THE PICTURE ARRIVES.
          //
          // The image is lazy, because it is the last thing on the
          // homepage and nobody should download it to read the section
          // above it. A lazy image with no reserved height is zero
          // pixels tall until it loads and then suddenly is not, which
          // is a layout shift at the foot of the page and, here, was
          // also why the figure appeared to be missing entirely.
          //
          // `aspect-[1.9/1]` with `object-contain` reserves the shape
          // the mock-up actually has WITHOUT depending on it: an image
          // of slightly different proportions is fitted inside the same
          // box rather than cropped or stretched, and the letterboxing
          // is invisible because the ground it falls on is the white the
          // section already stands on.
          // =========================================================
          <figure className="mt-10 md:mt-14 aspect-[1.9/1] w-full">
            <img
              src={PREVIEW_SRC}
              alt="The Minerva Workspace shown on a desktop screen, a laptop and a phone: the shared calendar, the member dashboard and the report archive."
              loading="lazy"
              decoding="async"
              onError={() => setHasImage(false)}
              className="h-full w-full object-contain"
            />
          </figure>
        )}
      </div>
    </section>
  );
}

export default WorkspaceSection;
