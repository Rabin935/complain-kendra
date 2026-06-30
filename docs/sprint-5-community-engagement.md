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

## Profile Acceptance

- The profile screen loads user information from backend APIs.
- Profile statistics include reports submitted, resolved reports, upvotes received, and badges earned.
- Citizens can toggle public profile visibility.
- Citizens can update language and avatar through the profile module.
- Civic level, point total, and earned badge progress are visible in profile.

## Gamification Acceptance

- Points are awarded for verified complaint submission, resolved complaints, comments, upvotes, and ratings.
- Civic levels update when point thresholds are crossed.
- Badges unlock automatically from point progress.
- Leaderboard APIs expose public rankings while respecting private profiles.
- The frontend displays a leaderboard preview in the citizen profile flow.

## Resolution Rating Acceptance

- Only resolved complaints can be rated.
- Only the complaint owner can rate the resolution.
- Ratings accept one to five stars and optional feedback text.
- Each complaint can have one rating per owner, updated through upsert behavior.
- Rating summaries expose complaint, officer, and department aggregates.

## Notification Preference Acceptance

- Citizens can configure in-app, email, push, and SMS notification channels.
- Citizens can toggle complaint updates, comments, followers, officer updates, leaderboard, and badge notifications.
- Preferences are stored per user.
- Notification creation checks preferences before storing in-app notifications.
- The profile screen exposes a preferences modal connected to the backend.

## API Matrix

| Area | Endpoint |
| --- | --- |
| Browse | `GET /api/v1/complaints` |
| Nearby | `GET /api/v1/complaints/nearby` |
| Detail | `GET /api/v1/complaints/:id` |
| Timeline | `GET /api/v1/complaints/:id/timeline` |
| Comments | `GET/POST /api/v1/complaints/:id/comments` |
| Engagement | `POST/DELETE /api/v1/complaints/:id/upvote`, `POST/DELETE /api/v1/complaints/:id/follow` |
| Ratings | `POST /api/v1/complaints/:id/rate`, `GET /api/v1/complaints/:id/ratings/summary` |
| Gamification | `GET /api/v1/leaderboard`, `GET /api/v1/badges` |
| Preferences | `GET/PATCH /api/v1/notifications/preferences` |

## Frontend Coverage

| Screen | Sprint 5 Coverage |
| --- | --- |
| Browse | Public cards, search, filters, nearby mode, pagination, follow, upvote |
| Complaint Detail | Images, map preview, AI analysis, stats, timeline, comments, share, rating |
| Profile | Backend profile data, stats, badges, public toggle, leaderboard, preferences |
| Notifications | Existing list uses backend notification payloads |

## Data Ownership

- `Complaint` owns public complaint metadata and engagement counters.
- `Comment` owns discussion content, parent-child relationships, official flags, and comment upvotes.
- `Follow` and `ComplaintUpvote` own deduplicated engagement history.
- `PointEvent`, `Badge`, and `UserBadge` own gamification history and unlock state.
- `ComplaintRating` owns resolution feedback and aggregate rating source data.
- `NotificationPreference` owns per-user channel and category settings.
