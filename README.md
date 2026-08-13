# Campus Guard Pro

CMADMS — Premium UI/UX Redesign Specification

Redesign the complete CMADMS application into a premium, modern university enterprise SaaS dashboard.

Do NOT make it look like a basic college project.

The interface should feel similar in quality to a modern enterprise product such as a professional university ERP, admin SaaS platform, or security/compliance management application.

The primary workflow remains:

Faculty → Check Student → Verify Current Class → Verify Permission → Report Unauthorized Movement

Everything in the UI must reinforce this workflow.

1. NEW DESIGN LANGUAGE

Replace the existing Red + White visual system with a more sophisticated:

Navy + Blue + Neutral + Semantic Status Colors

Primary Colors

Deep Navy #1E3A8A
Navy Hover #1E40AF
Primary Blue #2563EB
Light Blue #EFF6FF

Background #F5F7FB
Card #FFFFFF

Main Text #0F172A
Secondary Text #64748B
Muted Text #94A3B8

Border #E2E8F0
Divider #F1F5F9

Semantic Colors

Success #16A34A
Success Light #F0FDF4

Warning #F59E0B
Warning Light #FFFBEB

Danger #DC2626
Danger Light #FEF2F2

Info #0EA5E9
Info Light #F0F9FF

IMPORTANT COLOR RULE

Do NOT use red as the primary interface color.

Red should be reserved for:

Unauthorized Movement

Violation

Escalation

Critical alerts

Delete/destructive actions

Error states

Report Violation button

Blue/Navy should dominate the normal interface.

Green should communicate:

Authorized / Valid / Resolved

Amber should communicate:

Pending / Waiting / Needs Attention

This creates a clear visual language.

2. OVERALL VISUAL STYLE

Create a:

Premium + Clean + Academic + Enterprise + Trustworthy

visual style.

Use:

Large whitespace

Clean layouts

White cards

Soft gray background

Thin borders

12–16px border radius

Subtle shadows

Strong typography hierarchy

Compact but readable tables

Professional badges

Consistent iconography

Smooth hover states

Subtle transitions

Modern form controls

Responsive layouts

Avoid:

Excessive gradients

Neon colors

Excessive glassmorphism

Huge icons

Heavy shadows

Over-rounded UI

Too many colors

Excessive animations

Red backgrounds everywhere

3. APPLICATION SHELL

Create a premium application shell.

Desktop:

┌──────────────────────────────────────────────────────────────────┐
│ CMADMS Search... 🔔 Faculty Profile │
├───────────────┬──────────────────────────────────────────────────┤
│ │ │
│ Sidebar │ Main Content │
│ │ │
│ Dashboard │ │
│ Check │ │
│ Reports │ │
│ Timetable │ │
│ Notifications│ │
│ Settings │ │
│ │ │
└───────────────┴──────────────────────────────────────────────────┘

Use:

Sidebar width

Desktop expanded:

250–270px

Collapsed:

72–80px

Main content should automatically expand when sidebar collapses.

4. SIDEBAR REDESIGN

Create a dark navy premium sidebar.

Background:

#0F172A

Logo area:

CMADMS
Faculty Portal

Use a clean CMADMS logo mark.

Navigation:

MAIN

⌂ Dashboard

VERIFICATION

⌕ Check Student

REPORTING

⚠ Reported Violations
▣ My Reports

ACADEMIC

▣ My Timetable

SYSTEM

🔔 Notifications
⚙ Settings

Bottom:

Faculty Profile
Faculty ID
Logout

Active navigation

Use:

background: #1E3A8A

with a subtle blue glow/highlight.

Do NOT use bright red for active navigation.

Add:

Hover background

Active indicator

Icon

Tooltip when collapsed

Smooth 200ms transition

5. TOPBAR

Create a clean white topbar.

Left:

Dashboard
Home / Dashboard

Center:

🔍 Search student, report or Student ID...

Right:

🔔
Avatar

Prof. Ravi Kumar
Faculty
⌄

Add:

Notification badge

Profile dropdown

Search shortcut

Sticky topbar

Subtle bottom border

6. DASHBOARD REDESIGN

The dashboard should NOT look like a collection of random statistic cards.

Create a clear information hierarchy.

Header:

Good Morning, Professor 👋

Monitor student movement and review today's
verification activity.

Add a small date indicator:

Monday, 10 August 2026

