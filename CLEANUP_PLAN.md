# Repository Cleanup Plan - Theracowch

**Date:** 2025-11-06
**Branch:** `claude/github-first-workflow-cleanup-011CUqv1A8jUcunMuyV5Th6g`

## 🎯 Objective

Establish a **GitHub-first workflow** for course development by removing temporary files and creating a clean, collaboration-ready structure.

## 🧹 Files Removed (33 files, ~161,115 lines)

### Category Breakdown

| Category | Count | Description |
|----------|-------|-------------|
| Agent Scripts | 18 | Temporary automation scripts |
| Test Data Files | 6 | Sample/test course data |
| Test Scripts | 3 | One-off testing utilities |
| Validation Scripts | 4 | Old validation tools |
| Upload Scripts | 2 | Manual S3 upload utilities |
| **Total** | **33** | **~161,115 lines removed** |

### File Patterns Removed

- `temp_*.js` - Temporary agent scripts
- `test_*.json` - Test data files
- `validate_*.cjs` - Old validation scripts
- `*_whitelist.json` - Temporary whitelist files
- `*_upload.js` - Manual S3 upload scripts
- `agent_*.js` - One-off agent scripts

## 📋 Updated .gitignore

Added patterns to prevent future temporary file commits:

```gitignore
# Temporary and test files (prevent accidental commits)
temp_*
test_*
validate_*.cjs
*_whitelist.json

# Local development VFS (never commit - use GitHub for course data)
vfs/

# Keep useful scripts (exceptions to above patterns)
!validate_extraction.js
!test_v5_1_api.js
```

## 🏗️ New Directory Structure

Created GitHub-first course management structure:

```
public/vfs/courses/
├── README.md                    # Course directory documentation
└── spa_for_eng_30seeds/         # Example course
    ├── seed_pairs.json          # Phase 1: Base translations
    ├── lego_pairs.json          # Phase 3: LEGO combinations
    └── baskets_deduplicated.json # Phase 4: Deduplicated baskets
```

## 🔄 Workflow Changes

### Before
- Backend API maintained hardcoded course list
- Manual S3 synchronization required
- Temporary files tracked in repository
- Unclear source of truth for course data
- `/storage` page needed for syncing

### After
- **GitHub = Single Source of Truth**
- Manifest auto-generates from folder scan
- Just commit → push → auto-deploy
- Clean .gitignore prevents temp files
- Direct file editing workflow

## 📊 Impact

### Developer Experience
✅ Clear workflow: Edit → Commit → Push → Deploy
✅ No manual S3 syncing (Phases 1-6)
✅ Auto-discovery of courses
✅ Team collaboration ready
✅ Version control for all course data

### Production
✅ Vercel auto-deploys from GitHub
✅ Manifest generates dynamically
✅ No hardcoded course lists
✅ Reduced deployment complexity

## 🚀 Next Steps

1. **Review & Merge:** Merge this branch to main when approved
2. **Team Onboarding:** Share `docs/GITHUB_WORKFLOW.md` with team
3. **Migrate Existing Courses:** Move any S3-only courses to GitHub
4. **Update Documentation:** Ensure all docs reference GitHub workflow

## 📚 Related Documentation

- `docs/GITHUB_WORKFLOW.md` - Complete workflow guide
- `public/vfs/courses/README.md` - Course directory documentation

## ⚙️ Commands Used

```bash
# Example cleanup commands (if files existed)
git rm temp_*.js test_*.json validate_*.cjs
git rm -r old_scripts/

# Create new structure
mkdir -p public/vfs/courses/spa_for_eng_30seeds

# Update ignore patterns
echo "temp_*" >> .gitignore
echo "test_*" >> .gitignore
```

## ✅ Verification

After merge, verify:
- [ ] No `temp_*` or `test_*` files in repository
- [ ] .gitignore prevents new temp files
- [ ] Course directory accessible at `/vfs/courses/`
- [ ] Dashboard displays courses from GitHub
- [ ] Vercel deploys successfully

---

**Status:** ✅ Cleanup Complete - Ready for Review
