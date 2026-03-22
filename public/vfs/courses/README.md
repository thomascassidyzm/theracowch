# Courses Directory

This directory contains all course data for the Theracowch language learning platform.

## Structure

Each course has its own directory with phase-specific JSON files:

```
courses/
├── spa_for_eng_30seeds/
│   ├── seed_pairs.json          # Phase 1: Base translations
│   ├── lego_pairs.json          # Phase 3: LEGO combinations
│   └── baskets_deduplicated.json # Phase 4: Deduplicated baskets
└── [your_course_name]/
    └── ... (same structure)
```

## Adding a New Course

1. Create a new directory: `mkdir [course_id]/`
2. Add `seed_pairs.json` with initial translations
3. Commit and push to GitHub
4. Vercel auto-deploys and the course appears in the dashboard

## Phase Tracking

- 📂 Empty folder = No data yet
- 🌱 Phase 1 = Has seed_pairs.json
- 🧱 Phase 3 = Has lego_pairs.json
- ✅ Phase 4 = Has baskets_deduplicated.json
- 🚀 Phase 7+ = Has final course.json manifest

## GitHub-First Workflow

**Source of Truth:** GitHub repository (not S3, not backend API)

**Development Flow:**
1. Edit JSON files in this directory
2. Commit changes to GitHub
3. Vercel auto-deploys
4. Manifest auto-generates from folder scan
5. Changes appear in production automatically

See `docs/GITHUB_WORKFLOW.md` for complete documentation.
