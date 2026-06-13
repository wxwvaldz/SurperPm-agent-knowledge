# Dream Steps

Triggered by `/SuperPmAgent-core:distill dream`. Scans and maintains the entire knowledge base.

## Phase 1: Analysis (Read-Only)

1. **Scan all knowledge files**

   Walk the entire `knowledge/` tree:
   ```
   knowledge/
   ├── profiles/           ← team.md + users/
   ├── domain/
   │   ├── foundations/
   │   ├── conventions/
   │   └── context/
   ├── sessions/
   └── extensions/
   ```

2. **For each file, extract frontmatter**
   - `confidence`, `confidence_reason`, `last_verified`
   - `created`, `last_accessed`, `access_count`, `ttl_days`, `status`
   - `title`, `type`, `tags`

3. **Calculate age for each file**
   - `age_days = today - created`

4. **Apply confidence decay** (NEW - Memory Decay Mechanism)

   **IMPORTANT**: Apply memory decay to all knowledge files before other maintenance rules.

   ### 4a. Calculate Decay Amount

   For each knowledge file, calculate decay using this formula:

   ```
   decay = base_rate × time_factor × usage_factor
   ```

   **Base Rate (by type)**:
   | Type | Base Rate (per year) |
   |------|---------------------|
   | foundation | 0.05 (5%) |
   | convention | 0.08 (8%) |
   | context | 0.15 (15%) |

   **Time Factor** (logarithmic decay):
   ```
   age_years = age_days / 365.0
   time_factor = log(1 + age_years) / log(2)
   ```
   Examples:
   - 1 year: log(2)/log(2) = 1.0
   - 2 years: log(3)/log(2) = 1.58
   - 5 years: log(6)/log(2) = 2.58

   **Usage Factor** (by access_count):
   | Access Count | Usage Factor |
   |-------------|-------------|
   | 0 | 2.0 (accelerate decay) |
   | 1-2 | 1.0 (normal decay) |
   | 3-9 | 0.5 (slow decay) |
   | 10-19 | 0.3 (much slower) |
   | 20+ | 0.1 (minimal decay) |

   **Maximum Decay**: Cap at 0.10 per Dream run

   ### 4b. Apply High-Access Boost

   If `access_count >= 10`:
   - access_count 10-19: boost = +0.02
   - access_count 20-49: boost = +0.05
   - access_count 50+: boost = +0.10
   - Cap confidence at 1.0

   ### 4c. Update Fields

   After applying decay/boost:
   - Update `last_confidence_update = today`
   - Log changes if `|old_confidence - new_confidence| > 0.01`

5. **Apply maintenance rules** (Updated)

   | Condition | Action |
   |-----------|--------|
   | **Confidence Thresholds** (NEW) | |
   | `confidence >= 0.6` | ✅ Normal (no action) |
   | `0.4 <= confidence < 0.6` | ⚠️ Lower priority in load order |
   | `0.2 <= confidence < 0.4` | 🔴 Mark for manual verification |
   | `confidence < 0.2` | 🗑️ Suggest archive |
   | **Existing Rules** | |
   | `access_count = 0` AND `age > ttl_days` | Delete |
   | `access_count < 3` AND `age > ttl_days` | Archive (move to `<layer>/archive/`) |
   | `access_count > 10` AND `age > ttl_days` | Extend TTL (+90 days) |
   | `status = active` AND `confidence < 0.6` | Lower priority in load order |

5. **Detect conflicts**
   - For each pair of files with title similarity > 0.7 (keyword overlap)
   - Check if content contradicts
   - If contradiction → flag for human review, do NOT auto-merge

6. **Generate verification report** (NEW - Manual Verification)

   For all files with `confidence < 0.4`:
   
   a. **Create verification list**:
      ```
      Verification Report:
      - Total files needing verification: N
      - Critical (confidence < 0.2): N
      - Warning (0.2 <= confidence < 0.4): N
      ```
   
   b. **For each file, collect information**:
      - File path and name
      - Current confidence
      - Last verified date
      - Days since last verification
      - Access count
      - Confidence decay reason
      - Specific verification question for reviewer
   
   c. **Generate verification questions**:
      - For foundation: "Is this architectural decision still valid?"
      - For convention: "Is this team convention still followed?"
      - For context: "Is this context information still accurate?"
   
   d. **Include in PR body** (see Step 14 PR template)

