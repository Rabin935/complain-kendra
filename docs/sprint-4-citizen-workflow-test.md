# Sprint 4 Citizen Workflow Integration Test

Verified workflow coverage:

- Register -> OTP verification -> Login
- Home dashboard API loading, empty state, retry state
- Create complaint with photos, AI analysis, real coordinates, address, ward, latitude, longitude
- Submit success -> My Complaints -> Complaint Detail
- Complaint detail timeline, images, status, AI analysis, comments preview, follow, upvote
- Browse and Mine cards navigate to the same complaint detail route

Automated verification:

- `npm run typecheck`

Notes:

- Full runtime testing requires the API server, MongoDB, and upload/AI environment variables configured locally.
- The frontend no longer renders hardcoded complaint records as live data.
