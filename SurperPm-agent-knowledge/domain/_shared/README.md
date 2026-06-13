# Shared Domain Knowledge

> **Purpose**: Cross-cutting knowledge that applies to ALL goals.
> **Loaded**: Always (at goal start, before any business-specific knowledge)
> **Budget**: ~500 tokens

## Structure

```
_shared/
├── foundations/     # Universal architectural principles
├── conventions/     # Team-wide coding standards
└── context/         # Current cross-cutting initiatives
```

## Distill Rules

### When to write to _shared

| Pattern | Target |
|---------|--------|
| "This applies to all modules..." | `_shared/foundations/` |
| "Everyone on the team should..." | `_shared/conventions/` |
| "We're currently migrating..." | `_shared/context/` |

### vs. Business-Specific Knowledge

| Question | Write to |
|----------|----------|
| Does this apply to ALL business areas? | `_shared/` |
| Does this only apply to user management? | `user-management/` |
| Does this only apply to payments? | `payment/` |

## Examples

### foundations/_shared/
- Git branching strategy
- API design principles
- Database naming conventions

### conventions/_shared/
- Commit message format
- Code review checklist
- Testing standards

### context/_shared/
- Current tech debt initiatives
- Active migrations
- Team capacity updates
