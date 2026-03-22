# GitHub-First Course Development Workflow

**Last Updated:** 2025-11-06
**Status:** ✅ Active

## 🎯 Overview

This document describes the **GitHub-first workflow** for developing and deploying language learning courses in Theracowch. All course data lives in GitHub, not S3, for Phases 1-6 of development.

## 📂 Directory Structure

```
theracowch/
├── public/vfs/courses/           ← Work here!
│   ├── README.md                 ← Quick reference
│   ├── spa_for_eng_30seeds/      ← Example course
│   │   ├── seed_pairs.json       ← Phase 1: Base translations
│   │   ├── lego_pairs.json       ← Phase 3: LEGO combinations
│   │   └── baskets_deduplicated.json ← Phase 4: Baskets
│   └── [your_course]/            ← Your new courses
│       └── ... (same structure)
├── docs/                         ← Documentation
└── .gitignore                    ← Prevents temp files
```

## 🚀 Quick Start

### Creating a New Course

```bash
# 1. Clone the repository
git clone https://github.com/thomascassidyzm/theracowch.git
cd theracowch

# 2. Create your course directory
mkdir -p public/vfs/courses/my_new_course

# 3. Create Phase 1 file (seed translations)
cat > public/vfs/courses/my_new_course/seed_pairs.json << 'EOF'
{
  "courseName": "My New Course",
  "courseId": "my_new_course",
  "phase": 1,
  "description": "Course description here",
  "seedPairs": []
}
EOF

# 4. Commit and push
git add public/vfs/courses/my_new_course/
git commit -m "Add my_new_course - Phase 1"
git push

# ✨ Your course now appears in the dashboard automatically!
```

### Editing an Existing Course

```bash
# 1. Pull latest changes
git pull origin main

# 2. Edit the JSON file
vim public/vfs/courses/spa_for_eng_30seeds/seed_pairs.json

# 3. Commit and push
git add public/vfs/courses/spa_for_eng_30seeds/seed_pairs.json
git commit -m "Update seed pairs for Spanish course"
git push

# ✨ Changes deploy automatically via Vercel!
```

## 📊 Phase Tracking System

Each course progresses through phases, indicated by which files exist:

| Phase | File | Status Icon | Description |
|-------|------|-------------|-------------|
| **Empty** | (none) | 📂 | Folder exists, no data yet |
| **Phase 1** | `seed_pairs.json` | 🌱 | Base translation pairs (EN→Target) |
| **Phase 3** | `lego_pairs.json` | 🧱 | LEGO combinations from seeds |
| **Phase 4** | `baskets_deduplicated.json` | ✅ | Deduplicated translation baskets |
| **Phase 7+** | `course.json` | 🚀 | Final production manifest |

### Phase Details

#### Phase 1: Seed Pairs 🌱
**File:** `seed_pairs.json`

Basic translation pairs that form the foundation of the course.

```json
{
  "courseName": "Spanish for Engineers",
  "courseId": "spa_for_eng_30seeds",
  "phase": 1,
  "description": "Professional Spanish for engineering contexts",
  "seedPairs": [
    {
      "id": "seed_001",
      "english": "The project is on schedule",
      "target": "El proyecto está en el cronograma",
      "context": "project_management"
    }
  ]
}
```

#### Phase 3: LEGO Pairs 🧱
**File:** `lego_pairs.json`

Combinations and variations built from seed pairs.

```json
{
  "courseName": "Spanish for Engineers",
  "courseId": "spa_for_eng_30seeds",
  "phase": 3,
  "description": "LEGO combinations from seed pairs",
  "legoPairs": [
    {
      "id": "lego_001",
      "english": "The project is behind schedule",
      "target": "El proyecto está atrasado",
      "derivedFrom": ["seed_001"],
      "variation": "negative"
    }
  ]
}
```

#### Phase 4: Deduplicated Baskets ✅
**File:** `baskets_deduplicated.json`

