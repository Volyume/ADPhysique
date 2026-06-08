# VOLYUME — STYLING AND VISUAL RULES

Read this when building or modifying any screen or component.
The app has a precise dark aesthetic. Every screen must feel like the same product.

---

## COLOURS — USE ONLY THESE

Backgrounds:
  #0D0D0D   Screen background
  #1A1A1A   Cards and elevated surfaces
  #262626   Input fields and secondary surfaces

Accent:
  #F59E0B   Amber — interactive elements, highlights, active states only
  #D97706   Amber dark — pressed states

Text:
  #FFFFFF   Primary
  #9CA3AF   Secondary, labels, placeholders
  #6B7280   Tertiary, disabled

Functional (use sparingly):
  #10B981   Success, positive trends
  #EF4444   Destructive, warnings
  #3B82F6   Informational only, never for primary actions

Borders:
  #2D2D2D   Default card border
  #F59E0B   Active or selected card border (1dp)
  #374151   Input field border

Never use:
  White (#FFFFFF) as any background
  Pure black (#000000)
  Gradients
  Drop shadows on text
  Any colour not listed above

---

## TYPOGRAPHY

System default fonts (San Francisco on iOS, Roboto on Android).

Screen title:     24sp weight 700
Section header:   18sp weight 600
Card title:       16sp weight 600
Body:             14sp weight 400
Label/caption:    12sp weight 400

Section header labels: uppercase, #9CA3AF, 12sp, letter-spacing 1.2
Minimum font size: 12sp. Never go below this.

---

## SPACING

Base unit: 4dp
Screen padding: 16dp
Card padding: 16dp
Section gap: 24dp
Item gap: 12dp

---

## COMPONENTS

Cards:
  Background #1A1A1A, border radius 12dp
  Border 1dp #2D2D2D default, #F59E0B when active or selected

Primary button:
  Background #F59E0B, text #000000, 15sp weight 600
  Border radius 10dp, minimum height 52dp, full width

Secondary button:
  Background #262626, text #FFFFFF, 15sp weight 500
  Border 1dp #374151, border radius 10dp, minimum height 52dp

Destructive button:
  Background transparent, text #EF4444
  Border 1dp #EF4444, border radius 10dp

Input fields:
  Background #262626, border 1dp #374151 default / #F59E0B focused
  Border radius 8dp, minimum height 48dp

Touch targets:
  Every interactive element minimum 48dp x 48dp. No exceptions.
  This app is used in a gym with sweaty hands.

---

## NAVIGATION

Bottom tab bar: background #0D0D0D, active #F59E0B, inactive #6B7280
Header: background #0D0D0D, title #FFFFFF 17sp weight 600, back button #F59E0B

---

## RULES

The app is always dark. There is no light mode. Never add light mode theming.
No white backgrounds visible against #0D0D0D.
No gradients anywhere.
No drop shadows on text.
No rounded corners above 16dp on cards.
No borders thicker than 1dp.
No animations longer than 300ms.
No bouncing or spinning animations except subtle loading states.
No emojis in UI (only in coaching copy where already designed in).
