# Video Factory — Agent Memory
One run = ONE vertical short (1080x1920, 30fps) from the next pending topic
in topics/queue.json. Always follow WORKFLOW.md steps in order and enforce
every rule in RULES.md. QA artifacts go to qa/<id>/. Renders go to out/
(never delete). Verify Remotion APIs via the remotion MCP and Descript
capabilities via the descript MCP before coding against them. Max 4 QA
iterations, then write qa/<id>/BLOCKED.md and stop. Never publish anything;
a human does that.