Organized, deduplicated translation groups ready for production.

```json
{
  "courseName": "Spanish for Engineers",
  "courseId": "spa_for_eng_30seeds",
  "phase": 4,
  "description": "Deduplicated baskets for course content",
  "baskets": [
    {
      "basketId": "basket_project_mgmt",
      "theme": "Project Management",
      "translations": [
        "The project is on schedule",
        "The project is behind schedule",
        "We need to adjust the timeline"
      ]
    }
  ]
}
```

#### Phase 7+: Production Manifest 🚀
**File:** `course.json`

Final production-ready course manifest (optional, can be generated automatically).

## 🔄 How the System Works

### Automatic Deployment Flow

```
Developer edits files
         ↓
    git commit
         ↓
     git push
         ↓
GitHub repository (source of truth)
         ↓
Vercel auto-deploy
         ↓
Manifest auto-generates from folder scan
         ↓
Dashboard displays updated courses
         ↓
    Users see changes! ✨
```

### Manifest Auto-Generation

The system automatically discovers courses by:

1. **Scanning** `public/vfs/courses/` directory
2. **Detecting** which files exist in each course folder
3. **Determining** current phase based on files present
4. **Generating** manifest dynamically on request
5. **Serving** via API endpoint

**No hardcoded course lists needed!**

## ☁️ S3 Usage Guidelines

### When to Use S3

| Phase | Use S3? | Why |
|-------|---------|-----|
| 1-6 | ❌ No | GitHub handles version control + deployment |
| 7 | ✅ Optional | Backup for final `course.json` |
| 8+ | ✅ Yes | Audio files (too large for GitHub) |

### S3 for Audio Assets (Phase 8+)

When your course includes audio pronunciations:

```bash
# Upload audio files to S3
aws s3 sync ./audio/ s3://theracowch-courses/spa_for_eng_30seeds/audio/

# Reference in course.json
{
  "translations": [
    {
      "text": "El proyecto está en el cronograma",
      "audioUrl": "https://s3.amazonaws.com/theracowch-courses/spa_for_eng_30seeds/audio/001.mp3"
    }
  ]
}
```

## 👥 Team Collaboration

### Branching Strategy

```bash
# Create feature branch
git checkout -b feature/add-german-course

# Work on your changes
mkdir -p public/vfs/courses/german_basics
# ... create files ...

# Commit and push
git add .
git commit -m "Add German basics course - Phase 1"
git push origin feature/add-german-course

# Create pull request on GitHub
# After review → merge to main → auto-deploy!
```

### Review Process

1. **Developer** creates branch and makes changes
2. **Developer** pushes to GitHub and creates PR
3. **Reviewer** examines JSON files for:
   - Valid structure
   - Accurate translations
   - Proper phase progression
   - No duplicate content
4. **Reviewer** approves and merges
5. **Vercel** auto-deploys to production
6. **Team** verifies in dashboard

## 🛠️ Development Tools

### Validation Script

Use the validation script to check your course files:

```bash
# Validate course structure
node validate_extraction.js public/vfs/courses/my_course/seed_pairs.json
```

### Testing Locally

```bash
# Run local development server
npm run dev

# Visit dashboard
open http://localhost:3000

# Your courses should appear automatically
```

## 📋 File Format Templates

### seed_pairs.json Template

```json
{
  "courseName": "Course Display Name",
  "courseId": "unique_course_id",
  "phase": 1,
  "description": "Brief course description",
  "targetLanguage": "es",
  "sourceLanguage": "en",
  "difficulty": "beginner",
  "seedPairs": [
    {
      "id": "seed_001",
      "english": "English phrase",
      "target": "Target language phrase",
      "context": "category_or_context",
      "notes": "Optional translation notes"
    }
  ]
}
```

### lego_pairs.json Template

