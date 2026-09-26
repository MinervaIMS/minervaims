// =====================================================================
// The two prompts of Career > LinkedIn, word for word as the association
// wrote them. "Copy prompt" copies exactly this text.
// ---------------------------------------------------------------------
// ABOUT_PROMPT: attach your CV and paste this into an advanced assistant
// (ChatGPT, Claude or similar) to get a LinkedIn About section.
//
// PORTRAIT_PROMPT: attach, in this order, a square photograph of yourself
// in formal clothes (IMAGE 1) and the background (IMAGE 2), then paste
// this into an image-capable assistant to get a square profile picture.
//
// To change a prompt, edit the text between the backticks.
// =====================================================================

export const ABOUT_PROMPT = `TASK
Using the CV attached by the user, write a LinkedIn About section that feels personal, intelligent, understated and genuinely written by the person themselves.
The user MUST provide their CV. Treat the CV as the primary factual source.
Do not simply summarise the CV, convert bullet points into sentences, or produce a conventional professional biography.
The objective is to discover the person behind the CV and turn the strongest underlying themes into a short, memorable first-person narrative.

CORE PRINCIPLE
The rest of the LinkedIn profile already explains what the person has done.
The About section should primarily explain:
- what they care about;
- why certain experiences matter to them;
- what seems to motivate them;
- how they relate to other people;
- what recurring qualities connect apparently different parts of their life;
- and, subtly, what kind of person someone would be meeting if they contacted them.
Think of the CV as evidence, not as the structure of the final text.
Do not attempt to mention everything.
A strong About section should make the reader understand the profile better after reading it, rather than simply know more facts.

STEP 1 — READ THE CV DEEPLY
Before writing, analyse the entire CV.
Identify:
1. Current identity
   - What is the person currently studying or doing?
   - What environment are they operating in?
   - What seems central to their life at present?
2. Recurring themes
   Look for patterns across unrelated experiences.
   Examples might include:
   - teaching or helping others;
   - building communities;
   - intellectual curiosity;
   - research;
   - leadership;
   - competition;
   - creativity;
   - responsibility;
   - entrepreneurship;
   - precision;
   - teamwork;
   - public service;
   - craftsmanship;
   - exploration;
   - resilience;
   - mentoring;
   - building systems;
   - bringing people together.
   Do not mechanically use these labels in the final text. They are analytical tools.
3. The strongest human story
   Determine which experience provides the best emotional or intellectual centre of gravity.
   This will often NOT be:
   - the most prestigious employer;
   - the highest numerical achievement;
   - the most technically impressive project.
   It may instead be:
   - a leadership experience;
   - teaching;
   - a long-running extracurricular activity;
   - something the person built;
   - something that reveals how they treat other people;
   - an experience that connects their past and present.
4. Evidence of character
   Look especially at extracurricular activities, hobbies, volunteering, teaching, sport, artistic interests, societies and unusual side projects.
   Ask what each activity shows rather than merely what it is.
   For example:
   - A team sport may reveal trust, discipline or responsibility.
   - Teaching may reveal patience and enjoyment in helping others understand difficult things.
   - Writing may reveal curiosity beyond the person's main academic or professional field.
   - Running an organisation may reveal an interest in creating opportunities for other people.
   - Research may reveal persistence with questions that do not have obvious answers.
   Use such interpretations only where reasonably supported by the CV.
5. Interesting contrasts
   Look for combinations that make the person multidimensional.
   For example:
   - quantitative work + art;
   - finance + teaching;
   - engineering + music;
   - research + competitive sport;
   - medicine + entrepreneurship;
   - leadership + an individual creative pursuit.
   These contrasts often make the best About sections because they prevent the person from sounding one-dimensional.

STEP 2 — FIND THE NARRATIVE
Do not organise the About section chronologically.
Instead, construct a narrative around approximately 2–4 ideas.
A particularly effective structure is:
Paragraph 1 — The human starting point
Begin with something personal but professionally relevant.
This may be:
- something the person has learned;
- something other people gave them;
- an observation about their field;
- a reason they became interested in what they do;
- a small contradiction;
- an understated reflection.
The first sentence should create curiosity.
Avoid openings such as:
I am a highly motivated student...
I am passionate about finance...
Results-driven professional with...
Currently pursuing...
My journey began...
Ever since I was young...
Do not begin by reciting education, job title or credentials unless there is an unusually compelling reason.

Paragraph 2 — The central experience
Introduce the experience that best represents the person.
Rather than describing responsibilities mechanically, explain why the experience matters.
Bad:
As President of X, I manage 100 members and organise events.
Better conceptual direction:
What matters to me about leading X is creating for newer members the kind of environment that helped me when I first arrived.
The actual wording must, of course, depend on the CV.
This paragraph should subtly transform achievement into motivation.
Where the CV contains large numbers, awards, prestigious organisations, technical details or impressive outputs, resist the temptation to reproduce all of them.
Use a number only when it materially improves the story.

Paragraph 3 — The person outside the obvious career track
Use one or two extracurricular activities, hobbies or secondary experiences to create dimension.
Do not write a hobby list.
Instead, connect an activity to something it reveals about the person.
For example:
Outside economics, I spend much of my time playing in an orchestra. It is probably the place where I am most regularly reminded that listening matters as much as performing.
This is much stronger than:
My interests include music, travelling and reading.
Where possible, allow apparently unrelated activities to quietly reinforce a recurring personal characteristic.
Do not force profound lessons onto ordinary hobbies. If no meaningful connection exists, simply describe them naturally.

Paragraph 4 — Open ending
End by making the profile feel accessible.
The ending should make it easy for another student, professional, researcher, founder, recruiter or simply someone with a shared interest to contact the person.
Keep this understated.
Examples of the type of ending desired:
- openness to conversations;
- exchanging ideas;
- meeting over coffee;
- discussing a shared interest;
- hearing from people working on interesting problems.
Do not turn the ending into a job-search announcement unless the CV or user's instructions specifically justify one.
Avoid:
Feel free to connect!
Let's connect and create synergies.
I am always looking to expand my network.
Please reach out for exciting opportunities.
The reader should feel invited rather than solicited.

STYLE
Write in the first person.
The voice should be:
- intelligent;
- warm;
- reflective;
- concise;
- conversational;
- self-aware;
- confident without self-promotion;
- specific rather than generic;
- polished but not corporate.
The text should feel like something an articulate person could genuinely say aloud.
Prefer short and medium-length sentences.
Occasional longer sentences are welcome where they create rhythm.
Contractions are allowed and often desirable:
- I'm
- I've
- I'd
- isn't
- don't
Natural sentence fragments may occasionally be used for emphasis.
For example:
Same patience, same open door.
But use this sparingly.

TONE: UNDERSTATEMENT OVER SELF-PROMOTION
Where possible, let the facts carry the prestige.
Avoid explicitly telling the reader that the person is:
- exceptional;
- ambitious;
- high-achieving;
- driven;
- passionate;
- dynamic;
- results-oriented;
- hardworking;
- analytical;
- a natural leader;
- a team player;
- an excellent communicator.
Instead, write something that allows the reader to infer those characteristics.
Do not say:
Leadership has always been one of my greatest strengths.
Show what the person does when responsible for other people.
Do not say:
I have a passion for continuous learning.
Show what they voluntarily spend time learning.
Do not say:
I thrive in team environments.
Describe an experience where trust between teammates matters.

DO NOT TURN THE CV INTO A PARAGRAPH
Avoid constructions such as:
I am currently studying X at University Y. Previously, I worked at Company A, where I did B. I also served as President of Organisation C and completed Project D.
That information belongs in Education and Experience.
Likewise, avoid excessive references to:
- grades;
- GPAs;
- rankings;
- test scores;
- transaction values;
- portfolio returns;
- software;
- technical methodologies;
- certifications;
- awards;
- employer prestige.
They can occasionally appear when central to the narrative, but they should not dominate the About section.

PRESERVE HUMAN SPECIFICITY
Concrete details make the writing believable.
Prefer:
the people who stayed after class to explain something I still didn't understand
over:
the mentors who supported my professional development.
Prefer:
writing about contemporary art
over:
pursuing diverse intellectual interests.
Prefer:
catching teammates on the way down
over:
developing teamwork and interpersonal skills through sport.
When the CV provides a concrete reality, use it.
Do not unnecessarily translate human experiences into corporate vocabulary.

INFERENCE RULES
You may infer themes from the combination of facts in the CV, but distinguish between reasonable interpretation and invented biography.
You MAY infer, for example, that:
- repeated teaching roles suggest the person values helping others learn;
- sustained leadership suggests they care about the organisation beyond merely joining it;
- years committed to a sport indicate that the activity is meaningful to them;
- parallel artistic and technical activities reveal breadth of interests.
You MUST NOT invent:
- childhood stories;
- mentors;
- personal hardships;
- family circumstances;
- emotional events;
- motivations unsupported by evidence;
- conversations that may never have happened;
- personal beliefs;
- career ambitions not apparent from the CV;
- personality traits that cannot reasonably be inferred.
If a motivation would require inventing facts, omit it.
A simple, true sentence is preferable to a compelling fictional one.

AVOID LINKEDIN CLICHÉS
Do not use, unless absolutely unavoidable:
- passionate about
- driven by
- results-driven
- dynamic
- fast-paced environment
- thought leader
- changemaker
- lifelong learner
- growth mindset
- leveraging
- synergise
- impactful
- making an impact
- navigating
- journey
- intersection of X and Y
- where X meets Y
- at the crossroads of
- fascinated by
- deeply passionate
- committed to excellence
- proven track record
- thrive
- unlock
- empower
- innovative solutions
- meaningful connections
- like-minded individuals
Also avoid excessive em dashes and rhetorical constructions characteristic of generic AI writing.

IMPORTANT: DO NOT OVER-PROFESSIONALISE THE PERSON
A student should sound like an unusually thoughtful student, not a Fortune 500 CEO.
An early-career professional should not sound as if they are delivering a keynote speech about their philosophy of leadership.
A senior professional can naturally carry greater authority, but the writing should remain personal.
Calibrate the voice to:
- age;
- career stage;
- actual responsibility;
- industry;
- cultural context.

PRIORITISATION
When choosing what to include, use roughly this hierarchy:
1. Human motivations and recurring themes
2. Important responsibilities toward other people
3. Distinctive extracurricular activities or interests
4. Intellectual interests
5. Career or academic direction
6. Major achievements
7. Technical detail
This hierarchy is intentionally different from a CV.

LENGTH
Default target:
180–300 words.
It may be shorter if the profile is early-stage or the CV contains limited material.
Do not make it longer simply because the CV is impressive.
Every paragraph must add a new dimension.
Aim for approximately 3–5 short paragraphs.

FINAL QUALITY TEST
Before returning the text, silently check:
The CV deletion test
If the Experience and Education sections disappeared from the LinkedIn profile, would this About section still tell me something meaningful about the person?
The duplication test
Is this repeating facts already obvious from the CV rather than interpreting them?
The dinner test
Could the person reasonably say most of this in conversation without sounding rehearsed?
The specificity test
Could the exact same About section be given to 50 other ambitious students or professionals?
If yes, rewrite it with more individual detail.
The humility test
Does the reader discover that the person is accomplished, or is the writer constantly telling them?
Prefer discovery.
The evidence test
Can every factual statement be traced to the CV?
If not, remove it unless explicitly provided by the user outside the CV.
The AI test
Remove sentences that sound:
- overly symmetrical;
- excessively polished;
- motivational;
- corporate;
- grandiose;
- full of abstractions.
Introduce natural variation in sentence length and structure.

OUTPUT
Return:
1. LinkedIn About
Write only the finished About section here.
It must be immediately usable on LinkedIn.
2. Narrative rationale
After the draft, briefly explain in 3–5 bullets:
- which CV experiences you selected;
- which recurring themes you identified;
- why certain impressive CV items were deliberately omitted;
- how the hobbies/extracurriculars contribute to the narrative.
This rationale is for the user and must NOT be part of the LinkedIn About section.

FINAL INSTRUCTION
The goal is not to make the person sound impressive.
The CV already handles that.
The goal is to make the reader feel that they have met the person behind the CV — and understand why the different pieces of that CV belong to the same individual.`;

