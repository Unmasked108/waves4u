import mongoose, { Schema, Types } from 'mongoose';

const ref = (to: string, extra: object = {}) => ({ type: Schema.Types.ObjectId, ref: to, ...extra });
const model = <S extends Schema>(name: string, schema: S) => mongoose.model(name, schema);

/* ---------- Shared enums ---------- */
export const PRODUCTS = ['trade', 'club'] as const; // Trade with us (Advisory), waves4u club
export type Product = (typeof PRODUCTS)[number];
export const DURATIONS = ['monthly', 'quarterly', 'half_yearly', 'yearly'] as const;
export const SEGMENTS = ['index_stock_fno', 'stock_fno', 'mcx', 'futures'] as const;
export type Segment = (typeof SEGMENTS)[number];
export const SEGMENT_LABELS: Record<Segment, string> = {
  index_stock_fno: 'Stock/Index F&O',
  stock_fno: 'Stock F&O',
  mcx: 'MCX',
  futures: 'Futures',
};
/** Who may see a piece of content: everyone, any paying member, or club members only. */
export const ACCESS = ['free', 'premium', 'club'] as const;
export type Access = (typeof ACCESS)[number];

/* ---------- Users ---------- */
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' },
    tokenVersion: { type: Number, default: 0 }, // bump to log the user out everywhere
    /** Only the most recent login stays valid (stops premium account sharing). */
    activeSid: { type: String, default: '' },
    phone: String,
    emailVerifiedAt: Date,
    phoneVerifiedAt: Date,
    lastLoginAt: Date,
    // Password reset: only a SHA-256 hash of the emailed token is stored.
    resetTokenHash: String,
    resetTokenExpiresAt: Date,
    // Two-factor authentication (TOTP, e.g. Google Authenticator). Required for admins.
    totpSecret: String,
    totpPendingSecret: String,
    totpEnabled: { type: Boolean, default: false },
  },
  { timestamps: true },
);
export const User = model('User', userSchema);

/* ---------- Plans, coupons, subscriptions, payments ---------- */
const planSchema = new Schema(
  {
    code: { type: String, required: true, unique: true }, // e.g. "trade-quarterly"
    product: { type: String, enum: PRODUCTS, required: true },
    duration: { type: String, enum: DURATIONS, required: true },
    name: { type: String, required: true },
    pricePaise: { type: Number, required: true }, // GST inclusive
    durationDays: { type: Number, required: true },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);
planSchema.index({ product: 1, duration: 1 }, { unique: true });
export const Plan = model('Plan', planSchema);

export const Coupon = model(
  'Coupon',
  new Schema(
    {
      code: { type: String, required: true, unique: true, uppercase: true, trim: true },
      description: String,
      type: { type: String, enum: ['percent', 'flat'], required: true },
      value: { type: Number, required: true }, // percent (1-100) or flat amount in paise
      products: [{ type: String, enum: PRODUCTS }], // empty = all products
      durations: [{ type: String, enum: DURATIONS }], // empty = all durations
      validFrom: Date,
      validTo: Date,
      maxUses: Number, // empty = unlimited
      usedCount: { type: Number, default: 0 },
      active: { type: Boolean, default: true },
    },
    { timestamps: true },
  ),
);

const subscriptionSchema = new Schema(
  {
    user: ref('User', { required: true }),
    plan: ref('Plan', { required: true }),
    product: { type: String, enum: PRODUCTS, required: true },
    segment: { type: String, enum: SEGMENTS }, // only for "trade"
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
    source: { type: String, enum: ['payment', 'admin'], default: 'payment' },
    payment: ref('Payment'),
    remindersSent: { type: [Number], default: [] }, // days-before-expiry reminders already sent (7, 1)
    cancelledAt: Date,
  },
  { timestamps: true },
);
subscriptionSchema.index({ user: 1, status: 1, endsAt: -1 });
export const Subscription = model('Subscription', subscriptionSchema);

export const Payment = model(
  'Payment',
  new Schema(
    {
      user: ref('User', { required: true, index: true }),
      plan: ref('Plan', { required: true }),
      product: { type: String, enum: PRODUCTS },
      segment: { type: String, enum: SEGMENTS },
      razorpayOrderId: { type: String, required: true, unique: true },
      razorpayPaymentId: { type: String, unique: true, sparse: true },
      listPricePaise: Number, // plan price before any coupon
      discountPaise: { type: Number, default: 0 },
      coupon: String,
      amountPaise: { type: Number, required: true }, // what was charged (GST inclusive)
      taxablePaise: Number,
      gstPaise: Number,
      currency: { type: String, default: 'INR' },
      status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
      isRenewal: { type: Boolean, default: false },
      invoiceNo: { type: String, unique: true, sparse: true },
      billing: {
        name: String,
        email: String,
        phone: String,
        state: String, // place of supply
        address: String,
        gstin: String,
      },
      paidAt: Date,
      failedReason: String,
    },
    { timestamps: true },
  ),
);

/** Every webhook we receive. The unique eventId makes processing idempotent. */
export const PaymentEvent = model(
  'PaymentEvent',
  new Schema(
    {
      eventId: { type: String, required: true, unique: true },
      type: String,
      payload: Schema.Types.Mixed,
      processed: { type: Boolean, default: false },
    },
    { timestamps: true },
  ),
);

export const Counter = model(
  'Counter',
  new Schema({ _id: { type: String }, seq: { type: Number, default: 0 } }, { _id: false }),
);

/* ---------- Content ---------- */
export const Market = model(
  'Market',
  new Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    category: { type: String, enum: ['Index', 'Derivatives', 'Commodity', 'Forex', 'Stock'], required: true },
  }),
);