```json
{
  "courseName": "Course Display Name",
  "courseId": "unique_course_id",
  "phase": 3,
  "description": "LEGO combinations description",
  "legoPairs": [
    {
      "id": "lego_001",
      "english": "Variation of seed phrase",
      "target": "Target variation",
      "derivedFrom": ["seed_001", "seed_002"],
      "variation": "negative|question|plural|etc",
      "complexity": "simple|medium|complex"
    }
  ]
}
```

### baskets_deduplicated.json Template

```json
{
  "courseName": "Course Display Name",
  "courseId": "unique_course_id",
  "phase": 4,
  "description": "Deduplicated baskets",
  "baskets": [
    {
      "basketId": "basket_theme_001",
      "theme": "Theme Name",
      "difficulty": "beginner",
      "estimatedMinutes": 15,
      "translations": [
        {
          "english": "English phrase",
          "target": "Target phrase",
          "id": "original_seed_or_lego_id"
        }
      ]
    }
  ]
}
```

## 🎓 Real-World Example

### Scenario: Adding Spanish Course Content

**Goal:** Add 10 new seed pairs to the Spanish for Engineers course

```bash
# 1. Pull latest
git pull origin main

# 2. Create feature branch
git checkout -b feature/spanish-10-new-seeds

# 3. Edit the file
vim public/vfs/courses/spa_for_eng_30seeds/seed_pairs.json

# Add your 10 new seed pairs to the "seedPairs" array

# 4. Validate (optional)
node validate_extraction.js public/vfs/courses/spa_for_eng_30seeds/seed_pairs.json

# 5. Commit with descriptive message
git add public/vfs/courses/spa_for_eng_30seeds/seed_pairs.json
git commit -m "Add 10 seed pairs for technical meetings context"

# 6. Push to GitHub
git push origin feature/spanish-10-new-seeds

# 7. Create PR on GitHub
# 8. After review → merge
# 9. Vercel auto-deploys
# 10. ✨ New content appears in production!
```

## 🚨 Common Issues

### Course Not Appearing in Dashboard

**Problem:** Just pushed new course but it doesn't show up

**Solutions:**
1. Check folder name matches `courseId` in JSON
2. Verify at least `seed_pairs.json` exists
3. Check JSON is valid (no syntax errors)
4. Wait 30-60 seconds for Vercel deployment
5. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)

### Merge Conflicts in JSON

**Problem:** Two people edited same course simultaneously

**Solution:**
```bash
# Pull latest
git pull origin main

# Manual merge - carefully combine both sets of changes
vim public/vfs/courses/[course]/seed_pairs.json

# Validate merged result
node validate_extraction.js public/vfs/courses/[course]/seed_pairs.json

# Commit resolution
git add .
git commit -m "Merge: Combine seed pairs from both contributors"
git push
```

### Accidentally Committed Temp Files

**Problem:** Pushed `temp_test.json` or similar

**Solution:**
```bash
# Remove from tracking
git rm temp_test.json

# Commit removal
git commit -m "Remove temporary test file"

# Push
git push

# Verify .gitignore is up to date
cat .gitignore | grep temp_
```

## 📞 Support

### Resources
- **This Document:** Complete workflow reference
- **Course README:** `public/vfs/courses/README.md`
- **Cleanup Plan:** `CLEANUP_PLAN.md` (what changed)
- **Validation Script:** `validate_extraction.js`

### Getting Help
1. Check this documentation first
2. Review example course: `spa_for_eng_30seeds/`
3. Ask in team chat
4. Create GitHub issue for bugs

## ✅ Checklist for New Team Members

- [ ] Clone repository
- [ ] Read this document
- [ ] Explore `public/vfs/courses/` structure
- [ ] Review example course `spa_for_eng_30seeds/`
- [ ] Create test course locally
- [ ] Run validation script
- [ ] Create feature branch
- [ ] Make small change and commit
- [ ] Push and create PR
- [ ] Verify auto-deployment works
- [ ] Celebrate! 🎉

---

**Remember:** GitHub is the single source of truth. Commit → Push → Auto-deploy!
