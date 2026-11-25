// =====================================================================
// How to use: a role-based user manual generated from the same guide
// content and access matrix that run the workspace, so it always matches
// what THIS user can actually see and do. Downloadable as Markdown.
// =====================================================================
import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Sparkles, ShieldCheck, BookOpen, Check, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { GUIDE, type GuideEntry } from '@/lib/workspace-guide';
import {
  COMMON_TASKS, GLOSSARY, HOW_IT_WORKS, PAGE_DETAIL, ROLE_BRIEFS, TROUBLESHOOTING,
} from '@/lib/workspace-manual';
import { SPECIAL_RULES, MEMBERS_DIVISION_VIEW_ROLES, CROSS_DIVISION_VIEW_ROLES } from '@/lib/access/matrix';
import { roleLabel, divisionLabels, normalizeRole } from '@/lib/roles';
import { logActivity } from '@/lib/activity-log';
import { startTour, toursDone, toursFor } from '@/lib/workspace-tours';

interface ManualSection { section: string; entries: (GuideEntry & { canManage: boolean })[] }

// How the workspace is organised, independent of role.
const AT_A_GLANCE = [
  'Your role decides not only which pages you see but what you can do on each. On a page you may read but not change, the editing controls are faded and inert rather than failing when pressed; everything that only changes what you see keeps working.',
  'The navigation is organised in sections, each holding subsections. You only ever see the pages your role can access, so nothing in your menu is off limits.',
  'The fastest way anywhere is the search bar in the header, or Ctrl K (Cmd K on a Mac). It finds subsections and help topics, and it also searches INSIDE the workspace: members, alumni, events, reports and the resource libraries. Type a person\'s name and you get the person, not just the page they are on. Every result is limited to what your role can open, and no search is even sent for a part of the workspace you cannot reach.',
  'One role drives everything. It is assigned by the President or Admin in Settings, Users, which edits the same record as People, Members: a change made in either place appears in both immediately. Nobody can change their own role.',
  'Help lives where you work: the floating question mark on every page opens the sliding help panel for that page, and the small circled question marks next to specific controls open the panel directly at the matching topic. Everything you read there is generated from the same source as this manual, for your role only.',
  'On a phone the workspace becomes a compact shell: the bar at the bottom holds Menu, My Profile, My Events and Search, the pages of a section are chips at the top, and Back to website is in the upper right corner. Nothing is withheld on a phone that you could see on a computer, and every page works there as your role allows, except the Dashboard and the Calendar, which are read on a phone rather than changed. Wide tables are dragged sideways rather than trimmed.',
  'Links of the form /admin?section=...&sub=... open the workspace directly on a subsection, provided your role can see it. Some website buttons use them to bring you to the right place in one click.',
  'Every meaningful action is recorded in Settings, Activity log, together with the role you held at that moment.',
];