/** Published analyses are never edited. An update creates a new document that supersedes the old one. */
const analysisSchema = new Schema(
  {
    market: ref('Market', { required: true }),
    title: { type: String, required: true },
    timeframe: String,
    waveCount: { type: String, required: true }, // public: e.g. "Wave 3 of (5) in progress"
    bias: { type: String, enum: ['Bullish', 'Bearish', 'Neutral'], required: true },
    chartImageUrl: String,
    summary: String, // public teaser
    access: { type: String, enum: ACCESS, default: 'premium' }, // who sees the levels
    levels: {
      // Hidden from anyone who does not have `access`
      support: String,
      resistance: String,
      target: String,
      stopLoss: String,
      notes: String,
    },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    publishedAt: Date,
    supersedes: ref('Analysis'),
    supersededBy: ref('Analysis', { default: null }),
    createdBy: ref('User'),
  },
  { timestamps: true },
);
analysisSchema.index({ status: 1, supersededBy: 1, publishedAt: -1 });
export const Analysis = model('Analysis', analysisSchema);

const blogSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    market: String, // tag, e.g. "Gold"
    teaser: { type: String, required: true }, // always public
    body: { type: String, required: true }, // sanitized HTML; hidden if the reader lacks `access`
    access: { type: String, enum: ACCESS, default: 'free' }, // spec: blogs are free to read
    coverImageUrl: String,
    status: { type: String, enum: ['draft', 'scheduled', 'published'], default: 'draft' },
    publishAt: Date,
    publishedAt: Date,
    author: ref('User'),
  },
  { timestamps: true },
);
blogSchema.index({ status: 1, publishedAt: -1 });
export const BlogPost = model('BlogPost', blogSchema);

export const MentorSession = model(
  'MentorSession',
  new Schema(
    {
      title: { type: String, required: true },
      description: String,
      startsAt: { type: Date, required: true },
      joinLink: String, // premium only
      capacity: { type: Number, default: 50 },
      registrations: [ref('User')],
    },
    { timestamps: true },
  ),
);

const videoSchema = new Schema(
  {
    provider: { type: String, enum: ['youtube', 'vimeo'], default: 'youtube' },
    videoId: { type: String, required: true },
    title: String,
    description: String,
    thumbnail: String,
    access: { type: String, enum: ACCESS, default: 'free' },
    source: { type: String, enum: ['sync', 'manual'], default: 'sync' }, // sync = YouTube RSS worker
    hidden: { type: Boolean, default: false },
    publishedAt: Date,
  },
  { timestamps: true },
);
videoSchema.index({ provider: 1, videoId: 1 }, { unique: true });
export const Video = model('Video', videoSchema);

export const Faq = model(
  'Faq',
  new Schema(
    {
      question: { type: String, required: true },
      answer: { type: String, required: true },
      order: { type: Number, default: 0 },
      active: { type: Boolean, default: true },
    },
    { timestamps: true },
  ),
);

export const Testimonial = model(
  'Testimonial',
  new Schema(
    {
      firstName: { type: String, required: true },
      city: { type: String, required: true },
      text: { type: String, required: true },
      rating: { type: Number, min: 1, max: 5 },
      consent: { type: Boolean, default: false }, // only consented testimonials are shown
      order: { type: Number, default: 0 },
      active: { type: Boolean, default: true },
    },
    { timestamps: true },
  ),
);

/* ---------- Leads (Get a Callback) ---------- */
export const CAPITAL_RANGES = ['below_1l', '1l_5l', '5l_10l', 'above_10l'] as const;
const leadSchema = new Schema(
  {
    name: { type: String, required: true },
    mobile: { type: String, required: true }, // normalized: 10 digits
    capital: { type: String, enum: CAPITAL_RANGES, required: true },
    consent: { type: Boolean, required: true },
    status: { type: String, enum: ['new', 'contacted', 'converted'], default: 'new' },
    notes: String,
    page: String, // where the form was submitted from
    ip: String,
    userAgent: String,
  },
  { timestamps: true },
);
leadSchema.index({ status: 1, createdAt: -1 });
export const Lead = model('Lead', leadSchema);

/* ---------- Ops ---------- */
export const AuditLog = model(
  'AuditLog',
  new Schema({
    actor: ref('User', { index: true }),
    action: { type: String, required: true },
    target: String,
    meta: Schema.Types.Mixed,
    at: { type: Date, default: Date.now, index: true },
  }),
);

/** Outgoing messages. Rows are written by the API and delivered by the worker (see services/mailer.ts). */
export const NotificationOutbox = model(
  'NotificationOutbox',
  new Schema(
    {
      user: ref('User'),
      to: String, // explicit recipient (e.g. the team inbox); otherwise the user's email
      channel: { type: String, enum: ['email', 'sms', 'whatsapp', 'push'], required: true },
      template: { type: String, required: true },
      payload: Schema.Types.Mixed,
      status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending', index: true },
      attempts: { type: Number, default: 0 },
      lastError: String,
      sentAt: Date,
    },
    { timestamps: true },
  ),
);

export type Id = Types.ObjectId;
