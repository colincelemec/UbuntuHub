// Environment variables used by the test suite
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CLIENT_URL = 'http://localhost:3000';
// SMTP is deliberately disabled: the service falls back to console output.
// They are set to '' (falsy) BEFORE dotenv loads: dotenv never overwrites
// existing variables, so the local .env cannot switch them back on.
process.env.SMTP_HOST = '';
process.env.SMTP_USER = '';
process.env.STRIPE_SECRET_KEY = '';
process.env.STRIPE_WEBHOOK_SECRET = '';
process.env.CLOUDINARY_CLOUD_NAME = '';
process.env.CLOUDINARY_API_KEY = '';
process.env.CLOUDINARY_API_SECRET = '';
