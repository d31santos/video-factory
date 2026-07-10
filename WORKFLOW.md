1. PICK    first pending topic in topics/queue.json → status in_progress,
           create topics/active/<id>.json
2. SCRIPT  100–140 word VO script + scene storyboard + hook + CTA → brief JSON
3. VOICE   TTS → assets/audio/<id>.mp3 (ElevenLabs MCP; fallback edge-tts)
4. CAPTION whisper --word_timestamps True → merge word timings into brief
5. BUILD   src/videos/<Id>.tsx reads brief as props; register in Root.tsx
6. QA LOOP render preview (npm run render:preview) → scripts/extract_frames.sh →
           READ the frames + scripts/validate_output.sh → write qa/<id>/report.md
           grading R1–R12 with one line of evidence each → any FAIL: fix code,
           repeat (max 4x, then BLOCKED.md)
7. FINAL   npm run render:final → out/<id>.mp4 → re-run validate_output.sh
8. DESCRIPT POLISH (automated — see WORKFLOW step details below)
9. CLOSE   verify R13–R14, mark topic done, append to logs/production.log, STOP

## Step 8 in detail — Descript via MCP
8.1  import_media: upload out/<id>.mp4 into the configured Descript Drive
     (tool auto-polls until the composition exists). Record project/composition ids
     in qa/<id>/descript.md.
8.2  run_agent with instruction: "Remove filler words and awkward silences.
     Improve audio quality. Do not cut any sentence content." (auto-polls)
8.3  Retrieve the result: check get_job for output; if the API exposes an export/
     published asset, download it to out/<id>_polished.mp4 and run
     scripts/validate_output.sh on it (rules R1–R3, R14).
8.4  If export is NOT available via API: call create_import_url and write the
     "Edit in Descript" URL into qa/<id>/descript.md for the human — then mark
     R13 satisfied via fallback. NEVER block or fail the run because of Descript.
8.5  Any Descript error → log it in qa/<id>/descript.md, continue to step 9.
