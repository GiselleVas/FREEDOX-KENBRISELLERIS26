# UI / UX and Flow Diagram

## Overview
This app is designed to record employer and placement drive information in a clean, easy way. The main interface is a dashboard that keeps company data and placement drive data connected so the same employer record can be reused across multiple drives.

## Main UI structure

1. Left navigation rail
   - Shows the brand name and system title.
   - Provides a simple visual anchor for the dashboard.
   - On smaller screens it collapses into a full-width top section.

2. Main dashboard area
   - Displays the current view title and description.
   - Includes a top action area for adding companies or switching tasks.
   - Shows the main content for the current view.

## Current views

### Companies view
- This is the default view in the dashboard.
- It displays a master list of employer records.
- Each company is meant to be stored once and reused for every placement drive.
- If no companies exist, the screen shows a clear empty state and prompt to add the first employer.
- The page title, description, and action button adjust based on the view.

### Placement Drives view
- The app is structured to support a placement drives view.
- Placement drives are tied to companies, so each drive references a single employer record.
- The current code foundation is ready for this view, even though the detailed drive cards are not fully built yet.

## Supportive features

- Filter options are prepared for industry, academic year, status, and search text.
- Status options include upcoming, ongoing, completed, and cancelled.
- A `fetchData` hook is ready to load employer records from Supabase.
- The UI keeps the dashboard layout simple and easy to scan.

## User flow

1. User opens the app and sees the dashboard shell.
2. User views the company directory first.
3. User can add a new company record.
4. User selects a company to view its profile and related placement drives.
5. User can switch to placement drives to see all drive entries.
6. User can filter by year, industry, status, or search text.
7. User can explore drive details and drive performance reports.

## Flow diagram

```
App opened
    |
    v
Dashboard shell
    |
    v
Companies view
    |   \----------------
    |                    
    v                    
Company profile         
    |                    
    v                    
Placement drives view   
    |                    
    v                    
Drive detail / reports  
```

## Mobile-friendly behavior

This app is now improved for mobile devices.
- The dashboard shifts to a vertical layout on small screens.
- The left navigation becomes a top section at full width.
- Padding and spacing shrink gracefully on phones.
- Action buttons expand to full width when needed so they remain easy to tap.
- Company cards and grid layouts stack to fit narrow screens.

## Why this works

- The interface keeps the structure simple and readable.
- The user can focus on the current screen without extra clutter.
- Mobile-friendly spacing and wrapping make the UI usable on phones.
- The flow matches the project goal of capturing company and drive records without duplication.

## Notes for future UX

- Add a real navigation menu for companies, drives, and reports.
- Add a company profile detail screen with drive history.
- Add filters, search, and sorting controls in the dashboard.
- Add clear error and success feedback for actions like add, edit, and delete.