7. STATISTICS

Create four premium cards:

┌────────────────────────┐
│ Reports Today ⚠ │
│ │
│ 05 │
│ +2 from yesterday │
└────────────────────────┘

┌────────────────────────┐
│ Under Review ◷ │
│ │
│ 03 │
│ 2 awaiting action │
└────────────────────────┘

┌────────────────────────┐
│ Resolved ✓ │
│ │
│ 18 │
│ +12% this month │
└────────────────────────┘

┌────────────────────────┐
│ Escalated ! │
│ │
│ 02 │
│ Requires attention │
└────────────────────────┘

Use subtle semantic colors.

Do NOT make every card blue.

8. PRIMARY ACTION CARD

Make Check Student the largest and most important component on the dashboard.

Create a premium blue gradient/header area but keep it subtle.

┌──────────────────────────────────────────────────────────────┐
│ │
│ Check Student 🔍 │
│ │
│ Verify whether a student should currently be │
│ attending their scheduled class. │
│ │
│ ┌──────────────────────────────────────────────┐ │
│ │ Student ID │ │
│ │ 23CSE1012 │ │
│ └──────────────────────────────────────────────┘ │
│ │
│ [ CHECK STUDENT ] │
│ │
└──────────────────────────────────────────────────────────────┘

Primary button:

#2563EB

Hover:

#1E40AF

Add keyboard shortcut:

Ctrl + K

for quick student search.

9. RECENT ACTIVITY

Add a "Recent Activity" section below the main action.

Example:

Recent Activity View All

✓ V-1021 Violation resolved
10 minutes ago

⚠ V-1024 New violation reported
32 minutes ago

◷ V-1025 Student explanation submitted
1 hour ago

Use timeline-style activity indicators.

10. CHECK STUDENT PAGE

This should be the best-designed page in the entire application.

Header:

Student Verification

Verify the student's current academic status
before reporting unauthorized movement.

Create a prominent search area:

┌──────────────────────────────────────────────────────────────┐
│ 🔍 Student ID │
│ │
│ 23CSE1012 [ CHECK ] │
└──────────────────────────────────────────────────────────────┘

11. VERIFICATION RESULT

After searching, use a three-section layout.

Section 1

Student Profile

┌──────────────────────────────────────────────────────┐
│ [Avatar] │
│ │
│ Ashok Dora │
│ 23CSE1012 │
│ │
│ CSE • 3rd Year • Section A │
│ │
│ Semester 6 Active ✓ │
└──────────────────────────────────────────────────────┘

12. CURRENT CLASS CARD

Show the current academic state prominently.

If class exists:

┌──────────────────────────────────────────────────────┐
│ 🔴 CLASS CURRENTLY IN SESSION │
│ │
│ Data Structures │
│ │
│ 10:00 AM — 11:00 AM │
│ Room C-204 │
│ Prof. Ravi Kumar │
│ │
│ Student should currently be attending this class. │
└──────────────────────────────────────────────────────┘

If no class:

Use a green/blue neutral card:

┌──────────────────────────────────────────────────────┐
│ ✓ NO CLASS SCHEDULED │
│ │
│ The student is not currently scheduled for a class. │
│ │
│ No violation should be created. │
└──────────────────────────────────────────────────────┘

13. PERMISSION STATUS

Create a dedicated status card.

Authorized

┌──────────────────────────────────────────────────────┐
│ ✓ AUTHORIZED MOVEMENT │
│ │
│ Active Permission │
│ │
│ Reason Library │
│ Issued By Prof. Ravi Kumar │
│ Valid Until 10:50 AM │
│ │
│ AUTHORIZED │
└──────────────────────────────────────────────────────┘

Use green.

No violation button should appear.

14. UNAUTHORIZED STATE

When no permission exists:

┌──────────────────────────────────────────────────────┐
│ ⚠ UNAUTHORIZED MOVEMENT │
│ │
│ No active movement permission was found. │
│ │
│ The student is scheduled for: │
│ │
│ Data Structures │
│ 10:00 AM — 11:00 AM │
│ Room C-204 │
│ │
│ [ REPORT VIOLATION ] │
└──────────────────────────────────────────────────────┘

This is the ONLY place where strong red styling should dominate.

Use:

#DC2626
#FEF2F2

15. VERIFICATION STATUS BANNER

At the top of the result page add one large status banner.

