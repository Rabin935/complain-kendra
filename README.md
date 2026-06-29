# ComplainKendra

AI-powered civic complaint reporting platform for Nepal.

## Run Locally

1. Install packages:

```bash
npm install
```

2. Create `.env` from `.env.example` and set:

```bash
MONGO_URI=mongodb://localhost:27017/complainkendra
JWT_SECRET=replace-with-a-long-secret
AI_PROVIDER=mock
PORT=5000
```

3. Seed development data:

```bash
npm run seed
```

Seed accounts:

- Citizen: `rahul.sharma@example.com` / `password123`
- Officer: `ward12.officer@example.com` / `officer123`

4. Start backend:

```bash
npm run server
```

5. Start Expo web UI:

```bash
npm run web
```

## API Base

Primary API base: `http://localhost:5000/api/v1`

Compatibility aliases are also available for older frontend calls:

- `/api/auth`
- `/api/complaints`

## Main Endpoint Groups

- Citizen auth: `/api/v1/auth/register`, `/login`, `/logout`, `/refresh`, `/forgot-password`, `/reset-password`, `/otp/send`, `/otp/verify`
- Officer auth: `/api/v1/officer/auth/login`, `/logout`, `/refresh`, `/sessions`
- Users: `/api/v1/users/me`, `/me/stats`, `/me/badges`, `/me/avatar`
- Complaints: `/api/v1/complaints`, `/nearby`, `/mine`, `/:id/timeline`, `/:id/upvote`, `/:id/follow`
- Comments: `/api/v1/complaints/:complaint_id/comments`
- Notifications: `/api/v1/notifications`
- Officer console: `/api/v1/officer/dashboard`, `/complaints`, `/analytics`, `/alerts`, `/users`, `/escalation-rules`
- Uploads: `/api/v1/uploads/photos`, `/api/v1/uploads/avatar`
- Internal AI: `/internal/ai/analyze`

Local uploads are served from `/uploads/...`. Real-time events are available through Socket.io on the backend server.
