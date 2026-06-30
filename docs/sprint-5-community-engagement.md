# Sprint 5 Community Engagement

Sprint 5 turns ComplainKendra from a private complaint tracker into a public civic engagement surface. The sprint scope covers public complaint browsing, detail pages, comments, follow/upvote actions, profile improvements, gamification, resolution ratings, and notification preferences.

## Public Browsing Acceptance

- Citizens can browse public complaint cards from the backend.
- Search supports complaint title and description.
- Filters support category, ward, city, status, and priority.
- Sort options include newest, oldest, most upvoted, and nearest when coordinates are supplied.
- Pagination is available through page and limit parameters for infinite-scroll UI.
- Public cards expose engagement counts without requiring reporter identity.

## Complaint Detail Acceptance

- The detail endpoint returns complaint information, timeline, and comments in one payload.
- The screen displays location, ward, city, category, priority, status, images, and AI analysis.
- Citizen actions include follow, upvote, share, comment, and resolution rating when resolved.
- Timeline entries remain visible to citizens while internal officer notes stay hidden.
- Officer and department context are surfaced when available from assignment or AI routing.

## Comment System Acceptance

- Authenticated citizens and officers can add comments to complaints.
- Comments support replies through parent comment IDs.
- Comment responses are returned in threaded format.
- Authors can edit or delete their own comments.
- Officer comments can be flagged as official and shown with an official badge.
- Complaint comment counts update when comments are added or removed.

## Engagement Acceptance

- Citizens can follow and unfollow complaints.
- Citizens can upvote and remove their upvote from complaints.
- Duplicate follows and duplicate upvotes are prevented by unique engagement records.
- Complaint follower and upvote counts update automatically after each action.
- Complaint owners are notified when another citizen follows or upvotes their complaint.
