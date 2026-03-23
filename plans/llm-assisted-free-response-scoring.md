# LLM-Assisted Free Response Scoring

## Problem

Grading 50-60 unique free-response answers per question is tedious. Many answers are similar but correctness depends on fine distinctions in wording. The teacher needs to read each one carefully, which is slow.

## Approach: Iterative LLM Grading with Feedback

Send all unique answers for a question to an LLM and get back proposed scores for every answer at once. The teacher reviews the suggestions, accepting or overriding them. When the teacher overrides enough suggestions, automatically re-prompt the LLM with the corrected information, getting updated suggestions for all answers the teacher hasn't reviewed yet.

### Flow

1. Teacher opens a freeanswer question and clicks "Suggest scores"
2. All unique answers (plus any already-scored ones as examples) are sent to the LLM
3. LLM returns proposed scores and short explanations for every unscored answer
4. Teacher works through the list, accepting or overriding each suggestion
5. After N overrides (e.g. 3-5), automatically re-prompt in the background with:
   - The question text
   - All accepted scores (confirmed correct suggestions)
   - All overridden scores (teacher's corrections — these are the most valuable examples)
   - All remaining unreviewed answers
6. When the re-prompt returns, swap in updated suggestions for unreviewed answers
7. Repeat until everything is reviewed

The teacher can also start with zero scored answers — the LLM takes a first pass based on the question alone. This means suggestions are available from the very beginning, not just after manual scoring.

### Why This Works

The LLM doesn't have persistent state that updates from feedback. But each re-prompt builds a better few-shot prompt. Rejections are especially valuable — they show the LLM exactly where the correctness boundary is. An answer the LLM thought was correct but the teacher marked wrong is a concrete demonstration of a fine distinction, and including it as an example sharpens subsequent suggestions.

## UI Changes

### Question Panel (`question-panel.njk`)

Add a "Suggest scores" button in the unscored section (available even with zero scored answers).

After suggestions arrive, render each unscored answer with:
- The answer text (as now)
- The LLM's suggested score (highlighted/styled to distinguish from manually scored)
- A short explanation from the LLM
- Accept button (applies the suggested score to `scored_answers`)
- The existing manual scoring buttons (check/x/partial credit) to override
- Bulk actions: "Accept all" for when the suggestions look uniformly good

When a re-prompt is in flight, show a subtle indicator. If the teacher finishes reviewing before it returns, that's fine — they were just scoring manually.

### Re-prompt Trigger

Two options (could support both):
- **Automatic**: re-prompt after N overrides (3-5) that haven't been incorporated yet
- **Manual**: a "Re-suggest" button the teacher clicks when they feel the model is consistently wrong

The automatic approach is better UX but the manual button is a good fallback.

### Suggestion State

Suggestions are transient UI state, not stored in the database. They exist only during the scoring session. Once the teacher accepts or overrides a suggestion, it becomes a normal `scored_answers` record. This keeps the data model clean — the database doesn't need to know about LLM involvement.

## Backend Changes

### New Routes

**`POST /quiz-scoring/:assignmentId/question/:questionNumber/suggest`**

1. Fetch the question text from `form_assessment_questions`
2. Fetch all scored answers for this question from `scored_answers` (these are confirmed examples)
3. Fetch all unscored unique answers from `student_answers`
4. Build the prompt (see below)
5. Call the LLM API
6. Parse the response and return suggested scores with explanations as JSON

The same route handles both initial suggestions and re-prompts. The only difference is that re-prompts have more scored examples (from the teacher's accepts/overrides since the last call).

### Prompt Structure

```
You are helping a teacher grade student responses to this question:

"{question text}"

{if scored answers exist}
The teacher has confirmed these scores:

Score 1 (correct):
- "{answer1}"
- "{answer2}"

Score 0 (incorrect):
- "{answer3}"

Score 0.5 (partial credit):
- "{answer4}"
{end if}

{if contrastive examples exist}
Be careful with these answers — they may appear to deserve a different
score than they actually merit:

- "{answer5}" — this might look correct but the score is 0.
- "{answer6}" — this might look wrong but the score is 0.75.
{end if}

Score each of the following answers. Use scores: 0, 0.25, 0.5, 0.75, or 1.
For each, provide the score and a brief explanation of why.

1. "{unscored1}"
2. "{unscored2}"
...

Respond as a JSON array: [{"index": 1, "score": 0.5, "explanation": "..."}]
```

The scored answers section includes all confirmed scores regardless of how they
were arrived at (teacher-scored independently or teacher-accepted suggestions —
there's no difference from the LLM's perspective). The contrastive examples
section highlights answers where a previous suggestion was wrong. These are
presented as tricky/surprising cases rather than as corrections to a prior self,
since the LLM has no access to or memory of its former reasoning. The client-side
needs to track which suggestions were overridden (and what the original suggestion
was) to identify which answers belong in the contrastive section.

### API Client Module (`modules/llm.js`)

Wraps the LLM API call:
- Configurable model (Claude or OpenAI)
- API key from `.env` (e.g. `ANTHROPIC_API_KEY`)
- Structured JSON output parsing
- Timeout handling
- Error handling with graceful fallback (show error message, teacher continues manually)

## Implementation Steps

1. Create `modules/llm.js` with API client
2. Add the `/suggest` route in `app.js`
3. Add "Suggest scores" button and suggestion rendering to `question-panel.njk`
4. Add accept/override UI with client-side tracking of overrides
5. Add automatic re-prompt logic (client-side counter triggers POST)
6. Add "Re-suggest" manual button as fallback

## Alternatives Considered

### Embedding-based clustering
Embed all answers and cluster similar ones. Score one per cluster, apply to all. Cheaper but pure similarity doesn't capture the correctness boundary well — two answers can be semantically similar but one correct and one wrong due to a subtle distinction.

### Hybrid (cluster + LLM)
Use embeddings to group similar answers, then LLM to score one representative per cluster. More efficient for very large answer sets but adds complexity. Could be a future optimization if the number of unique answers per question grows large enough that individual LLM scoring becomes expensive.

### Fixed batching
Score a batch of answers, then send the next batch with feedback. The "send everything, re-prompt on overrides" approach is better because the teacher sees all suggestions immediately and the re-prompting happens organically based on actual disagreements rather than arbitrary batch boundaries.

## Open Questions

- Which LLM API to use? Claude API seems natural given the existing toolchain.
- What's the right override threshold for automatic re-prompting? (3? 5? Configurable?)
- Should explanations always be visible or collapsed by default?
- Token limit considerations: if a question has many long free-response answers, may need to truncate or summarize answers in the prompt.
