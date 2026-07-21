import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import authRoutes from './routes/authRoutes';
import accountRoutes from './routes/accountRoutes';
import athleteRoutes from './routes/athleteRoutes';
import billingRoutes, { handleStripeWebhook } from './routes/billingRoutes';
import { checkDatabase } from './db';
import { requireAuth } from './middleware/requireAuth';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Behind Caddy (one proxy hop): trust the first X-Forwarded-For entry so
// req.ip is the real client IP for rate limiting. A specific hop count (not
// `true`) avoids IP-spoofing bypasses of the limiter.
app.set('trust proxy', 1);

// Security headers. CSP is disabled here because this process serves only the
// JSON API + static uploads (no HTML); the SPA's CSP is handled by Caddy.
app.use(helmet({ contentSecurityPolicy: false }));

// In production the frontend is served same-origin via Caddy, so CORS is a
// no-op; in dev the Vite proxy also keeps it same-origin. Allow credentials so
// the auth cookie flows either way.
app.use(
    cors({
        origin: true,
        credentials: true,
    })
);

// Lenient global backstop against abuse (generous, so legitimate use isn't
// throttled).
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests — please slow down and try again shortly.' },
});

// Strict limiter for credential endpoints (brute-force / credential-stuffing).
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});
// The Stripe webhook must see the raw request body for signature verification,
// so it is registered BEFORE express.json() and is public (verified by
// signature, not the auth cookie).
app.post(
    '/api/billing/webhook',
    express.raw({ type: 'application/json' }),
    handleStripeWebhook
);

app.use(express.json());
app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Global backstop on the API (the Stripe webhook above is already registered,
// so it stays exempt).
app.use('/api', globalLimiter);

// Public endpoints.
app.get('/api/health', async (_req, res) => {
    const db = await checkDatabase();
    res.json({ status: 'ok', db });
});

// Throttle credential endpoints specifically; /me and /logout stay unlimited
// (they fire on normal page loads).
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/auth/verify-email', authLimiter);
app.use('/api/auth', authRoutes);

// Everything below requires an authenticated user.
app.use('/api/billing', requireAuth, billingRoutes);
app.use('/api/account', requireAuth, accountRoutes);
app.use('/api', requireAuth, athleteRoutes);

const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

server.on('error', (error) => {
    console.error('Server failed to start:', error);
});

process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.close(() => {
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('Shutting down server...');
    server.close(() => {
        process.exit(0);
    });
});
