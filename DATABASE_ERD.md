# VidZo Streaming Platform Database ERD (MongoDB)

## Main Collections & Relationships

### 1. User

- \_id
- name
- email
- password
- role (user, streamer, business, admin)
- profile (ref: Profile)
- followers (array of User refs)
- following (array of User refs)
- friends (array of User refs)
- moments (array of Moment refs)
- wallet (ref: Wallet)
- subscriptions (array of Subscription refs)
- businessProfile (ref: BusinessProfile, optional)
- settings (ref: Settings)
- notifications (array of Notification refs)
- blockedUsers (array of User refs)

### 2. Profile

- \_id
- user (ref: User)
- bio
- socialLinks (x, instagram, youtube)
- avatar
- streamStats (ref: StreamAnalytics)

### 3. Stream

- \_id
- streamer (ref: User)
- title
- category
- contentRating
- viewers (array of User refs)
- chat (array of Message refs)
- gifts (array of Gift refs)
- polls (array of Poll refs)
- analytics (ref: StreamAnalytics)
- banner (media url)
- status (live, ended)
- createdAt

### 4. Message (Chat)

- \_id
- stream (ref: Stream)
- sender (ref: User)
- content
- type (text, emoji, gift)
- createdAt

### 5. Product

- \_id
- name
- description
- price
- images
- merchant (ref: BusinessProfile)
- reviews (array of Review refs)
- orders (array of Order refs)
- partneredCreator (ref: User)

### 6. Order

- \_id
- product (ref: Product)
- buyer (ref: User)
- status (processing, shipped, delivered, cancelled)
- payment (ref: Payment)
- createdAt

### 7. Review

- \_id
- product (ref: Product)
- user (ref: User)
- rating
- comment
- createdAt

### 8. Wallet

- \_id
- user (ref: User)
- balance
- transactions (array of Transaction refs)

### 9. Transaction

- \_id
- wallet (ref: Wallet)
- type (gift, subscription, purchase, withdrawal)
- amount
- method (stripe, paypal, bank)
- createdAt

### 10. Notification

- \_id
- user (ref: User)
- type (email, push, in-app)
- content
- read (boolean)
- createdAt

### 11. Moment

- \_id
- user (ref: User)
- content (text/media)
- comments (array of Comment refs)
- likes (array of User refs)
- createdAt

### 12. Poll

- \_id
- user (ref: User)
- question
- options (array)
- votes (array of Vote refs)
- stream (ref: Stream, optional)
- campaign (ref: Campaign, optional)
- createdAt

### 13. Campaign

- \_id
- user (ref: User)
- title
- description
- goalAmount
- backers (array of User refs)
- deadline
- createdAt

### 14. Subscription

- \_id
- subscriber (ref: User)
- streamer (ref: User)
- type (supporter, premium, exclusive)
- startDate
- endDate
- status

### 15. BusinessProfile

- \_id
- user (ref: User)
- businessName
- products (array of Product refs)
- proposals (array of Proposal refs)
- reviews (array of Review refs)

### 16. Proposal

- \_id
- business (ref: BusinessProfile)
- creator (ref: User)
- product (ref: Product)
- basePrice
- commission
- status (received, accepted, rejected)
- createdAt

### 17. Settings

- \_id
- user (ref: User)
- theme
- streamingPreferences
- notificationPreferences
- privacyControls
- language
- region

### 18. StreamAnalytics

- \_id
- stream (ref: Stream)
- totalViewers
- peakViewers
- giftsReceived
- duration
- likes
- newSubscribers
- newFollowers
- revenue
- growthStats

---

## Relationships (Summary)

- User <-> Profile (1:1)
- User <-> Stream (1:N)
- User <-> Followers/Following/Friends (N:N)
- User <-> Message (1:N)
- Stream <-> Chat/Message (1:N)
- User <-> Product (1:N)
- Product <-> Order (1:N)
- User <-> Review (1:N)
- User <-> Wallet (1:1)
- User <-> Notification (1:N)
- User <-> Report (1:N)
- User <-> Moment (1:N)
- User <-> Poll/Campaign (1:N)
- User <-> Subscription (N:N)
- User <-> BusinessProfile (1:1 or N:1)

---

## Notes

- All references are MongoDB ObjectId
- Arrays represent embedded references or subdocuments
- Indexes should be created on frequently queried fields (email, username, stream status, product name, etc.)
- For scalability, use sharding on large collections (Stream, Message, Product)

---

## Next Step

- Schema sample (Mongoose) or visual ERD can be provided if needed.

### 19. Challenge

- \_id
- title
- description
- reward
- level
- participants (array of User refs)
- completionPercent
- status (active, ended)
- createdAt

### 20. Category

- \_id
- title
- image
- description
- streams (array of Stream refs)
- products (array of Product refs)

### 21. Feedback

- \_id
- user (ref: User)
- feedback
- rating
- createdAt

### 22. Documentation

- \_id
- type (faq, privacy, terms, about)
- content
- createdAt

### 23. Admin

- \_id
- name
- email
- password
- role (admin, superadmin)
- permissions (array)
- activityLogs (array of Log refs)
- createdAt

### 24. Log

- \_id
- admin (ref: Admin)
- action
- details
- createdAt

## Admin Dashboard Entities

- Approvals (business, marketplace)
- Earnings (commission, share)
- Live Monitoring (active streams, viewers)
- Top Performers (streamers, products)
- Report Monitoring (live, users, business, moments)
- Feedback (user feedback)
- Documentation (FAQ, privacy, terms, about)

## Advanced Indexing & Search

- Use compound indexes for search (name, category, tags)
- Text indexes for FAQ, documentation, feedback
- Analytics collections for dashboard stats

## API Response Optimization

- Always return minimal, required fields
- Use pagination, filtering, and projection

## Security & Crash Protection

- Rate limiting, circuit breaker, health checks
- Audit logs for admin actions