export const PORTRAIT_PROMPT = `PROFESSIONAL PORTRAIT STANDARDISATION — STRICT IMAGE-EDITING TASK

You are given two images:

IMAGE 1 — SUBJECT / PORTRAIT SOURCE
This is the authoritative photographic reference for the person.

IMAGE 2 — BACKGROUND SOURCE
This is the authoritative photographic reference for the background that must appear in the finished portrait.

Your task is to create a polished, professional, square 1:1 portrait by carefully extracting the intended person from IMAGE 1, placing them naturally into IMAGE 2, and centring them within the final composition.

This is an IMAGE EDITING AND COMPOSITING task, not a portrait-generation task.

The absolute priority is to preserve the subject exactly as they appear in IMAGE 1.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ABSOLUTE PRIORITY — IDENTITY PRESERVATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The person from IMAGE 1 must remain unmistakably and faithfully the same person.

DO NOT redesign, reinterpret, beautify, retouch, reconstruct, idealise, stylise or “improve” the person's face.

Treat the face, head, hair and identifying characteristics in IMAGE 1 as LOCKED photographic information.

Where technically possible, preserve the original photographic information rather than regenerating it.

The objective is to move the existing person into a different background — NOT to create a new AI interpretation of that person.

Preserve with maximum fidelity:

• face shape
• facial proportions
• forehead
• temples
• jawline
• chin
• cheekbones
• cheeks
• nose shape
• nose width
• nose length
• nostrils
• mouth shape
• lip shape
• lip volume
• eye shape
• eye size
• eye colour
• distance between the eyes
• eyelids
• eyelashes
• eyebrows
• ears
• hairline
• hairstyle
• hair volume
• curls, waves and individual characteristic hair patterns
• facial hair
• beard
• moustache
• stubble
• skin texture
• skin tone
• natural facial asymmetries
• moles
• marks
• lines
• wrinkles
• characteristic features
• gaze direction
• facial expression
• apparent age

DO NOT alter the subject's expression.

DO NOT make the subject smile if they are not smiling.

DO NOT make the expression more serious, friendlier, more confident, more relaxed or more corporate.

DO NOT alter the direction of the eyes.

DO NOT modify facial symmetry.

DO NOT modify any facial proportions.

DO NOT perform facial beautification.

DO NOT perform cosmetic retouching.

DO NOT:
• smooth the skin
• remove natural skin texture
• remove blemishes
• remove moles
• whiten the teeth
• whiten the eyes
• enlarge the eyes
• reduce the eyes
• change the nose
• narrow the nose
• modify the lips
• change eyebrow shape
• reshape the jaw
• strengthen the jawline
• alter the cheekbones
• modify facial width
• change skin colour
• change complexion
• make the person younger
• make the person older
• change facial hair
• change the hairline
• add hair
• remove hair
• change hairstyle
• make hair neater
• apply beauty filters
• apply glamour retouching
• artificially sharpen facial features
• reconstruct facial details that already exist clearly in the source photograph

Do not “correct” natural asymmetries.

Natural asymmetry is part of the person's identity and must remain.

IDENTITY PRESERVATION HAS PRIORITY OVER AESTHETICS.

If there is ever a conflict between:
A) making the resulting portrait aesthetically more perfect,
and
B) preserving the exact appearance of the person,

always choose B.

A slightly imperfect composite with an accurate person is preferable to a beautiful image with altered facial traits.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. DO NOT REGENERATE THE SUBJECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Approach this as photographic compositing.

Keep as much of the actual visible subject from IMAGE 1 as possible.

Do not create a new person inspired by IMAGE 1.

Do not create an approximate likeness.

Do not reinterpret facial details using generative assumptions.

Do not substitute the face with a synthetic reconstruction.

Do not use generic “professional headshot” facial characteristics.

Do not modify the subject to fit a corporate-headshot stereotype.

The subject must still look like the original photograph, simply placed into a better and standardised environment.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. SUBJECT SELECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMAGE 1 may contain:

• one person
• several people
• a group photograph
• another person partially visible
• distracting objects
• a white background
• a coloured background
• an outdoor environment
• an indoor environment
• an unsuitable professional background

Extract only the intended main subject.

If the user explicitly identifies the intended person, use that person.

If there is only one obvious primary subject, use that person.

All other people must be completely removed from the final image.

Do not retain fragments belonging to other people, including:

• arms
• shoulders
• hair
• clothing
• shadows
• hands
• suit fragments
• partial faces
• silhouettes
• reflections

The final portrait must contain only the intended subject.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. SUBJECT EXTRACTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Carefully isolate the subject from IMAGE 1.

The original background must not remain visible.

This applies equally whether IMAGE 1 contains:

• a pure white background
• a studio backdrop
• another building
• an outdoor landscape
• a university environment
• an office
• other people
• a complex background

If IMAGE 1 has a WHITE BACKGROUND:

Treat all white surrounding the person as removable background.

Do not leave a white outline around:

• hair
• shoulders
• suit
• ears
• neck
• clothing

Do not interpret the white background as part of the subject.

Pay exceptional attention to extraction around:

• individual hairs
• curls
• fine hair
• flyaway hairs
• ears
• glasses
• shoulders
• suit lapels
• shirt collars
• ties
• jewellery

Preserve genuine fine hair detail whenever visible.

Do not create a hard artificial cut-out edge.

Do not create a visible masking halo.

Do not create transparent-looking hair.

Do not blur the outline of the person excessively.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. CLOTHING MUST REMAIN THE SAME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Preserve the subject's existing clothing from IMAGE 1.

The user deliberately provides their best available photograph in formal clothing.

DO NOT redesign the outfit.

DO NOT replace the suit.

DO NOT change the jacket.

DO NOT change the shirt.

DO NOT change the tie.

DO NOT change accessories.

DO NOT “upgrade” the clothing.

Preserve, where visible:

• suit colour
• suit fabric
• suit texture
• lapel shape
• lapel width
• jacket construction
• shirt
• collar
• tie
• tie knot
• tie colour
• tie pattern
• buttons
• jewellery
• watches
• glasses
• accessories

Do not create a different corporate outfit.

If part of the clothing needs to be minimally completed because it was physically obscured by another person or by the original crop, reconstruct only the minimum necessary area and make it fully consistent with the visible original clothing.

Never use this as an opportunity to redesign the outfit.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. BODY AND POSTURE PRESERVATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Preserve the person's natural:

• body proportions
• shoulder width
• neck width
• neck length
• head-to-body ratio
• posture
• stance

Do not artificially:

• broaden the shoulders
• narrow the shoulders
• make the person taller
• make the person slimmer
• make the person more muscular
• improve posture through anatomical reconstruction
• enlarge the head
• reduce the head

Minor translation and uniform scaling of the entire extracted subject are allowed for compositional purposes.

Anatomical changes are not.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. BACKGROUND — USE IMAGE 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMAGE 2 is the exact visual reference for the final background.

Use IMAGE 2 as the background.

Do not invent a similar office.

Do not invent another university building.

Do not produce a generic corporate-office environment.

Do not substitute IMAGE 2 with an AI interpretation of a modern office.

The purpose of this workflow is to create a STANDARDISED SERIES OF PORTRAITS in which different people appear photographed against essentially the same visual environment.

Preserve the supplied background's:

• architecture
• structural geometry
• perspective
• composition
• glass surfaces
• vertical structural divisions
• horizontal architectural lines
• lighting
• ceiling lights
• colours
• tonal balance
• depth
• blur
• perspective
• atmosphere

For the supplied standard background specifically:

Preserve its modern glass-and-steel interior architecture.

Preserve the cool blue-grey overall palette.

Preserve the softly defocused glass panels.

Preserve the characteristic horizontal structural lines.

Preserve the vertical glass divisions.

Preserve the subtle warm rectangular ceiling lights.

Preserve the distant bright areas and overall architectural depth.

The background should remain recognisably the supplied background image.

Do not substantially redesign it.

Do not make it significantly sharper.

Do not make it busier.

Do not increase background contrast unnecessarily.

Do not introduce new architectural objects.

Do not add:

• desks
• chairs
• plants
• paintings
• screens
• logos
• text
• signs
• furniture
• decorations
• new lights
• fake windows
• additional people
• office objects that are not present in the background reference

The background should remain visually subordinate to the person.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. BACKGROUND BLUR AND DEPTH OF FIELD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Maintain the shallow-depth-of-field appearance of the supplied background.

The subject must remain clearly sharper than the background.

Do not sharpen distant architectural details.

Do not make the background compete visually with the subject.

At the same time, do not create unrealistic or excessive synthetic blur.

The blur should resemble a real portrait photograph taken with optical depth of field.

Preserve the existing character of IMAGE 2.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. SUBJECT POSITION — PERFECT CENTRING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The final image must be SQUARE: 1:1 aspect ratio.

The person must be precisely and deliberately centred.

Place the vertical centreline of the person's face approximately on the vertical centreline of the final canvas.

The head, neck and torso should feel visually centred.

Correct an off-centre source photograph by moving the extracted subject inside the new composition.

DO NOT change anatomy or pose to achieve centring.

Use translation and uniform scale only.

The final composition should feel symmetrical and intentional.

Ensure comfortable and balanced negative space on both sides.

Avoid having the person visibly shifted left or right.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. PROFESSIONAL CROPPING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create a consistent, formal corporate portrait crop.

The image must be 1:1 square.

The composition should generally show:

• the complete head
• all hair
• neck
• shoulders
• upper torso

Do not crop through the hair.

Do not place the top of the head too close to the upper edge.

Leave comfortable breathing space above the hair.

Do not crop excessively tightly around the face.

Do not leave excessive empty space around the person either.

As a general target, the visible person should occupy approximately 65–75% of the image height, adapting intelligently to the original photograph.

The eyes should sit naturally in the upper-middle part of the composition.

The result should resemble a high-quality:

• professional team portrait
• investment-firm profile portrait
• university society leadership portrait
• company-directory headshot
• executive biography portrait

It should NOT resemble:

• a passport photo
• an ID photograph
• a tightly cropped CV photo
• a casual social-media portrait
• an AI-generated studio headshot

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. BACKGROUND ALIGNMENT BEHIND THE HEAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When positioning IMAGE 2 behind the subject, maintain the identity of the background while choosing the most visually balanced crop possible.

Avoid having a strong vertical architectural line appear to grow directly out of the centre of the person's head.

Avoid distracting high-contrast structural elements directly behind:

• the eyes
• face
• head
• shoulders

The background can be repositioned or cropped minimally where necessary to produce a balanced portrait, while still clearly preserving IMAGE 2.

Do not redesign the background to accomplish this.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. SCALE AND PERSPECTIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Make the person appear naturally photographed in front of the supplied environment.

Maintain realistic perspective.

Avoid:

• an oversized head
• an undersized body
• exaggerated shoulders
• unnaturally narrow shoulders
• stretched anatomy
• compressed anatomy
• wide-angle distortion
• artificial perspective correction to the face

If scaling is necessary, scale the complete subject uniformly.

Never independently resize facial features.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. LIGHTING INTEGRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Integrate the existing subject into the supplied background naturally.

However:

DO NOT materially relight the face.

DO NOT repaint facial shadows.

DO NOT create new dramatic facial lighting.

DO NOT change the direction of the original facial lighting unless absolutely necessary for basic compositing coherence.

Preservation of facial appearance takes priority over perfect lighting integration.

Minor global adjustments are acceptable where necessary:

• overall exposure
• overall white balance
• subtle colour temperature
• overall contrast
• edge integration

Keep these changes minimal.

Whenever possible, apply adjustments globally rather than selectively modifying the face.

Do not create:

• dramatic rim lighting
• cinematic lighting
• artificial studio lighting
• orange-and-teal grading
• glamour lighting
• artificial highlights on the face
• artificial shadows across the face
• excessive skin brightness

The finished photograph should have understated, neutral, realistic professional lighting.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. COLOUR CONSISTENCY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do not substantially recolour the person.

Preserve:

• real skin tone
• hair colour
• eye colour
• suit colour
• shirt colour
• tie colour

Make only minimal colour corrections required to integrate the portrait naturally with the background.

The final image should have a neutral and realistic colour balance.

Avoid:

• excessive warmth
• excessive coolness
• desaturation
• cinematic colour grading
• HDR-style treatment
• artificial contrast
• strong skin-tone modification

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15. EDGE INTEGRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The composite must look like a genuine photograph rather than a cut-out placed over another image.

Carefully integrate:

• hair
• ears
• neck
• shoulders
• suit edges

Avoid:

• white halos
• dark halos
• green-screen-style edges
• hard masking edges
• excessive edge softness
• colour contamination
• blurred hair
• transparent hair
• cut-out-looking shoulders
• background blur leaking onto the person

Hair extraction is especially important.

Preserve visible fine hairs and curls.

Do not replace difficult hair edges with a simplified AI-generated hairstyle.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16. IMAGE QUALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Preserve maximum useful resolution and photographic detail.

The final image must remain photographic.

Do not transform the portrait into:

• CGI
• digital painting
• illustration
• 3D rendering
• stylised photography
• synthetic “AI headshot” aesthetics

Avoid:

• excessive sharpening
• oversmoothing
• fake skin detail
• synthetic pores
• HDR
• aggressive denoising
• artificial clarity
• exaggerated microcontrast

Do not fabricate details that are already clearly represented in IMAGE 1.

Natural photographic imperfection is preferable to artificial detail.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
17. CONSISTENCY ACROSS THE PORTRAIT SERIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This portrait belongs to a STANDARDISED PROFESSIONAL PORTRAIT SERIES.

Every person processed through this workflow should appear as though photographed for the same organisation, using the same photographic setup.

Maintain consistency across different subjects in:

• square 1:1 format
• background
• background blur
• head size
• approximate subject scale
• amount of torso visible
• headroom
• centring
• composition
• visual balance
• overall colour treatment
• professional photographic style

Do NOT make every person's face look stylistically similar.

Consistency applies to the photographic setup and composition — NOT to people's physical characteristics.

Each individual's appearance must come exclusively from their own supplied IMAGE 1.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
18. IF THE SOURCE PHOTO HAS OTHER PEOPLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If IMAGE 1 is a group photograph:

Extract the intended person only.

Completely remove neighbouring people.

Where another person overlaps the subject, reconstruct only the absolutely necessary hidden portions of:

• clothing
• shoulder
• arm
• torso

Do NOT reconstruct or modify the subject's face unless a facial area is genuinely absent from IMAGE 1.

If the face is already completely visible, it must remain unchanged.

Do not use neighbouring people's anatomy as reference for the subject.

Do not preserve shadows or colour contamination caused by neighbouring people where these clearly belong to the removed individuals.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
19. IF THE SOURCE HAS A WHITE BACKGROUND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A pure-white or nearly white source background is perfectly acceptable.

When IMAGE 1 has a white background:

1. isolate the person precisely;
2. remove the white background completely;
3. preserve genuine hair-edge detail;
4. remove white fringe around hair and clothing;
5. place the person naturally into IMAGE 2;
6. preserve the subject's original facial appearance exactly.

Do not interpret white pixels surrounding the silhouette as part of the person's hair, clothing or body.

Do not produce a pasted-on effect.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
20. DO NOT ADD OR CHANGE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Unless strictly required to repair an area hidden by the removed background or another person, do not invent anything.

Do not add:

• accessories
• glasses
• jewellery
• facial hair
• makeup
• additional hair
• pocket squares
• different ties
• different shirts
• different suits
• badges
• pins
• logos

Do not remove genuine details from the source portrait.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
21. FINAL QUALITY-CONTROL CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before producing the final image, internally verify all of the following:

1. The final person is unquestionably the same individual shown in IMAGE 1.

2. Facial geometry has not changed.

3. Facial proportions have not changed.

4. The person's expression has not changed.

5. Eye shape has not changed.

6. Eye colour has not changed.

7. Nose shape has not changed.

8. Mouth and lip shape have not changed.

9. Jawline has not changed.

10. Skin texture has not been beautified.

11. Natural asymmetries have been preserved.

12. Facial hair has not changed.

13. Hairstyle and hairline have not been redesigned.

14. Apparent age has not changed.

15. Clothing remains faithful to IMAGE 1.

16. Body proportions remain faithful to IMAGE 1.

17. Other people from IMAGE 1 have been completely removed.

18. The original unwanted or white background has been completely removed.

19. There are no visible extraction halos.

20. Fine hair edges look natural.

21. IMAGE 2 is clearly and faithfully used as the background.

22. The background has not been replaced with a generic office.

23. The background maintains its original soft depth of field.

24. The person is precisely horizontally centred.

25. The subject scale is appropriate for a professional portrait.

26. There is appropriate headroom.

27. The crop is square 1:1.

28. The portrait looks natural rather than artificially generated.

29. The finished image is visually consistent with the other portraits in this professional series.

30. No aesthetic “improvement” has been made at the expense of identity accuracy.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL PRIORITY ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When making any decision, use this priority order:

1. PRESERVE THE PERSON'S IDENTITY AND FACIAL TRAITS.
2. PRESERVE THE PERSON'S ORIGINAL EXPRESSION.
3. PRESERVE THE PERSON'S HAIR AND CLOTHING.
4. CLEANLY REMOVE THE ORIGINAL BACKGROUND AND OTHER PEOPLE.
5. USE THE SUPPLIED BACKGROUND FAITHFULLY.
6. CENTRE THE PERSON.
7. CREATE CONSISTENT PROFESSIONAL FRAMING.
8. INTEGRATE THE SUBJECT NATURALLY INTO THE BACKGROUND.
9. IMPROVE AESTHETICS ONLY WHEN THIS DOES NOT MODIFY THE SUBJECT.

The face must never be changed merely to improve the photograph.

The person must not be reimagined.

The person must not be beautified.

The person must not become a synthetic approximation of themselves.

The intended result is:

THE SAME PERSON,
THE SAME FACE,
THE SAME EXPRESSION,
THE SAME HAIR,
THE SAME FORMAL CLOTHING,

carefully extracted from the original photograph,

then naturally centred and composited into the supplied standard professional background,

with a clean, consistent, square corporate-portrait composition.

Produce ONE final high-quality 1:1 portrait.`;