// What changed recently, so returning members catch up at a glance.
// Newest first. Kept to what a person would actually notice: a change
// nobody can see from a page does not belong in a manual about pages.
const RECENT_IMPROVEMENTS = [
  'The top left corner of the workspace shows your picture, your name and, under it, your role; a name too long for the room slides through and fades at its edges instead of being cut. My Profile, Personal Information opens straight on your details, without the band above them.',
  'Recruiting, Applicant Preview shows their workspace live on a computer, a tablet (on its side or upright) and a phone, each at its real size (Full size opens it as large as the window allows), and draws the stages as a journey: Play the journey walks through them, and the device says each time their menu gains a page.',
  'People, Time Machine has the Minerva Chronometer at the top: set the season and the year, press Travel, and it lands on that semester with how many people, divisions and who was President, opening it below.',
  'People, Time Machine names each role the same way in every semester (Portfolio Management Analyst, Equity Research Team Leader), and lists the records that may be one person (Matteo Persico and Matteo Luigi Persico) for the President and the Vice-President to join or keep apart. Names that differ only by accents were joined, so reports now reach Rezan Bağcıoğlu\'s record.',
  'Events, Attendance recognises alumni and former members among the guests: when a guest\'s name is somebody we know, it asks "Same person?" in the walk-in form, on the list and in Attendance from Teams, and a guest confirmed is shown as Alumnus or Former member.',
  'Copy link in Events, Registration forms and in Operations, Forms gives a short link, minervaims.org/e/K7F2QX or minervaims.org/f/9DMW4T, that fits anywhere and can be read out; the long links keep working.',
  'Fields the workspace fills in for you say From the records until you change them: the alumni of a new alumni call (now with their current position, and a clear note when their former division no longer exists) and the authors\' roles in Reports, Upload report (a member\'s current position, an alumnus\'s role at Minerva).',
  'Operations, Membership fees: a collection is opened for a semester chosen from the list (Fall or Spring and the year), never typed, and closing it freezes the register of that semester even when it closes late. The collection called Autumn 2026, opened by mistake beside Fall 2026, was removed, with no email sent.',
  'The fund charts on the website (the homepage, Portfolio Management and each fund\'s page) have a Drawdowns switch: each spell below a previous high is shaded from the high to the month it was regained, with a strip of how far below the high each month stood and a table of the spells.',
  'The website search on a phone opens its keyboard at the first tap, keeps the box in view above the keyboard, and dims the page in grey rather than purple.',
  'People, Alumni: every alumnus is now in one of twelve career areas (Investment Banking & Advisory, Sales & Trading, Asset & Wealth Management, Private Markets, Hedge Funds & Trading Firms, Research & Economics, Risk & Quantitative, Consulting, Corporate & Industry, Entrepreneurship, Academia, Other), worked out from the job area and the company and corrected by hand under Edit, Career area. The register filters by area (Not recorded finds those to complete), and the public Alumni page and Minerva\'s Track Record use the same twelve instead of sixty job areas as typed.',
  'People, Members can be ordered by the events attended this semester, most or fewest first, from the menu beside the search or by pressing the Events heading (for the roles that see the Events column), or by surname; the choice is remembered on the device.',
  'The help panel offers its guided tour at the very top, and the tours are easier to follow: the part being described is outlined in white with one slow pulse, on a computer the card points at it, and on a phone the card is a sheet at the foot of the screen, with the part described always kept in view above it; swipe the card to move between the steps.',
  'On a phone the bar at the bottom floats over the page and takes less room, and Back to website in the upper right corner is the globe alone.',
  'The public website has a search, in the header of every page (the magnifier, or press / or Ctrl K): reports and their authors, the current members, the events, the readings and every page, as you type, with mistakes and short forms understood. An alumnus is found only through the reports that carry their name, never with an employer or a profile.',
  'Events, Attendance: PDF, beside CSV, prints the door list to keep at the entrance in case the connection, the server or the phones fail: everybody registered, alphabetical by surname, with a box to tick, on the Society\'s letterhead, and a ruled page for walk-ins.',
  'Events, Attendance keeps up with a busy door: every tick is saved however quickly people are ticked (a tick made while another was still being saved used to be lost), a guest added twice or already on the list is ticked instead of failing, and the scanner reads tickets in a dim room and no longer slows the phone down there.',
  'Recruiting, Applicant Preview shows what an applicant sees and receives at every stage, with a sample applicant (Michael Burry): the applicant\'s own pages, with a sample CV and written answer, and every email they are sent, as it is sent. Bookings and offer answers can be tried there; nothing is saved or sent. It is open to every role that can open Candidates Screening.',
  'My Profile, Membership now shows where your membership fee stands: paid or still to pay, the amount, the deadlines and how to pay. The fee emails and the Dashboard open it with See your fee status, and the fee emails now say that members on a semester of leave or on exchange pay too.',
  'On the Dashboard, the fee card is shown only while your fee is still to pay, with the latest report beside it; once it is recorded, the card moves on to the next thing.',
  'The search offers the last three pages you opened before you type, and on a phone its keyboard opens by itself.',
  'On a phone the bar at the bottom is Menu, My Profile, My Events and Search; Back to website is in the upper right corner; notifications appear above the bar; the read-only line and the Welcome back message are gone; and the Calendar no longer scrolls sideways.',
  'How To Use now starts with guided tours: a tour opens the real page, dims everything else and points at one part at a time. Three are for everybody, starting with "Find your way around"; then each role is offered one tour for each part of the workspace it works in, covering only the pages it opens and saying where it can read but not change. Esc leaves a tour at any step.',
  'How emails are sent is explained in six points on How To Use: what starts an email, that a window asks before a button sends one, the timetable of the reminders, who is left out on purpose and where to check what was sent.',
  'The help panel now sits beside the page instead of over it: with the help open, every button still answers the first click, and on a computer the page moves over to make room. Esc closes it. Its topics open one by one, and the rest of How To Use opens heading by heading.',
  'A dropdown with nothing to choose from now says so, instead of opening as a thin empty strip. The Time Machine and the Alumni page say when they could not be read, instead of going blank.',
  'Security: each page\'s data can now be read only by the roles that open the page, including by somebody asking the database directly; the functions that send the association\'s emails can be called only by the workspace itself; registering for an event and applying are limited per network address, far above what people do.',
  'People, Members, Download CSV now always includes this semester\'s event attendance for the roles that see the Events column: events attended, events held, the attendance rate, registered but not present, and the lists of the events attended and missed, each in its own column. The download waits for the attendance and says so if it could not be loaded.',
  'Two more Bocconi addresses are accepted everywhere a Bocconi address is asked for (signing up, applying, and events open to the Bocconi community): @phd.unibocconi.it and @sdabocconi.it, with @studbocconi.it, @master.unibocconi.it and @unibocconi.it.',
  'Who can register now has three choices, the same in Events, Create event and in Registration forms, each with its (?): Members only, Bocconi community only and Public. Bocconi community only replaces Members & other students: members, and anybody else who registers with a Bocconi address (@studbocconi.it, @master.unibocconi.it, @unibocconi.it, @phd.unibocconi.it or @sdabocconi.it); any other address is refused, by the form and by the server. Events already set to Members & other students become Bocconi community only.',
  'Minerva in Numbers and the Track Record are now one public page, Minerva\'s Track Record (/track-record; the old address /numbers leads to it). It reads topic by topic (People, Research, Funds, Events) with the legal pages\' index on the left, or Contents on a phone, and a button in each topic to the page it leads on to. Each figure is exact and carries a small number pointing to its definition in the notes at the foot, and the members and alumni of every past semester are in a table.',
  'The "in numbers" sections at the foot of the website pages round a figure of ten or more down to its first two digits with a plus (166 reads 160+, 2,113 reads 2,100+); figures under ten stay exact. Only horizontal lines separate the figures now.',
  'A report\'s own page opens on a light version of the dot background, with a clear navigation bar and the title in the Society\'s purple. On the Portfolio Management page, How we work now comes before MIMS Virtual Funds.',
  'A report author who has no entry on the website, for example somebody who has left, now links to the archive showing that author\'s reports; authors picked from Members or Alumni still link to their entry. Pablo Panizza is in People, Alumni.',
  'Operations, Membership Fees is a full register: name, email, division, role, phone and fee, with a search and filters on the fee, the division and the role. The President can exempt somebody from the open collection from More on their row: they owe nothing, receive no reminder and are not written into that semester\'s register.',
  'In Events, Attendance the Selection of a company visit shows, beside each person, the events they attended this semester as People, Members counts them; press the number for the list.',
  'Creating an alumni call fills in each alumnus\'s company and their role and division at Minerva from the records, and every field can still be changed for the call. The (?) beside the alumni says where wrong records are corrected. Status, Responsible person and Internal notes are gone from alumni calls.',
  'The phone call invitation and every page about it now ask candidates to come prepared to talk about why they want to join Minerva specifically, how the Society is organised, its events and what membership involves.',
  'The number of places of an event, the places left and the waiting list are shown only to the people who organise events (those with Create Event or Attendance); everybody else, on the website and in the workspace, sees whether places are limited and whether the event is full. On an event\'s registration page the moderator and each guest are listed one per line.',
  'The website\'s page about companies is now Company relations (/company-relations), and a new Partnerships page lists the agreements with other student associations, edited in Website, Partnerships. Both are in the footer and in the site map, and Contacts gives each its own section.',
  'A report whose title has an accent, an apostrophe, a slash or another special character now downloads under its title, instead of failing.',
  'Operations, Treasury no longer moves sideways: its two buttons are stacked at the top right, as on every other page.',
  'Advisors are outside the membership fee everywhere, including the reminder email after the first deadline, and the database now holds the rule, so no page and no direct edit can give an advisor a fee to pay. People, Time Machine no longer marks an advisor "not in the register".',
  'On a computer the workspace is drawn at 90%, the size it has after one press of Command + Minus (Ctrl + Minus on Windows): more of every page fits on the screen, and nothing in it is arranged differently. The rest of the website keeps its size, phones and tablets keep theirs, and your browser\'s zoom still works as usual on top of it. In a browser that cannot yet draw it correctly (some versions of Safari), the workspace stays at its full size.',
  'Operations, Membership Fees is open in full to the Operations Analyst: opening the semester\'s collection, ticking who has paid, exporting the list and closing it, as the Head of Operations does.',
  'The website opens faster. The first screen of the homepage (the header, the logo and the three figures) is now part of the page itself, so it appears before the rest of the site has loaded, and on a phone the intro plays from the very first moment; the rest of the page follows below it. Pictures are sent at the size they are shown, and the dots under the website\'s carousels are one control: press anywhere along them, or use the arrow keys.',
  'Career, IB Questions is open: 347 investment banking interview questions in two banks, the RedBook (Wall Street Prep, 202 questions) and Banker Blueprint (Breaking Into Wall Street, 145), each with its own subjects and subsections. Choose an answer, check it, and read the guide\'s explanation with its page; flag questions, keep notes and follow your progress by subject and subsection.',
  'IB Questions has Practice: a session of 10, 20, 50 or all the questions you choose, in a random order, with your score at the end and the ones you got wrong or flagged to try again in one press.',
  'Each IB guide can be downloaded from The guide, as your own copy with your name, email and the date on every page, as the greenbook is. The President uploads them; the President, the Vice President and the Head of Operations correct and add questions.',
  'Every page of the workspace now works in full on a phone, as your role allows: the Website pages (Pages, Readings, Testimonials, History, FAQs, Newsletter, Automatic Emails) were the last. The Dashboard and the Calendar stay as they were approved, read only on a phone.',
  'Readings can be reordered with a finger on the handle, or with Move up and Move down under More; deleting a reading is asked in the workspace\'s own window. In Testimonials, History, FAQs and Newsletter the action that cannot be undone is under More, last and in red.',
  'Page titles now match the menu: Upload Report, Report Archive, Templates & Repositories, Editorial Calendar, Ads & Spending, Automatic Emails, How To Use.',
  'Social Media and Operations work in full on a phone: the Editorial Calendar (open an item to move it or change its status, or choose a day and press Add an item), Social Templates, MIMS Graphics, the Design System, Ads & Spending, Membership Fees (press a member\'s line to tick the fee as paid), Treasury, Forms, External Relations and Statute & Documents.',
  'Ads & Spending and Treasury read as a card per entry on a phone, with the amount on the right; in Forms the rarer actions of a form wait under More, Delete last and in red.',
  'Reports and Career work in full on a phone: Upload Report (its Publish button stays at the foot of the screen), the Report Archive, Templates & Repositories, Fund Performances, Division Pages, CV & Cover Letter and LinkedIn.',
  'In the Report Archive each report shows Publish (where it applies) and Edit; Unpublish, Block, Unblock and Delete report are under More, last and in red. Deleting a report, deleting a fund year and removing a reference month are asked in the workspace\'s own window instead of the browser\'s grey box.',
  'Fund Performances keeps the year on the left and the actions on the right while the twelve months scroll sideways; on a phone the Report Archive\'s filters sit two to a line, so the reports start a screen higher.',
  'People and Settings work in full on a phone: Members, the Time Machine, Alumni, Invites, Users, Role Permissions, the Activity Log, Certificates and Declarations. Their registers become a card per person or entry, with Details for the rest and the filters behind one Filters button; the commitment board above Members folds to one line.',
  'Removing a member, an alumnus, an account, revoking an invitation and withdrawing a certificate are under More, the button with three dots, last and in red, and each asks first. Deleting an alumnus is asked in the workspace\'s own window instead of the browser\'s grey box.',
  'Role Permissions keeps the roles at the top and the subsections on the left while the grid scrolls, on a computer and on a phone, with a fade that shows there are more roles to the right.',
  'Every page of Events works in full on a phone: My Events, Create Event (its Create button stays at the foot of the screen), Registration Forms, Attendance, the Event Archive and Association on Display.',
  'Deleting is asked in the workspace\'s own window, which says what goes with it, instead of the browser\'s grey box: an event in the Event Archive, a day in Association on Display. Removing somebody from an Attendance list now asks first too, and waits under More with the other rare actions, away from the tick box.',
  'In Registration Forms each event shows Preview and Copy link; stopping the reminders and testing the emails are under More.',
  'Recruiting works in full on a phone: Candidates Screening, Interview Calendar, Phone Calls and Offers show a card per person, with Open at the foot, and their filters are behind one Filters button. On a computer the header of Candidates Screening and Offers stays at the top as you scroll, and the name column stays in view when the register scrolls sideways.',
  'A line above Candidates Screening and Offers says how many people are showing out of how many and names every filter that is on, with a cross to remove each. The two recommendations on Candidates Screening are now one band, each opening on its own.',
  'Rare actions that cannot be undone now wait under More, the button with three dots, last and in red: Withdraw the offer in Offers, and Clear all in the Interview Calendar, which no longer sits under Open a slot. In the Interview Calendar the month stays in view beside the slots on a computer, and its days are large enough to tap on a phone.',
  'On a phone the workspace now has a bar at the bottom: Menu, Dashboard, My Events, My Profile and Search. Back to website and Sign out are at the foot of the Menu, and the chip of the page you are reading is always in view at the top. The three pages of My Profile can now be changed on a phone, and more pages follow as each is made to work in full there: Settings, Mobile view lists them.',
  'Applicants can use their whole workspace on a phone: booking an interview or a phone call, answering an offer and withdrawing. Their bar shows Status, the latest of Interview, Phone Call and Offer that is open to them, Profile and FAQs, and their Status page shows the next step under the status.',
  'The workspace can be installed as its own app, Minerva Workspace: open the workspace on a phone or a computer and choose Add to Home Screen (or Install). It opens on the workspace, with shortcuts to the Calendar, Attendance and My Profile.',
  'People, Rosters is now People, Time Machine: every past semester from Fall 2019, the Board first, with the frozen semester registers that used to sit in People, Members. A name in the Time Machine, Members or Alumni opens the person\'s record: their career inside Minerva, their reports and their alumni entry.',
  'The round help button no longer covers the end of a page: every page leaves room for it below its last row. Dates in Ads & Spending and in Treasury now read like the rest of the workspace, for example 15 Oct 2026.',
  'My Profile is now three pages, in the navigation under it: Personal Information (your details, your role and your promotion), Membership (the role you held each semester, the reports you worked on and your certificate) and Commitment (the semester commitment, everything you have signed, the one-association policy while the Board asks for it, and the Statute). A band at the top of each shows who you are and what is waiting for you. Details are changed one at a time, with Change beside each, and the semester commitment can be answered from a phone.',
  'The one-association declaration now follows Bocconi\'s own list: members do not belong, at the same time, to another Bocconi student association in the categories Management, Finance, or Economics and Social Sciences, as the list stands at the time. The declaration links to the list, and declarations signed on the earlier wording still read that wording.',
  'Every published report now has its own permanent page on the website, /archive/ followed by its title and year, with its authors, summary, type, tags, the PDF and a ready citation. Reports, Report archive shows each report\'s address, and the address is fixed once the report is published, so old links and citations keep working.',
  'Reports, Report archive edits a report\'s authors (picked from Members and Alumni, or typed by name), its tags and its type. Select several reports to change their type or tags in one go, and use Missing details to find the reports without authors, a summary or a type. Check the PDFs writes the same title, authors, summary and keywords into each PDF file itself, keeping the original in a private copy.',
  'Reports, Fund performances asks only for the monthly returns: YTD, ITD, volatility and the Sharpe ratio are computed from them, by the same function as the website. A Profiles tab holds each fund\'s inception, method and positions, and a References tab the market indices and the €STR, which Fill the €STR from the ECB fills in one press.',
  'Reports, Division pages (Heads for their own division; the President, the Vice President and the Head of Asset Management for any) sets what each public division page says under How we work, and which three reports it shows as Flagship work.',
  'The website has a public Track record page (/track-record, in the footer and on About): research by year and division, the funds, events and speakers, members and alumni, with how each figure is counted.',
  'The website now states Minerva in figures: a new public page, Minerva in Numbers (/numbers, in the footer under Explore), and a black "in numbers" section at the foot of each main page. Every figure is computed automatically every night from what the workspace already records: published reports and their pages, the roster, the alumni directory, the events and the recruiting rounds. Nobody types a figure, and each one shows its exact value with a definition and a date.',
  'Events, Create Event has a new type, Company visit: use it for visits to firms, which the website counts. Guest speakers are counted from the guests named on each event, so name them as "Name - role at firm".',
  'Website, History: a number card whose caption names alumni, reports, members or events now shows that figure from Minerva in Numbers, and its final value is in the page from the start. The homepage and Join figures still count up as they did before.',
  'Alumni calls are events: create one in Events, Create Event with the type Alumni call, with the same poster, online link, registration, places, reminders and website switch as any event, plus the alumni (from the directory or typed by hand), where the call stands, the responsible person and internal notes. The separate Alumni Calls page is gone; its address opens the Event Archive filtered to alumni calls, where every past call is, with its alumni, poster and status.',
  'An alumni call can be saved before its date is known (Date to be confirmed): it waits in the Event Archive, off the website and out of the Calendar, until its date is set. The Heads of Division and the Head of Asset Management create and change alumni calls only; the Head of Operations now plans them too.',
  'The date, the time and the meeting link of an alumni call stay internal: the public Events page, the archive and the Alumni page list a call without them. Alumni calls appear once in the Calendar and the editorial calendar, as events, and work like any event for registration, reminders, the QR check-in, the Teams attendance report and the events-attended count.',
  'Events, Attendance: a member ticked under their name alone (a walk-in, a Teams row, a hand-made addition) now counts in People, Members and in Events, My events, exactly as the door list recognises them. A name two members share reads Needs linking and counts for nobody until you press it and choose the member; any other mark can be pressed to correct it.',
  'Events, Attendance stays open until the end of the event\'s semester (31 January for Fall, 31 August for Spring), never less than two weeks after the event, and the page says "Editable until" with the date. After that only the President and the Vice President can correct it, and their changes are recorded.',
  'Settings, Activity log records every change made in the workspace, by anybody, and the downloads that matter (exports, candidates\' documents, Forms answers\' files, certificates, the greenbook), each once. It reads the whole of the last ninety days, which is how long entries are kept.',
  'General, My Profile: former members listed among the alumni can download a certificate of membership for the last semester they served. A certificate now reads as no longer valid once its holder is neither among the members nor among the alumni.',
  'Operations, Internal Forms is now Forms, and a form can be for members, for guests outside the Society, or for both. Guests answer from the link with their name and email, no account needed, and receive a receipt with a private link back to their answer. The old address still works.',
  'Forms can take more than one item in an answer: under the questions, "Want another one?" asks them again for a second hoodie, a third, up to five, each with its own size and colour. The total counts every item, the answers table lists each item on its own numbered line, and the export can give one row per item.',
  'Events, Attendance: for an online event, upload the attendance report from Microsoft Teams and the people who joined are matched to members (by email, then by name) and to guests. Check the list, untick anyone, and record them in one go.',
  'Career, CV & Cover Letter: the CV and the cover letter templates are now one page with a tab each, both loaded at once so switching is immediate. The old addresses open the right tab.',
  'Career, Brainteasers: the greenbook tab says what the greenbook is, who it is for and why it matters before you download it.',
  'Career, Brainteasers: hundreds of interview questions from trading firms, with worked solutions. Filter by type and by firm, try each one before opening its solution, mark what you solved and what needed help, flag the hard ones, keep notes and follow your progress by type and firm. The greenbook is downloadable as your own copy, with your name on every page.',
  'Events, My events: your own record of the semester. Register for open events in one click (or cancel), see which events you attended and which you missed, and who to tell if your attendance was not recorded correctly.',
  'The link to an online event is now private: only the people registered get it, in their confirmation, again in the "See you tomorrow" email the day before, and as a Join button on the Dashboard, in My events and in the Calendar. Everyone else sees "Online".',
  'People, Members: press a member\'s number in the Events column to see which events they attended and which they missed.',
  'The receipt of an internal form reads at a glance: whether it arrived and can still be changed, the order with its total, how to pay, then the answers. Organisers can send themselves a test receipt from Settings.',
  'Internal forms take orders properly: a cover picture, pictures between questions and a picture on each choice; "how many of each" for every colour picked, counted by size; prices per choice with the member\'s total shown as they answer and kept with their answer; and questions shown only for some answers, such as the name to print only if a name is wanted. The answers summary gives the supplier\'s table of each colour by size, and the export a column for each.',
  'A form waiting for your answer now takes the place of Research by division on the Dashboard, with its picture; several forms make a stack you swipe through, as on an iPhone. Once you answer, or the form closes, the card goes back to what it was.',
  'Online events: the meeting link is now required when an event is online, and every registration confirmation carries it in a box of its own, with a Join button and the address to copy. The public website shows only "Online".',
  'Operations, Internal Forms: forms for the Society\'s active members, for an order, a sign-up or interest in a company visit. The President, the Vice President, the Head of Operations and the Operations Analyst build them from a blank page or a starter, with twelve kinds of question including photos and documents, a deadline, an optional payment and a message for after sending. Members find open forms on their Dashboard and receive a receipt of their answers by email. Answers are read in a summary that counts and totals them, or in a table with search, a payment filter and a Paid box per answer, and are exported as Excel or CSV with exactly the answers and columns chosen, files included as a ZIP.',
  'A new role, Operations Analyst, assists the Head of Operations and runs the internal forms; beyond them, the access is the Media Analyst\'s. Offers from the joint Media & Communication and Operations intake can appoint one.',
  'Events, Attendance now opens on the nearest event that is not over yet, the one happening now or else the next to come, instead of the newest one created.',
  'Career opens with Smart Tracker, coming next semester and by August 2027 at the latest: members will be able to share, with their consent, tips and tricks from online assessments, HireVue video interviews and interviews.',
  'Social Template is now called Social Templates; old links keep working.',
  'Social Media, Social Templates brings Instagram, LinkedIn and Other Resources together as three tabs of one page, and the Design System is back on a page of its own. Your access to each is unchanged, and old links, including the Brand & Social ones, open the right place. Each library now remembers, on this browser, whether you like it as a grid or a list and in which order, and pictures with transparent backgrounds, such as a white logo, are shown on a dark backdrop so they can be seen.',
  'Every file library is rebuilt: Social Templates, MIMS Graphics, Templates & repositories, External relations and Statute & documents. Search finds an item by its title, note, text, file name or author; type chips with counts (Images, PDFs and documents, Spreadsheets, Links, Contacts...) narrow the list; pictures show as pictures in Grid, and List fits more in a column. Each item shows its type, size and who added it when, and opens to show everything it holds, with preview, download and copy. Tick several items to download them as one ZIP.',
  'Uploading is done in bulk: drop files anywhere on a library, or press Upload files, and each is listed with a title read from its name before anything is sent, then uploaded with its own progress. Files that cannot be taken are named with the reason, and a failed one can be retried on its own. The note on an item is now optional.',
  'Captions on Instagram and LinkedIn copy in one press and show their length against the platform\'s limit.',
  'Both calendars can now show three months at once, the current month and the two after it (3 months, beside Month), and they open faster: the Calendar asks for everything it needs at the same time, and a page you have already opened in this session appears at once while it refreshes.',
  'The Calendar and the Editorial calendar are rebuilt. The Calendar now opens with Register for events: every upcoming event you can still sign up for, each with its own Register button, beside the events you are registered or waiting for, and How registration works explains the four steps from the button to the door. Below it the calendar shows one month at a time, as a grid or as an agenda (a phone opens on the agenda), with filters that double as the key, and any item opens a panel with its details and the action that follows. The Editorial calendar shows each item\'s status and platforms at a glance, offers Month, Board and List views, keeps undated ideas in Unscheduled, shows the association\'s events on their days, and lets the Media team drag items to reschedule them or move them along.',
  'Several phones can scan tickets at the same door: the count in the scanner is shared and updates every few seconds, and a ticket scanned twice is checked in once. Without signal the scanner keeps going: tickets are saved on the phone with the time of the scan and sent by themselves when the connection returns. Attendance can now be edited for two weeks after an event, and Association on Display days count in the Events column of People, Members. Interview bookings carry Add to calendar, for the candidate and the examiner, and their emails give times such as 6:30 pm CEST. The roles Member and Advisor no longer receive the reminders about upcoming events or the profile reminder, which now says exactly what is missing, explains how to make your photo with Career, LinkedIn, and comes at most twice a semester.',
  'Events can now have a number of places (Registration forms, Places; empty means no limit, as before). When an event is full, people join a waiting list, and the first person waiting takes any place that frees up, with their ticket by email. Every confirmation now has Add to calendar (Apple Calendar, Google Calendar, Outlook or any other app) and a "Can\'t make it?" link, also in the reminder the day before; the Calendar offers both too. The door scanner is rebuilt: it fills the screen, asks for the camera from your tap, explains how to allow it on your phone if it is blocked, and can always read a photo of the ticket instead. Settings, Certificates previews each certificate, and People, Members shows full-access roles how many of this semester\'s events each member attended.',
  'Tickets at the door: every event registration now comes with an entry code, a QR code in the confirmation email and again in the reminder the day before. In Events, Attendance, Scan tickets reads it with a phone or laptop camera and ticks the person as present, with the time; ticking by hand works as before. The Media Analyst can now take attendance and has full access to the editorial calendar, and with the Head of Media and Communication reads the member register and the alumni directory. Invites is now reserved to the President and the Vice President, with advisors able to read it.',
  'Every time in the workspace is written one way, on Rome\'s clock with the zone named, such as 6:30 pm CEST: events, interview slots, Association on Display, the logs and the event emails, whatever your own device is set to. The Design System page now shows the full design system chapter by chapter and offers the whole package as a ZIP. Settings, Certificates lists every certificate of membership, where the President and the Vice President can withdraw one with a reason and restore it. The public check at minervaims.org/verify fits one screen and leads back to the homepage.',
  'My Profile gives every active member a certificate of membership: a one-page PDF on the Society\'s letterhead with the full logo, your name, your current role and the semester, a description of the Society and its independence from Bocconi University, signed by the President and the Vice President on behalf of the Board of Directors. Its number and QR code can be checked by anybody at minervaims.org/verify. The Dashboard shows a new member a Getting started checklist in the place of Research by division: profile and photo, LinkedIn, role brief and statute, an introduction to the Head of Division, and the division\'s latest reports; the steps tick themselves and can be ticked by hand. Guests who attend an event now receive a thank-you from the President the next morning at 9:00 am, and in dark mode every email shows the logo and the society name in white.',
  'The CV and cover letter previews keep their size when the pointer passes over them, and fill more of the page. A bar above the preview switches between Fit width (with the percentage it uses) and 100%, the real size of the page, and Full view opens the document large in its own window.',
  'Career now sits right under My Profile, and its pages fit the screen: nothing scrolls but the cards themselves, with the main buttons filled so they are easy to find. The CV and cover letter previews fill the width of the preview and set the dates exactly on the right margin; downloads of the templates are tracked. The LinkedIn cards are aligned row by row and the prompts are copied rather than shown. Two pages are announced for the end of the semester: GMAT Resources and IB Questions. My Profile now takes your LinkedIn link, shown on the public Members page.',
  'A new Career section, open to every member, advisor and alumnus. CV Template and Cover Letter Template show the association\'s templates page by page beside their disclaimer, with the download; the material is for Minerva members only. LinkedIn gives you a prompt for your About section, a prompt and the Minerva background for your profile picture, and a gallery of banners to download. GPA Converter reads a grade across twenty-two grading systems of Italy, the rest of Europe, the UK and North America, the Bocconi exam and degree scales included, works out your weighted average and what the next exam will do to it, and saves your averages to your account, where only you can see and compare them. It works in full on a phone.',
  'A division can now stop taking applications before the round ends. Recruiting, Application page carries a switch for each of the six divisions the form offers: switch one off once its places are filled and it disappears from the application form immediately, while the Join page congratulates the students joining it and says the other divisions are still open. Closing the last one ends the round exactly as the closing date would, and asks for confirmation first. It controls the public form only: a Head can still move an applicant into a closed division from Candidates screening.',
  'Everybody who can open Recruiting, Candidates screening now sees every application in the semester, Team Leaders and Portfolio Managers included. What each role may DO is unchanged: they read and add notes, exactly as before.',
  'The roles that manage Candidates screening - the President and Admin, the Vice President, the Head of Asset Management and the Heads of Division - can move ANY candidate to a different division, not only the ones their own division is assessing, which is what reassignment is for. Advancing, inviting and rejecting still belong to the division doing the assessing.',
  'Opening a candidate in Recruiting, Candidates screening now shows, underneath them, every automatic email the association has sent to their address, with the date, the time and whether it arrived. A bounced or suppressed invitation explains a silence that otherwise looks like a candidate who is not interested.',
  'Recruiting, Interview calendar narrows to the slots that are booked in one press, and the candidate who booked one is opened by clicking their name: their CV, their written answer, the notes and the status control, so the outcome of an interview is recorded where the interview is. Slots nobody booked are removed once their time has passed; the ones that were booked are kept as the record of who was seen and when.',
  'The register of automatic emails is searchable by recipient and filterable by which email it was, how it ended and when, over the whole register rather than the last few days of it.',
  'The whole workspace now opens on a phone. Every page your role can see is there to read, including the recruiting pipeline, the treasury, the user list and the activity log, which used to ask for a computer; pages built for a wide screen keep all their columns and are dragged sideways rather than trimmed. What a phone does not do is edit: every control that changes something is withheld, for every role, and a ribbon on each page says so.',
  'Recruiting, Candidates screening opens a candidate with arrows to the one before and the one after, so a screening round is read straight through without returning to the table between candidates. They follow the order the table is showing, filters included.',
  'Where your role may look but not change, the controls that would change something are now faded and cannot be pressed: create and add buttons, the edit and delete icons on a row, publishing switches, the Save at the foot of a form. Searching, filtering, sorting, downloading, opening a record to read it and registering yourself for an event all keep working. Previously those buttons looked live and failed only after you had filled in the form.',
  'Recruiting, Candidates screening has a new first column: "Evaluated for", the division actually assessing a candidate, kept apart from the two divisions they asked for. It starts as their first choice and can be changed to any research division or to Media or Operations, including one the candidate never named. Changing it returns them to "To be invited", releases the interview slot they were holding, and tells them in their own workspace which division is now considering them. A candidacy runs in at most two divisions: after one move, the only way left is back. The circled question mark beside the column explains the whole process.',
  'Advisors are outside the membership fee entirely. They appear in no collection, count towards no total, receive no fee deadline on their Calendar or Dashboard, and enter no semester member register. Appointing a member as advisor part way through a semester removes the fee they had not yet paid; a payment already banked is never deleted, and the fee page says so where it happens.',
  'Advisors can now read the whole workspace and change none of it, apart from their own profile. Settings stays closed to them: an outside adviser has no business in the association\'s access control or its audit trail.',
  'Team leaders are published as Team Leaders. The public Members page had been printing them as Senior Analysts, which is a different rank of the association, and several older head-of-division roles were appearing as plain analysts. Both are fixed for every division.',
  'Investment Research members can carry a desk, Equities, Fixed Income or FX & Commodities, shown after their position on the public site exactly as Portfolio Management already showed its funds. Assign it in People, Members.',
  'Moving a member to alumni asks only for their surname and graduation year. The current company is optional and can be filled in later; wherever an alumnus\'s employer is shown, including on alumni calls, it is now read live from the alumni register rather than copied once and left to go stale.',
  'Events, Event archive offers only the event types it actually contains, so every option in the filter leads somewhere, and registered alumni calls now appear in it.',
  'A candidate accepts their offer by writing their name in full and submitting it, rather than pressing a confirmation button.',
  'Every filtered list can be cleared in one press. The button appears only when something is filtered and says how many filters are on.',
  'Fund performances feed the charts on the public fund pages and on the Portfolio Management page, and protect the published track record: only the last 15 calendar months are editable, and once every month of a year is locked the whole year freezes.',
  'Recruiting, Form & Questions is one unified page: the division questions, with the fixed form inspected through "Preview the form". Heads of Division edit their own division only, and questions lock automatically while applications are open.',
  'Roles stay in step everywhere: People, Members and Settings, Users edit the same record, and workspace permissions follow instantly.',
  'This manual and the sliding help panel are generated from the same guide, so both already reflect all of the above, for your role only.',
];

