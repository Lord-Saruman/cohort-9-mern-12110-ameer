import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      'password_hash',
      'token',
      'content',
      'contentJson',
      'content_json',
      'contentText',
      'content_text',
      '*.password',
      '*.passwordHash',
      '*.password_hash',
      '*.token',
      '*.content',
      '*.contentJson',
      '*.content_json',
      '*.contentText',
      '*.content_text',
    ],
    censor: '[REDACTED]',
  },
});