6. **Check sessions/**
   - Sessions with `status: distilled` and age > 30 days → archive to `sessions/archive/`
   - Sessions with no notes.md and age > 7 days → flag as "needs summary"

7. **Check extensions/**
   - Extensions targeting non-existent skills → flag for deletion
   - Empty extension directories → leave as-is

8. **Validate INDEX.md consistency** (NEW - CRITICAL)

   **Problem**: INDEX.md files may reference files that no longer exist, or miss files that do exist.

   **Solution**: Use script `scripts/check-index-consistency.sh`

   ```bash
   # Check all INDEX.md files
   for index_file in $(find knowledge -name "INDEX.md" -type f); do
       directory=$(dirname "$index_file")
       ./SuperPmAgent-core/skills/distill/scripts/check-index-consistency.sh "$directory"
   done
   ```

   **Manual steps** (if script not available):
   
   For each INDEX.md file in `knowledge/`:
   
   a. **Extract all file references** from INDEX.md tables
   b. **Verify each referenced file exists**
   c. **Scan actual files and check if indexed**
   d. **Generate consistency report**
   e. **Auto-fix actions**:
      - **Orphan references**: Remove from INDEX.md table
      - **Unindexed files**: Add to INDEX.md table with auto-extracted metadata
      - **Preserve manual entries**: Don't remove entries marked as "manual"

## Phase 2: Execution

9. **Archive stale sessions** (NEW)
   
   Scan `knowledge/sessions/` for sessions to archive:
   
   **Use script**: `scripts/archive-session.sh`
   
   ```bash
   # Archive a session
   ./SuperPmAgent-core/skills/distill/scripts/archive-session.sh knowledge/sessions/<session-name>
   ```
   
   **Manual steps** (if script not available):
   
   For each session folder (excluding `archive/` subdirectory):
   - Read `notes.md` frontmatter:
     - `created` date
     - `last_accessed` date
     - `ttl_days` (default: 90 for sessions)
     - `status` (active | archived)
   
   **Archive condition**: `age > ttl_days` AND `status = active`
   
   **Archive actions**:
   1. Create archive directory: `mkdir -p knowledge/sessions/archive`
   2. Update `notes.md` status: `active` → `archived`
   3. Move session to archive
   4. Update `knowledge/sessions/INDEX.md`
   
   **Example**:
   ```
   Session: test-distill-20260613
   - Created: 2026-06-13
   - Age: 95 days
   - TTL: 90 days
   - Status: active
   → Action: Move to knowledge/sessions/archive/
   ```

10. **Perform INDEX.md cleanup and additions** (NEW)

    **Use script**: `scripts/fix-index-references.sh`

    ```bash
    # Remove orphan references
    ./SuperPmAgent-core/skills/distill/scripts/fix-index-references.sh \
      knowledge/domain/<area> remove-orphans <file1> <file2>

    # Add unindexed files
    ./SuperPmAgent-core/skills/distill/scripts/fix-index-references.sh \
      knowledge/domain/<area> add-unindexed <file1> <file2>
    ```

    **Manual steps** (if script not available):

    **Execute the auto-fix actions identified in Step 8**:

    a. **Remove orphan references**: Remove table rows from INDEX.md
    b. **Add unindexed files**: Extract metadata and add to INDEX.md
    c. **Update INDEX.md timestamp**: Update "Updated" date
    d. **Log all actions**: Record orphan references removed, unindexed files added

11. **Perform approved actions**

   a. **Delete**: Remove file from directory
   b. **Archive**: Move file to `<layer>/archive/<slug>.md`
   c. **Extend TTL**: Update `ttl_days` in frontmatter
   d. **Update confidence**: Adjust based on access patterns

12. **Update all affected INDEX.md files**
   - Remove entries for deleted/archived files
   - Add entries for any archive files created
   - Update descriptions if content changed

13. **Generate maintenance report**
    - List all actions taken with rationale
    - List all conflicts detected (for human review)
    - List all files marked for review

14. **Open PR**
    
    **Follow the PR creation workflow from SKILL.md (Section 6).**
    
    **Mode-specific config**:
    - Branch: `distill/dream-<YYYY-MM-DD>`
    - Commit: `distill(dream): knowledge base maintenance <date>`
    - PR title: `distill/dream: <date> maintenance`
    
    **Execute the shared workflow** (defined in SKILL.md Section 6):
    1. Pre-flight Checks
    2. Branch Creation (handle conflicts)
    3. Commit and Push (with error handling)
    4. Create PR (with manual fallback)
    5. Completion Summary
    
    **IMPORTANT**: Create ONE PR for all maintenance actions.
    
    ### PR Body Template
    
    ```markdown
    # Dream Distill: Knowledge Base Maintenance + Verification (<YYYY-MM-DD>)
    
    ## Scan Summary
    - Total files scanned: <N>
    - Total actions taken: <N>
    - Memory decay applied: <N> files
    - Files needing verification: <N>
    - Aggressiveness level: conservative/moderate/aggressive
    
    ## Memory Decay Applied (NEW)
    
    ### Confidence Decay (N files)
    | File | Type | Old Confidence | New Confidence | Decay Amount | Reason |
    |------|------|---------------|---------------|-------------|--------|
    | `knowledge/...` | foundation | 0.90 | 0.35 | -0.55 | Age: 485 days, Access: 0 |
    | `knowledge/...` | convention | 0.80 | 0.42 | -0.38 | Age: 485 days, Access: 2 |
    
    ### Confidence Boost (N files)
    | File | Type | Old Confidence | New Confidence | Boost Amount | Reason |
    |------|------|---------------|---------------|-------------|--------|
    | `knowledge/...` | foundation | 0.80 | 0.82 | +0.02 | Access: 15 times |
    
    ## 🔴 Knowledge Needs Manual Verification (NEW)
    
    **IMPORTANT**: The following files have `confidence < 0.4` and require human verification.
    
    ### Critical (confidence < 0.2)
    | File | Confidence | Last Verified | Days Ago | Access Count | Verification Question |
    |------|-----------|--------------|----------|-------------|----------------------|
    | `knowledge/...` | 0.15 | 2026-06-13 | 485 | 0 | Is this still valid? |
    
    ### Warning (0.2 <= confidence < 0.4)
    | File | Confidence | Last Verified | Days Ago | Access Count | Verification Question |
    |------|-----------|--------------|----------|-------------|----------------------|
    | `knowledge/...` | 0.35 | 2026-06-13 | 485 | 2 | Is this convention still followed? |
    
    ## Actions Taken
    
    ### Deleted (N)
    | File | Reason | Age | Access Count |
    |------|--------|-----|-------------|
    | `knowledge/...` | access_count=0, age>TTL | 120 days | 0 |
    
    ### Archived (N)
    | File | From | To | Reason |
    |------|------|----|--------|
    | `knowledge/domain/...` | `foundations/` | `foundations/archive/` | Low access |
    
    ### TTL Extended (N)
    | File | Old TTL | New TTL | Access Count |
    |------|---------|---------|-------------|
    | `knowledge/domain/...` | 90 days | 180 days | 15 |
    
    ### INDEX.md Maintenance (NEW)
    | Action | File | Reason |
    |--------|------|--------|
    | Removed orphan reference | `domain/_shared/INDEX.md` | File no longer exists |
    | Added unindexed file | `domain/_shared/INDEX.md` | File exists but not indexed |
    
    **INDEX Consistency Report**:
    - Total INDEX.md files scanned: <N>
    - Orphan references removed: <N>
    - Unindexed files added: <N>
    - INDEX.md files updated: <N>
    
    ## Conflicts Detected (For Human Review)
    
    | File 1 | File 2 | Similarity | Contradiction |
    |--------|--------|-----------|---------------|
    | `.../file-a.md` | `.../file-b.md` | 0.85 | Different API design principles |
    
    ## Quality Gates
    - [ ] Memory decay formula applied correctly (check calculation)
    - [ ] No files with confidence > 0.9 modified without confirmation
    - [ ] All verification questions generated for confidence < 0.4
    - [ ] All archive operations preserve original location reference
    - [ ] All INDEX.md files updated (checklist in SKILL.md)
    - [ ] Conflicts flagged but NOT auto-resolved
    
    ## Review Instructions
    1. **Review verification requests** (critical priority)
       - Check each file in the "Needs Verification" section
       - Comment on whether the knowledge is still valid
       - After merge, verified files will be updated in next Dream run
    
    2. **Review memory decay changes**
       - Verify decay calculations are reasonable
       - Check if any files need immediate attention
    
    3. **Review conflicts** and decide which files to keep
    
    4. **Merge** to apply maintenance changes
    ```

## Aggressiveness Levels

| Level | Scope |
|-------|-------|
| conservative | Only delete/archive obvious cases |
| moderate | + overlapping topics, minor restructuring (default) |
| aggressive | + speculative merges, major restructuring |

The level is set via command argument (future enhancement). Default is moderate.

## Anti-patterns

- Don't run during peak hours
- Don't auto-merge files with low similarity (< 50%)
- Don't modify files with `confidence > 0.9` without human confirmation
- Always archive before deleting
