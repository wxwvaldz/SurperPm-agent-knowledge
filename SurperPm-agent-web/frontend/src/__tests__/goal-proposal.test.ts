import { describe, it, expect } from "vitest";
import { parseGoalProposals } from "../components/discuss/goal-proposal-card";

describe("parseGoalProposals", () => {
  it("extracts a single proposal", () => {
    const content =
      'Here is a goal:\n```goal-proposal\n{"title": "Add login", "description": "OAuth flow"}\n```\nDone.';
    const { text, proposals } = parseGoalProposals(content);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].title).toBe("Add login");
    expect(proposals[0].description).toBe("OAuth flow");
    expect(text).toBe("Here is a goal:\n\nDone.");
  });

  it("extracts multiple proposals", () => {
    const content =
      '```goal-proposal\n{"title": "A"}\n```\nand\n```goal-proposal\n{"title": "B"}\n```';
    const { proposals } = parseGoalProposals(content);
    expect(proposals).toHaveLength(2);
    expect(proposals[0].title).toBe("A");
    expect(proposals[1].title).toBe("B");
  });

  it("extracts plugins field", () => {
    const content =
      '```goal-proposal\n{"title": "Code fix", "plugins": ["SuperPmAgent-coding"]}\n```';
    const { proposals } = parseGoalProposals(content);
    expect(proposals[0].plugins).toEqual(["SuperPmAgent-coding"]);
  });

  it("skips malformed JSON", () => {
    const content = '```goal-proposal\n{not valid json}\n```';
    const { proposals } = parseGoalProposals(content);
    expect(proposals).toHaveLength(0);
  });

  it("skips proposals without title", () => {
    const content = '```goal-proposal\n{"description": "no title"}\n```';
    const { proposals } = parseGoalProposals(content);
    expect(proposals).toHaveLength(0);
  });

  it("returns original text when no proposals", () => {
    const content = "Just a normal message with no proposals.";
    const { text, proposals } = parseGoalProposals(content);
    expect(proposals).toHaveLength(0);
    expect(text).toBe(content);
  });
});
