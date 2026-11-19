# Draft: turn-match-experiences-into-training-goals (waiting for Amir's OK on the Farsi)

Parked here because `.githooks/pre-commit` blocks an article whose Farsi is not stamped.
After Amir's OK:

1. `mkdir -p articles/mental && mv Content/article-drafts/turn-match-experiences-into-training-goals/*.json articles/mental/`
2. Add the manifest entry to the `mental` category in `articles/index.json`:
   `{"id":"turn-match-experiences-into-training-goals","title":"Learn From Every Match","category":"Mental","readMins":6,"file":"articles/mental/turn-match-experiences-into-training-goals.json"}`
3. `python scripts/build_article_pages.py --stamp turn-match-experiences-into-training-goals` then `python scripts/build_article_pages.py`
4. Phrase-log row in `.claude/SEO-SOP.md` section 10 («تحلیل مسابقه تنیس», guess); ledger note in `Content/CONTENT-PARITY.md` (no TPS lesson yet).
5. Delete this folder, commit, push.