Possible states:

Authorized

Green:

✓ Student is authorized to be outside class

No Class

Blue:

✓ No class is currently scheduled

Unauthorized

Red:

⚠ Student appears to be outside class without permission

This allows faculty to understand the result within one second.

16. REPORT VIOLATION FORM

Make the report form clean and structured.

Use a two-column desktop layout.

Left:

Incident Information

Student
Student ID
Department
Year / Section
Current Class
Scheduled Time
Room
Incident Time
Reported By

Right:

Report Details

Location
[ Select Location ]

Remarks
[................................]

Evidence
[ Upload File ]

At bottom:

[ Cancel ] [ Submit Violation ]

Use red only for Submit Violation.

17. CONFIRMATION MODAL

Create a premium modal.

Report Unauthorized Movement?

You are about to submit a violation report.

Student
Ashok Dora

Class
Data Structures

Time
10:42 AM

Reason
No active permission found.

────────────────────────

[ Cancel ] [ Confirm Report ]

Use red only on the confirmation action.

Add subtle backdrop blur.

18. VIOLATION DETAILS PAGE

Redesign as a professional case-management interface.

Top:

V-20260810-001

Unauthorized Movement

Under Review

Add status badge.

Then:

Student Information
Incident Information
Timetable Information
Faculty Report
Evidence
Student Explanation
HOD Decision

Use cards with clear section headers.

19. CASE TIMELINE

Create a vertical timeline.

● 10:42 AM
│ Violation reported
│ Prof. Ravi Kumar
│
● 10:43 AM
│ Student notified
│
● 11:15 AM
│ Student explanation submitted
│
● 12:30 PM
│ HOD reviewed case
│
● 12:35 PM
│ Decision: Warning

Use blue for normal events.

Use red only for the original violation.

Use green for resolution.

20. MY REPORTS

Create a modern data table.

Top:

My Reports

Manage and track the violations you have submitted.

[ Search... ] [ Status ] [ Date ]

Table:

Report ID
Student
Student ID
Class
Incident
Status
Created
Action

Status badges:

Pending Amber
Under Review Blue
Resolved Green
Escalated Red

Add:

Sorting

Search

Pagination

Filters

Row hover

View details

Responsive mobile cards

21. MOBILE TABLE DESIGN

Do NOT force desktop tables onto mobile.

On mobile convert rows into cards:

V-20260810-001

Ashok Dora
23CSE1012

Data Structures
10:42 AM

[ Under Review ]

[ View Details ]

22. MY TIMETABLE

Create a modern timeline instead of a basic table.

Example:

TODAY

09:00 ─────────────────
Data Structures
CSE-A
Room C-204

11:00 ─────────────────
Database Management
CSE-B
Room B-102

02:00 ─────────────────
Operating Systems
CSE-A
Room C-301

Add tabs:

Today | Mon | Tue | Wed | Thu | Fri

Current class should have a blue highlighted state.

23. NOTIFICATIONS

Create a modern notification center.

Unread notification:

🔴 HOD reviewed violation V-1024
2 minutes ago

Student explanation:

🟡 Student submitted explanation for V-1025
15 minutes ago

Resolved:

🟢 Violation V-1021 has been resolved
1 hour ago

Add:

Read/unread

Mark as read

Mark all as read

Clear

Notification badge

24. EMPTY STATES

Create polished empty states instead of blank screens.

Example:

             📋

       No Reports Found

There are no violation reports matching
your current filters.

        [ Check Student ]

Use subtle illustration/icon.

25. LOADING STATES

Never show blank screens while loading.

Use skeletons for:

Student profile

Statistics

Tables

Timetable

Notifications

Violation details

Skeleton color:

#E2E8F0

Use subtle shimmer animation.

26. BUTTON SYSTEM

Create consistent buttons.

Primary

Blue:

#2563EB

Secondary

White with border:

border: #CBD5E1

Success

Green.

Danger

Red.

Ghost

Transparent with subtle hover.

Buttons should have:

8–10px radius

40–44px height

Medium font weight

Icon support

Loading spinner

Disabled state

Hover state

Focus ring

27. FORM DESIGN

Inputs should be clean and modern.

Use:

Label
Input
Helper text / validation

Example:

Student ID

┌──────────────────────────────────────┐
│ 23CSE1012 🔍 │
└──────────────────────────────────────┘

