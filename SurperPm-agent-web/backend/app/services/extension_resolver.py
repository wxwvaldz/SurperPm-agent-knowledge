"""Extension prompt micro-decision — invoked by pre-tool-use hook callback.

Mirrors SuperPmAgent-core/skills/find-extensions logic but on the Web side, so a
remote LAP pod can call back here with a target + task summary, and we run
the haiku micro-decision and return the inject fragments.
"""
# TODO (W2): implement haiku call.
