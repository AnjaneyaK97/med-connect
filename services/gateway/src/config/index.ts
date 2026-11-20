import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://mediconnect:mediconnect_secret_change_in_prod@localhost:5432/mediconnect_db?schema=public',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_secret_access_key_min_32_characters_long_123',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_secret_refresh_key_min_32_characters_long_123',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  encryptionMasterKey: process.env.ENCRYPTION_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
};