Enter a valid student ID.

Focus:

border: #2563EB
box-shadow: 0 0 0 3px #DBEAFE

28. TYPOGRAPHY

Use a modern professional font.

Preferred:

Inter

Fallback:

system-ui, sans-serif

Typography hierarchy:

Page title 28–32px
Section title 18–20px
Card title 15–17px
Body 14–15px
Small text 12–13px

Use font weight carefully.

Avoid excessive bold text.

29. ICON SYSTEM

Use one consistent icon library.

Preferred:

Lucide Icons

Do NOT mix random emoji and icon styles throughout the application.

Use icons such as:

LayoutDashboard
Search
Bell
User
Calendar
AlertTriangle
CheckCircle
Clock
FileWarning
Settings
LogOut
ChevronRight
Upload
Eye
Filter
Download

Icons should generally be:

18–20px

30. CARD SYSTEM

Use consistent cards.

background: #FFFFFF
border: 1px solid #E2E8F0
border-radius: 14px
box-shadow: subtle

Hover only where interactive.

Do NOT make every card float heavily.

31. MICRO INTERACTIONS

Use professional animations:

Button hover 150ms
Card hover 200ms
Sidebar 200ms
Modal 200ms
Toast 250ms
Page transition 200ms

Use:

Fade

Slide

Scale

Skeleton shimmer

Avoid flashy animations.

32. DARK MODE

Add optional dark mode through Settings.

Dark theme:

Background #0B1120
Surface #111827
Card #172033
Border #263244
Text #F8FAFC
Secondary #94A3B8
Primary #3B82F6
Danger #EF4444
Success #22C55E

Do not simply invert colors.

Every component must support dark mode properly.

33. RESPONSIVE DESIGN

Desktop:

Persistent sidebar

Full dashboard

Multi-column layouts

Tablet:

Collapsible sidebar

2-column cards

Responsive tables

Mobile:

Drawer navigation

Single-column layout

Sticky mobile header

Bottom action area where appropriate

Cards instead of wide tables

Touch-friendly controls

Minimum touch target:

44px

34. MOBILE HEADER

Create:

┌─────────────────────────────────────┐
│ ☰ CMADMS 🔔 👤 │
└─────────────────────────────────────┘

Keep it compact.

35. DASHBOARD INFORMATION HIERARCHY

The dashboard must visually prioritize:

1. Check Student
   ↓
2. Current verification activity
   ↓
3. Reports requiring attention
   ↓
4. Recent activity
   ↓
5. Statistics

Do not let statistics dominate the dashboard.

The product is a workflow tool, not an analytics dashboard.

36. UX IMPROVEMENTS

Add:

Global search

Keyboard shortcuts

Breadcrumbs

Toast notifications

Confirmation dialogs

Skeleton loading

Empty states

Error states

Hover states

Focus states

Responsive layouts

Accessible labels

Tooltips

Status badges

Sticky actions where useful

37. ACCESSIBILITY

Ensure:

WCAG-friendly contrast

Keyboard navigation

Visible focus states

Proper form labels

ARIA labels

Accessible modals

Accessible dropdowns

No color-only status indicators

Example:

Do not show only:

🟢

Instead:

✓ Authorized

38. IMPORTANT PRODUCT RULE

Do NOT turn CMADMS into a generic college ERP.

Do NOT add:

QR tracking

GPS

Real-time location tracking

AI behavior prediction

Parent portal

Dean portal

Principal portal

Unnecessary analytics

Unnecessary enterprise modules

Keep the interface focused on:

Faculty → Student Verification → Class Verification → Permission Verification → Violation Reporting

39. FINAL VISUAL TARGET

The final application should feel like:

Modern University ERP + Enterprise SaaS + Case Management System

Visual priority:

NAVY
↓
BLUE
↓
WHITE / SLATE
↓
SEMANTIC COLORS
↓
RED ONLY FOR VIOLATIONS

The user should immediately understand:

Blue = Action

Navy = Navigation / Authority

Green = Authorized / Resolved

Amber = Pending / Attention

Red = Violation / Critical

The UI must look polished enough for an actual university deployment, not like a student project.

Every button, filter, form, modal, navigation item, search field, status badge, loading state, and interaction must be functional rather than decorative.

use nextjs i want this application fully human type

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b1214537-5220-4f07-b632-eaedb72ab2a9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
