# ComplaintHub

ComplaintHub is an Expo + Express/MongoDB project for citizen complaint reporting and complaint lifecycle management.

## API Testing

The Sprint 2 branch includes automated API coverage for:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/complaints`
- `POST /api/complaints/upload-photo`
- `GET /api/complaints/:id`
- `GET /api/complaints/:id/timeline`
- `GET /api/complaints/my`
- `PATCH /api/complaints/:id/status`

Run the API tests with:

```bash
npm run test:api
```

The test suite uses:

- `mongodb-memory-server` for an isolated MongoDB instance
- `supertest` for HTTP endpoint assertions
- mocked Cloudinary uploads via `MOCK_CLOUDINARY_UPLOADS=true`

## Manual API Verification

Import [postman/ComplaintHub.postman_collection.json](postman/ComplaintHub.postman_collection.json) into Postman.

Suggested environment variables:

- `baseUrl` = `http://localhost:5000`
- `accessToken`
- `refreshToken`
- `complaintId`

If you want to exercise uploads manually without hitting Cloudinary, start the API with:

```bash
$env:MOCK_CLOUDINARY_UPLOADS="true"
npm run server
```
