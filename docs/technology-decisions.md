# Technology Decisions

## Project Overview
This app is designed to record employer and placement-drive information in a clean, easy way. The main interface is a dashboard that keeps company data and placement-drive data connected so the same employer record can be reused across multiple drives.

## UI Flow
1. User opens the app and sees the dashboard shell.
2. User views the Companies section first.
3. User can add a new company record.
4. User can reuse an existing company for placement-drive records.
5. The app is structured so future views can show drive details and reporting insights.

## Flow Diagram
```text
App opened
    |
    v
Dashboard shell
    |
    v
Companies view
    |
    v
Company record reused for placement drive
    |
    v
Drive details / reporting view
```

## 1. Frontend Framework
- Requirement: build a fast, responsive dashboard for companies and placement drives.
- Options: plain HTML/CSS, React with Astro, or a full SPA framework.
- Evaluation: plain HTML would be fast but harder to extend; a full SPA adds more setup than needed for this MVP.
- Decision: use Astro with React islands.
- Evidence: the app now has a clear dashboard shell, reusable UI sections, and interactive company actions without overcomplicating the architecture.

## 2. Database and Data Storage
- Requirement: store relational data for companies, academic years, and placement drives with simple integrity rules.
- Options: local JSON, SQLite, or PostgreSQL.
- Evaluation: JSON is easy but weak for relational integrity; SQLite is lightweight but less ideal for cloud-based collaboration.
- Decision: use Supabase with PostgreSQL.
- Evidence: the app successfully connects to Supabase and performs company reads and inserts through the existing data layer.

## 3. Styling Approach
- Requirement: create a clean, modern dashboard quickly without much custom CSS overhead.
- Options: plain CSS, Tailwind, or a component library.
- Evaluation: plain CSS is flexible but slower to write; Tailwind gives rapid UI building with consistent styling.
- Decision: use Tailwind CSS.
- Evidence: the current interface uses a polished dashboard layout with minimal custom CSS and consistent spacing.

## 4. AI Tool Usage
- Requirement: accelerate development while keeping the project grounded in working code.
- Options: manual coding only or AI-assisted development.
- Evaluation: manual coding is slower for a hackathon timeline; AI assistance helps with scaffolding, debugging, and documentation.
- Decision: use AI-assisted development tools for scaffolding and refinement, while validating all changes through local testing.
- Evidence: the app was iterated through working local runs and verified Supabase connectivity rather than relying on assumptions.
