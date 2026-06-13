# Summary Steps

Triggered by `/SuperPmAgent-core:distill summary <session-name>`. Extracts knowledge from a session to the domain layer.

## Steps

1. **Read session files**
   - `knowledge/sessions/<session-name>/conversation.md` — full conversation
   - `knowledge/sessions/<session-name>/notes.md` — AI-extracted notes (if exists)
   - Check for final git diff if any goal was executed

2. **Identify knowledge candidates**

   | Pattern | Type | Target |
   |---------|------|--------|
   | Architecture decision ("we decided to use X") | foundation | `knowledge/domain/foundations/<slug>.md` |
   | Team convention ("we should always...") | convention | `knowledge/domain/conventions/<slug>.md` |
   | Active work ("currently working on X") | context | `knowledge/domain/context/<slug>.md` |
   | User preference ("I prefer...") | profile | `knowledge/profiles/users/<id>.md` |

3. **For each candidate, extract knowledge**

   ```markdown
   # Title

   ## Source
   Session: <session-name>

   ## Knowledge
   The actual knowledge content...

   ## Evidence
   Why this is valuable:
   - Repeated N times in conversation
   - Explicitly stated as important
   - Resolved a common issue
   ```

4. **Check for duplicates**
   
   **IMPORTANT**: Follow the dedup algorithm in SKILL.md (Section 3).
   
   For EACH knowledge candidate:
   1. Extract keywords (title + first 3 headings + key terms)
   2. Grep target directory (domain/ or profiles/)
   3. Calculate similarity (headings 40% + code 40% + keywords 20%)
   4. Apply decision matrix from SKILL.md
   
   Log results:
   - "Checked for duplicates: found N similar files, highest similarity X% → action"
   - If similarity > 70%, skip this candidate
   - If similarity 50-70%, update existing file

5. **Generate knowledge files**
   - Use the unified frontmatter template (see `knowledge/domain/INDEX.md` for domain, `knowledge/profiles/INDEX.md` for profiles)
   - Set appropriate initial `confidence` and `ttl_days` for the type
   - Set `source` to `session/<session-name>`

6. **Update session notes**
   - Append to `knowledge/sessions/<session-name>/notes.md` with a summary of what was extracted
   - Mark the session status as "distilled"

7. **Update INDEX.md files**
   
   **IMPORTANT**: Follow the INDEX.md checklist in SKILL.md (Section 4).
   
   Add entries for any new files created in domain/ or profiles/.

8. **Open PR**
   
   **Follow the PR creation workflow from SKILL.md (Section 6).**
   
   **Mode-specific config**:
   - Branch: `distill/summary-<session-name>-<slug>`
   - Commit: `distill(summary): extract knowledge from session <session-name>`
   - PR title: `distill/summary: <session-name>`
   
   **Execute the shared workflow** (defined in SKILL.md Section 6):
   1. Pre-flight Checks (check remote, gh CLI, auth, changes)
   2. Branch Creation (handle conflicts - check if branch exists)
   3. Commit and Push (with error handling - catch push failures)
   4. Create PR (with manual fallback - if gh fails, provide manual steps)
   5. Completion Summary (output PR URL and branch name)
   
   **IMPORTANT**: Create ONE PR for all extracted knowledge.
   
   ### PR Body Template
   
   ```markdown
   # Summary Distill: <session-name>
   
   ## Source
   - Session: `knowledge/sessions/<session-name>/`
   - Conversation turns: <N>
   - Distilled: `<YYYY-MM-DD HH:MM>`
   
   ## Extracted Knowledge
   
   | File | Type | Target Layer | Confidence |
   |------|------|--------------|-----------|
   | `knowledge/domain/<area>/<slug>.md` | foundation/convention/context | domain | 0.6-0.9 |
   | `knowledge/profiles/users/<id>.md` | profile | profiles | 0.7-0.9 |
   
   ## Quality Gates
   - [ ] Deduplication checked (followed SKILL.md algorithm)
   - [ ] All frontmatter fields populated
   - [ ] All INDEX.md files updated (checklist in SKILL.md)
   - [ ] Session notes.md updated with extraction summary
   
   ## Review Notes
   <Any caveats or suggestions for reviewer>
   ```
