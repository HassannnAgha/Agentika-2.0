#!/bin/bash
# One container, one public port. Next.js (the onboarding wizard) listens on $PORT and proxies the gate,
# lead gen and approvals dashboard to the Python server on 8001. One Python worker on purpose: gate evidence
# and recall timers live in memory, and a redeploy resets the demo to its seeded state.
/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 1 &
cd onboarding-ui && node_modules/.bin/next start -p "${PORT:-8000}" -H 0.0.0.0 &
wait -n            # if either process exits the container exits, so the platform restarts it
exit $?
