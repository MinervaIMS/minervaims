workspace-preview.png

Drop the workspace mock-up (desktop screen, laptop and phone, on white)
in this folder with exactly this filename.

It is referenced by src/components/shared/WorkspaceSection.tsx as a
RUNTIME path rather than a bundled import, so the site builds and the
section reads correctly whether or not the file is present: if it is
missing the figure removes itself and the text stands on its own.

A white or transparent background suits the section, which sits on the
site's own white ground. Around 2000px wide is plenty.