// =====================================================================
// A PART OF THE MANUAL THAT FOLDS (Step 106).
// ---------------------------------------------------------------------
// The manual was one page of every section open at once: complete, and
// long enough that the part somebody came for was a scroll away under
// parts they did not. Each part is now a heading that opens. The page
// is a list of headings first, and reading second. Find in page (Ctrl F)
// still reaches the words inside a closed part in the browsers that open
// it for a match, and the downloaded manual carries everything open.
// =====================================================================
function Fold({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <details className="group border-b border-separator">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-2 [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <h2 className="font-serif text-heading text-accent">{title}</h2>
        <span className="flex shrink-0 items-center gap-3 font-body text-sm text-muted-foreground">
          {note && <span className="hidden sm:inline">{note}</span>}
          <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" aria-hidden="true" />
        </span>
      </summary>
      <div className="pb-6 pt-2">{children}</div>
    </details>
  );
}

export default function HowToUse() {
  const { session } = useAuth();
  const access = useAccess();

  const roleName = access.primaryRole ? roleLabel(access.primaryRole, access.primaryDivision) : 'Member';
  const divisionName = access.primaryDivision && access.primaryDivision !== 'none' ? divisionLabels[access.primaryDivision] : null;

  // Only the subsections this user can at least view, with their real level.
  const manual = useMemo<ManualSection[]>(() => {
    const bySection = new Map<string, ManualSection>();
    for (const g of GUIDE) {
      if (!access.canView(g.key)) continue;
      const s = bySection.get(g.section) ?? { section: g.section, entries: [] };
      s.entries.push({ ...g, canManage: access.canManage(g.key) });
      bySection.set(g.section, s);
    }
    return [...bySection.values()];
  }, [access]);

  // The role's own facts, said once at the top rather than left to be
  // inferred from forty page descriptions.
  const roleFacts = useMemo(() => {
    const role = access.primaryRole ? normalizeRole(access.primaryRole) : null;
    const brief = role ? ROLE_BRIEFS[role] : undefined;
    const specials = role
      ? SPECIAL_RULES.filter((r) => r.roles.includes(role) && access.canView(r.resource))
      : [];
    const scoped = !!role && MEMBERS_DIVISION_VIEW_ROLES.includes(role);
    const crossDivision = !!role && CROSS_DIVISION_VIEW_ROLES.includes(role);
    return { role, brief, specials, scoped, crossDivision };
  }, [access]);

  // Reference material is filtered exactly as the per-page manual is: a
  // block whose subject is a page you cannot open is not printed, so
  // nothing here describes a part of the workspace you will never meet.
  const concepts = useMemo(
    () => HOW_IT_WORKS.filter((c) => !c.requires || access.canView(c.requires)),
    [access],
  );
  const tasks = useMemo(
    () => COMMON_TASKS.filter((t) => (t.level === 'manage' ? access.canManage(t.requires) : access.canView(t.requires))),
    [access],
  );
  // The guided tours this reader can follow, and the ones already taken
  // on this device (Step 106).
  // Fitted to this reader's role: a tour of an area is offered only to a
  // role that works there, and covers only the pages it can open.
  const tours = useMemo(() => toursFor(access), [access]);
  const startTours = useMemo(() => tours.filter((t) => t.kind === 'start'), [tours]);
  const roleTours = useMemo(() => tours.filter((t) => t.kind === 'role'), [tours]);
  const [doneTours] = useState<string[]>(() => toursDone());
  // The emails explanation is shown on its own, ahead of the reference.
  const emailsConcept = useMemo(() => HOW_IT_WORKS.find((c) => c.id === 'emails'), []);
  const otherConcepts = useMemo(() => concepts.filter((c) => c.id !== 'emails'), [concepts]);

  const glossary = useMemo(
    () => GLOSSARY.filter((g) => !g.requires || access.canView(g.requires)),
    [access],
  );
  const answers = useMemo(
    () => TROUBLESHOOTING.filter((a) => !a.requires || access.canView(a.requires)),
    [access],
  );

  // =================================================================
  // THE DOWNLOAD IS THE MANUAL, NOT A SUMMARY OF IT.
  // -----------------------------------------------------------------
  // It used to print each page's purpose and its two lists of actions,
  // and stop. The TOPICS - a hundred and three of them, and the part of
  // the guide that actually explains how a control behaves and what it
  // costs to get wrong - were shown in the sliding help panel and left
  // out of the file entirely. So the document people download, and the
  // document people paste into an AI assistant to have explained, was
  // the thinnest version of the guide that exists.
  //
  // It now carries everything: the reference sections above, the role's
  // own rules, every page with all of its topics, the tasks that cross
  // pages, the vocabulary and the questions people ask when something
  // looks wrong. Written in the order somebody reads rather than the
  // order the navigation happens to be in.
  //
  // IT IS WRITTEN TO BE READ BY A MODEL AS WELL AS BY A PERSON. That is
  // not a stylistic note, it is why the reference sections exist at all:
  // asked "how do I move a candidate", a model given only page
  // descriptions will produce something plausible and wrong, because the
  // rule it needs was never in the file. Stating the rules is what makes
  // the answers it gives correct.
  // =================================================================
  const buildMarkdown = () => {
    const lines: string[] = [];
    const push = (...l: string[]) => lines.push(...l);

    push(`# Minerva workspace manual: ${roleName}`, '');
    push(`Generated for your role${divisionName ? ` (${divisionName})` : ''} on ${new Date().toLocaleDateString('en-GB')}.`, '');
    push('This manual describes exactly the parts of the workspace your role can reach, and what you can do in each. Anything it does not mention is something your role cannot do.', '');
    push('> If you are reading this inside an AI assistant: this file is authoritative and complete for this role. Where it does not say something, the right answer is that the role cannot do it, rather than an inference from how similar systems usually work.', '');

    push('## Contents', '');
    push('1. Your role');
    push('2. How the workspace works');
    push('3. The workspace at a glance');
    push('4. Your pages, one by one');
    push('5. Common tasks');
    push('6. When something looks wrong');
    push('7. Glossary');
    push('8. Recent improvements');
    push('');

    // 1 -------------------------------------------------------------
    push('## 1. Your role', '');
    push(`You are signed in as **${roleName}**${divisionName ? `, in ${divisionName}` : ''}.`, '');
    if (roleFacts.brief) push(roleFacts.brief, '');
    const sectionNames = manual.map((s) => s.section).join(', ');
    push(`You can open ${manual.reduce((n, s) => n + s.entries.length, 0)} subsections across these sections: ${sectionNames}.`, '');
    const managed = manual.flatMap((s) => s.entries.filter((e) => e.canManage).map((e) => e.label));
    const readOnly = manual.flatMap((s) => s.entries.filter((e) => !e.canManage).map((e) => e.label));
    if (managed.length) push(`**Full interact** (you can create, edit, delete and publish): ${managed.join(', ')}.`, '');
    if (readOnly.length) push(`**Interact only** (you can read and use light actions, but not change anything): ${readOnly.join(', ')}.`, '');
    if (roleFacts.scoped) push('**Division scoping.** On the report pages and in the members register you see your own division. Reports, templates and archives are limited the same way.', '');
    if (roleFacts.crossDivision) push('**Cross-division view.** On the report pages you can look beyond your own division.', '');
    if (roleFacts.specials.length) {
      push('**Rules that apply specifically to your role:**', '');
      roleFacts.specials.forEach((r) => push(`- ${r.label}`));
      push('');
    }
    push('You cannot change your own role, from any page. That is enforced on the server as well as in the interface.', '');

    // 2 -------------------------------------------------------------
    push('## 2. How the workspace works', '');
    concepts.forEach((c) => {
      push(`### ${c.title}`, '');
      c.body.forEach((b) => push(b, ''));
    });

    // 3 -------------------------------------------------------------
    push('## 3. The workspace at a glance', '');
    AT_A_GLANCE.forEach((p) => push(`- ${p}`));
    push('');

    // 4 -------------------------------------------------------------
    push('## 4. Your pages, one by one', '');
    for (const sec of manual) {
      push(`### ${sec.section}`, '');
      for (const e of sec.entries) {
        push(`#### ${e.label}`, '');
        push(`*Your level: ${e.canManage ? 'Full interact' : 'Interact only'}.*`, '');
        push(e.purpose, '');
        const can = [...e.view, ...(e.canManage ? e.manage : [])];
        // THE PARAGRAPHS THE PAGE HEADERS GAVE UP. Every subsection's
        // subtitle is now one sentence; what it used to say, expanded,
        // is here and in the help panel. It is printed before the action
        // lists because it is the context those lists sit in.
        const extra = PAGE_DETAIL[e.key];
        if (extra?.detail.length) { extra.detail.forEach((d) => push(d, '')); }
        if (can.length) { push('**You can:**', ''); can.forEach((c) => push(`- ${c}`)); push(''); }
        if (!e.canManage && e.manage.length) {
          push('**You cannot** (reserved for roles with full interact on this page):', '');
          e.manage.forEach((c) => push(`- ${c}`));
          push('');
        }
        if (e.warnings?.length) { push('**Good to know:**', ''); e.warnings.forEach((w) => push(`- ${w}`)); push(''); }
        // The topics, which is where the guide actually explains itself.
        // A topic marked `requires: 'manage'` describes a control this
        // role does not have, so it is left out rather than teaching
        // somebody a button they will never see.
        const topics = (e.topics ?? []).filter((t) => !(t.requires === 'manage' && !e.canManage));
        if (topics.length) {
          push('**In detail:**', '');
          topics.forEach((t) => { push(`- **${t.title}.** ${t.body}`); });
          push('');
        }
        // The sequence this page belongs to, limited to the parts of it
        // this role can actually open.
        const links = (extra?.related ?? [])
          .filter((k) => access.canView(k))
          .map((k) => GUIDE.find((x) => x.key === k))
          .filter((x): x is GuideEntry => !!x);
        if (links.length) {
          push('**Works with:** ' + links.map((l) => `${l.section}, ${l.label}`).join('; ') + '.', '');
        }
        // The tasks that start on this page, in the order they are done.
        const pageTasks = tasks.filter((t) => t.requires === e.key);
        if (pageTasks.length) {
          pageTasks.forEach((t) => {
            push(`**${t.title}**`, '');
            t.steps.forEach((step, i) => push(`${i + 1}. ${step}`));
            push('');
            if (t.caution) push(`> ${t.caution}`, '');
          });
        }
      }
    }

    // 5 -------------------------------------------------------------
    if (tasks.length) {
      push('## 5. Common tasks', '');
      push('Sequences that cross more than one page, in the order they are done.', '');
      tasks.forEach((t) => {
        push(`### ${t.title}`, '');
        t.steps.forEach((step, i) => push(`${i + 1}. ${step}`));
        push('');
        if (t.caution) push(`> ${t.caution}`, '');
      });
    }

    // 6 -------------------------------------------------------------
    if (answers.length) {
      push('## 6. When something looks wrong', '');
      answers.forEach((a) => { push(`**${a.question}**`, '', a.answer, ''); });
    }

    // 7 -------------------------------------------------------------
    push('## 7. Glossary', '');
    glossary.forEach((g) => push(`- **${g.term}.** ${g.definition}`));
    push('');

    // 8 -------------------------------------------------------------
    push('## 8. Recent improvements', '');
    RECENT_IMPROVEMENTS.forEach((p) => push(`- ${p}`));
    push('');

    push('---');
    push('Every meaningful action in the workspace is recorded in the activity log together with the role held at the time.');
    return lines.join('\n');
  };

  const download = () => {
    const blob = new Blob([buildMarkdown()], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `minerva-workspace-manual-${(access.primaryRole ?? 'member')}.md`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(a.href);
    logActivity(session, access.primaryRole, { action: 'download', section: 'General', subsection: 'How to use', entityType: 'manual', entityName: roleName });
  };

  return (
    <div>
      <WorkspacePageHeader
        title="How To Use"
        description={`Your personal manual as ${roleName}. Start with a guided tour, or open a heading below: each explains only the pages you can access.`}
        actions={<Button className="font-body h-11 lg:h-10" onClick={download}><Download className="h-4 w-4 mr-2" />Download my manual</Button>}
      />

      <div className="space-y-8 font-body">
        {/* SHOWN, BEFORE TOLD (Step 106). The tours come first: a member who
            takes two minutes of one needs most of what follows only when
            something specific comes up. The first card is the one to start
            with, and is drawn as the thing on this page worth doing. */}
        {tours.length > 0 && (
          <section aria-labelledby="htu-tours">
            <h2 id="htu-tours" className="font-serif text-heading text-accent border-b border-separator pb-2 mb-4">Guided tours</h2>
            <p className="max-w-3xl text-[15px] text-muted-foreground leading-relaxed mb-4">
              A tour opens the real page, dims everything else and points at one part at a time. Esc leaves it at any step, and nothing is changed by taking one. The tours here are the ones for your role.
            </p>
            {[
              { id: 'htu-tours-start', title: 'Start here', note: null as string | null, list: startTours },
              { id: 'htu-tours-role', title: 'For your role', note: `The parts of the workspace you work in as ${roleName}. Each tour shows only the pages your role opens, and says where you can read but not change.`, list: roleTours },
            ].filter((g) => g.list.length > 0).map((g) => (
              <div key={g.id} className="mt-6 first:mt-0">
                <h3 id={g.id} className="font-serif text-lg text-foreground mb-1">{g.title}</h3>
                {g.note && <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-3">{g.note}</p>}
                <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 ${g.note ? '' : 'mt-2'}`} aria-labelledby={g.id} role="list">
                  {g.list.map((t) => {
                    const done = doneTours.includes(t.id);
                    const lead = t.id === tours[0]?.id;
                    return (
                      <article key={t.id} role="listitem" data-tour-card={t.id} className={`flex flex-col rounded-lg border px-5 py-5 ${lead ? 'border-accent bg-accent text-accent-foreground' : 'border-separator'}`}>
                        <div className={`flex items-center justify-between gap-3 text-xs ${lead ? 'text-accent-foreground/75' : 'text-muted-foreground'}`}>
                          <span>About {t.minutes} min · {t.steps.length} steps</span>
                          {done && <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" aria-hidden="true" />Taken</span>}
                        </div>
                        <h4 className={`font-serif text-xl mt-1.5 ${lead ? '' : 'text-foreground'}`}>{t.title}</h4>
                        <p className={`text-sm leading-relaxed mt-1 mb-4 flex-1 ${lead ? 'text-accent-foreground/85' : 'text-muted-foreground'}`}>{t.summary}</p>
                        <button
                          type="button"
                          onClick={() => startTour(t.id)}
                          className={`h-11 px-4 font-body text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${lead
                            ? 'bg-background text-accent hover:bg-background/90 focus-visible:ring-background focus-visible:ring-offset-accent'
                            : 'border border-accent text-accent hover:bg-accent hover:text-accent-foreground focus-visible:ring-accent'}`}
                        >
                          {done ? 'Take it again' : 'Start the tour'}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* HOW EMAILS ARE SENT (Step 106): the question asked most about a
            workspace that writes to people by itself, answered in order.
            The same paragraphs are in the downloaded manual. */}
        {emailsConcept && (
          <section aria-labelledby="htu-emails">
            <h2 id="htu-emails" className="font-serif text-heading text-accent border-b border-separator pb-2 mb-4">How emails are sent</h2>
            <ol className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-4 max-w-6xl">
              {emailsConcept.body.map((b, i) => (
                <li key={i} className="flex gap-3">
                  <span aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent font-serif text-sm text-accent">{i + 1}</span>
                  <p className="text-[15px] text-foreground/80 leading-relaxed">{b}</p>
                </li>
              ))}
            </ol>
            {tours.some((t) => t.id === 'emails') && (
              <Button variant="outline" className="mt-5 h-11 lg:h-10 font-body" onClick={() => startTour('emails')}>Show me on the page</Button>
            )}
          </section>
        )}

        {/* Intro cards: quick orientation, not reading material. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-separator rounded-lg px-5 py-6 text-center">
            <BookOpen className="h-10 w-10 text-accent mx-auto mb-3" strokeWidth={1.5} />
            <div className="font-serif text-lg text-foreground mb-1">Always current</div>
            <p className="text-sm text-muted-foreground">Built from your real permissions. Use the <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-separator text-[10px] align-middle">?</span> icons for help in place.</p>
          </div>
          {/* THE ONE CARD OF THE THREE THAT ASKS FOR SOMETHING.
              The other two state facts about the workspace; this one
              suggests an action, and sitting in the same outlined box it
              read as a third fact and was passed over. Filling it in the
              accent, with its icon and text in white, is what separates a
              suggestion from a statement here: it is the treatment the
              rest of the workspace already uses for the thing on a page
              worth doing. */}
          <div className="rounded-lg border border-accent bg-accent px-5 py-6 text-center text-accent-foreground">
            <Sparkles className="h-10 w-10 text-accent-foreground mx-auto mb-3" strokeWidth={1.5} />
            <div className="font-serif text-lg text-accent-foreground mb-1">Learn with AI</div>
            <p className="text-sm text-accent-foreground/85">Download your manual and ask an AI assistant to walk you through it.</p>
          </div>
          <div className="border border-separator rounded-lg px-5 py-6 text-center">
            <ShieldCheck className="h-10 w-10 text-accent mx-auto mb-3" strokeWidth={1.5} />
            <div className="font-serif text-lg text-foreground mb-1">Actions are logged</div>
            <p className="text-sm text-muted-foreground">Every action is recorded in Settings, Activity log.</p>
          </div>
        </div>

        {/* YOUR ROLE, STATED. It used to have to be inferred from forty
            page descriptions, which is not a thing anybody does. */}
        <section>
          <h2 className="font-serif text-heading text-accent border-b border-separator pb-2 mb-4">Your role</h2>
          <div className="max-w-3xl space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p className="text-foreground">
              You are signed in as <span className="font-semibold">{roleName}</span>{divisionName ? `, in ${divisionName}` : ''}.
            </p>
            {roleFacts.brief && <p>{roleFacts.brief}</p>}
            <p>
              You can open {manual.reduce((n, sec) => n + sec.entries.length, 0)} subsections
              {manual.length > 0 && <> across {manual.map((sec) => sec.section).join(', ')}</>}.
              {' '}Of those, {manual.flatMap((sec) => sec.entries).filter((e) => e.canManage).length} are yours to change and the rest are yours to read.
            </p>
            {roleFacts.scoped && (
              <p>On the report pages and in the members register you see your own division.</p>
            )}
            {roleFacts.crossDivision && (
              <p>On the report pages you can look beyond your own division.</p>
            )}
            {roleFacts.specials.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">Rules that apply specifically to your role</div>
                <ul className="space-y-1">
                  {roleFacts.specials.map((r) => (
                    <li key={r.rule} className="flex gap-2"><span className="text-accent">·</span><span>{r.label}</span></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* HOW IT WORKS, before the pages. The model, not the menu. */}
        <Fold title="How the workspace works" note={`${otherConcepts.length} topics`}>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
            {otherConcepts.map((c) => (
              <article key={c.id} className="border border-separator rounded-lg p-4">
                <h3 className="font-serif text-lg text-foreground mb-2">{c.title}</h3>
                <div className="space-y-2">
                  {c.body.map((b, i) => <p key={i} className="text-sm text-muted-foreground leading-relaxed">{b}</p>)}
                </div>
              </article>
            ))}
          </div>
        </Fold>

        {/* How the workspace is organised, before the per-page manual. */}
        <Fold title="The workspace at a glance">
          <ul className="space-y-2.5 max-w-3xl">
            {AT_A_GLANCE.map((p, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-muted-foreground leading-relaxed">
                <span aria-hidden className="mt-[7px] w-1.5 h-1.5 bg-accent shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </Fold>

        {/* What changed recently across the workspace. */}
        <Fold title="Recent improvements" note={`${RECENT_IMPROVEMENTS.length} changes`}>
          <ul className="space-y-2.5 max-w-3xl">
            {RECENT_IMPROVEMENTS.map((p, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-muted-foreground leading-relaxed">
                <span aria-hidden className="mt-[7px] w-1.5 h-1.5 bg-accent shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </Fold>

        {/* The manual itself */}
        {manual.map((sec) => (
          <Fold key={sec.section} title={sec.section} note={`${sec.entries.length} ${sec.entries.length === 1 ? 'page' : 'pages'}`}>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
              {sec.entries.map((e) => (
                <article key={e.key} className="border border-separator rounded-lg p-4">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <h3 className="font-serif text-lg text-foreground">{e.label}</h3>
                    <span className={`text-[11px] px-2 py-0.5 rounded shrink-0 ${e.canManage ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {e.canManage ? 'Full access' : 'Consult & light actions'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{e.purpose}</p>

                  {(e.view.length > 0 || (e.canManage && e.manage.length > 0)) && (
                    <div className="mb-2">
                      <div className="text-xs font-semibold text-muted-foreground mb-1">You can</div>
                      <ul className="space-y-1">
                        {e.view.map((v, i) => <li key={`v${i}`} className="text-sm text-muted-foreground flex gap-2"><span className="text-accent">·</span>{v}</li>)}
                        {e.canManage && e.manage.map((m, i) => <li key={`m${i}`} className="text-sm text-muted-foreground flex gap-2"><span className="text-accent">·</span>{m}</li>)}
                      </ul>
                    </div>
                  )}

                  {!e.canManage && e.manage.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs font-semibold text-muted-foreground mb-1">You cannot (reserved for managing roles)</div>
                      <ul className="space-y-1">{e.manage.map((m, i) => <li key={i} className="text-sm text-muted-foreground/70 flex gap-2"><span>×</span>{m}</li>)}</ul>
                    </div>
                  )}

                  {e.warnings && e.warnings.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-1">Good to know</div>
                      <ul className="space-y-1">{e.warnings.map((w, i) => <li key={i} className="text-sm text-muted-foreground flex gap-2"><span className="text-amber-600">!</span>{w}</li>)}</ul>
                    </div>
                  )}

                  {/* THE DETAIL, FOLDED AWAY RATHER THAN LEFT OUT.
                      These are the same topics the sliding help panel
                      shows, and they are the part of the guide that
                      explains how a control actually behaves. Printing
                      them open would make this page a wall; omitting
                      them, which is what happened before, made the page
                      a summary of a document nobody could reach from
                      here. A disclosure is the honest middle. */}
                  {(() => {
                    const topics = (e.topics ?? []).filter((t) => !(t.requires === 'manage' && !e.canManage));
                    const extra = PAGE_DETAIL[e.key];
                    const paras = extra?.detail ?? [];
                    if (topics.length === 0 && paras.length === 0) return null;
                    return (
                      <details className="mt-3 border-t border-separator pt-2">
                        <summary data-ro className="cursor-pointer text-xs font-semibold text-accent">
                          In detail ({topics.length + paras.length})
                        </summary>
                        {paras.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {paras.map((d, i) => (
                              <p key={i} className="text-sm text-muted-foreground leading-relaxed">{d}</p>
                            ))}
                          </div>
                        )}
                        {topics.length > 0 && (
                          <ul className="mt-2 space-y-2">
                            {topics.map((t) => (
                              <li key={t.id} className="text-sm text-muted-foreground leading-relaxed">
                                <span className="text-foreground">{t.title}. </span>{t.body}
                              </li>
                            ))}
                          </ul>
                        )}
                      </details>
                    );
                  })()}
                </article>
              ))}
            </div>
          </Fold>
        ))}

        {/* THE SEQUENCES THAT CROSS PAGES. A page description cannot
            teach an order, and an order is what somebody doing the job
            for the first time is missing. */}
        {tasks.length > 0 && (
          <Fold title="Common tasks" note={`${tasks.length} tasks`}>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
              {tasks.map((t) => (
                <article key={t.id} className="border border-separator rounded-lg p-4">
                  <h3 className="font-serif text-lg text-foreground mb-2">{t.title}</h3>
                  <ol className="space-y-1.5 list-decimal pl-5">
                    {t.steps.map((step, i) => <li key={i} className="text-sm text-muted-foreground leading-relaxed">{step}</li>)}
                  </ol>
                  {t.caution && (
                    <p className="mt-3 flex gap-2 text-sm text-muted-foreground"><span className="text-amber-600">!</span>{t.caution}</p>
                  )}
                </article>
              ))}
            </div>
          </Fold>
        )}

        {answers.length > 0 && (
          <Fold title="When something looks wrong">
            <div className="max-w-3xl space-y-4">
              {answers.map((a) => (
                <div key={a.question}>
                  <div className="text-sm text-foreground">{a.question}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{a.answer}</p>
                </div>
              ))}
            </div>
          </Fold>
        )}

        <Fold title="Glossary" note={`${glossary.length} terms`}>
          <ul className="max-w-3xl space-y-2">
            {glossary.map((g) => (
              <li key={g.term} className="text-sm text-muted-foreground leading-relaxed">
                <span className="text-foreground">{g.term}. </span>{g.definition}
              </li>
            ))}
          </ul>
        </Fold>
      </div>
    </div>
  );
}
