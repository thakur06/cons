const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  database: process.env.DATABASE_NAME,
  ssl: {
    rejectUnauthorized: true,
    ca: `-----BEGIN CERTIFICATE-----
MIIERDCCAqygAwIBAgIUTi8tV8PnQDbcutR+x/O11uagwaUwDQYJKoZIhvcNAQEM
BQAwOjE4MDYGA1UEAwwvMjA3Njc3ODUtZWI2Zi00YTc1LTkzMDUtOTdjNmU1YzNm
MDhlIFByb2plY3QgQ0EwHhcNMjYxMDA1MDk1MjU2WhcNMzYxMDAyMDk1MjU2WjA6
MTgwNgYDVQQDDC8yMDc2Nzc4NS1lYjZmLTRhNzUtOTMwNS05N2M2ZTVjM2YwOGUg
UHJvamVjdCBDQTCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCCAYoCggGBALKOOqqH
lKOMM96hziqauKfx7O0VT/6YOGNH4Hz9z4/s9RAVFKRaiOeKc7yK4l1+MYAVbFGK
Dy0YELVYtac1TKLLFiQw261BZokIBTbmNsNFWy7IMqEIu3fR4k4SN+wT/r92c2Pp
Tm7xPSMkRi9z931CBY2g8nd4zE5A6hAP900kMR3pUFulsjFxH8FASslPDH8y721E
iLeIJuojdW+xohFiFmfmTJ3yeKNXRp6BoivFGP0I/zgPrWNRtCeE1z6Bo1iwHFVo
Uui3ZhOALlIC9vnaRMXn6xBA6y2YAOGaSBG789rJujvWMbS9yMgbRdq6g4Qtb3vy
tKeptG4nFiA+tInmhu40l6otj8g+DwAk07J0dssKDWjtejNpEE1l3ZslnbCGFF8H
+R7L/s9LlJ2hJmkEdGWeHGr2EKhpyRmB6Pgqr5oadPG/BB2O1ZSF4Ae3OpaImf0U
m5NbAnku8QoNMPMT+XiabRjFZfDbUURpKVJtMqbcInlEguQpvwoqVQa1/wIDAQAB
o0IwQDAdBgNVHQ4EFgQUQ+Nl+2OxWRyjQmLM9+sK+h+aznAwEgYDVR0TAQH/BAgw
BgEB/wIBADALBgNVHQ8EBAMCAQYwDQYJKoZIhvcNAQEMBQADggGBAEWL9bIo16AU
s6orkCIVZFPbk4QZVK2+dEE4QJLvQNyyyWyzxdnK7pVRq8romv3sM2aNZ0XuppnK
jM15AwtSzhgmGv1U/bKjfJNyRnx5G6Zy87+Ys1DhSrTST+SLyT+ETkAa3hIgxEPh
q9vUUX9NHVM4e6vIBnlaBj16WqWVhAZ+RjojIGWo7K52jxKoB6ooxlr5KBPHLU5H
Opz7Cfd69C+1yA0TrC9G6rGxCIeyAn7n4hHxespv+VSKI48F31wFHxMSoOWo0374
LntgdT3269FQASmWX8G0SFZTj9KU6akZt7JaGR4c4sX418gmCWgYjEX1/AZDGUzq
stkPkm29OmuzWvkD8S3gP8st8pFgoh6UvXAd+lIBIeA+/nX0rlS3hdIeL6hx/vk/
COJyQ7AqRxK7Mle4ziR0UnFPn43MimfTUiux7o9s18ogyyHgBC97bXMWFDTyuhyw
DlNd5Yyp6GXUmbskz9vEtsU4URTzRzufoGGgPqR21AEjdtVxijA3LA==
-----END CERTIFICATE-----`,
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Fallback in-memory state if Postgres is not accessible during dev setup
let isPgConnected = false;

const initDb = async () => {
  try {
    const client = await pool.connect();
    console.log('Connected successfully to PostgreSQL database.');
    isPgConnected = true;

    // Read and run schema.sql
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(sql);
      console.log('PostgreSQL schema initialized successfully.');
    }
    client.release();
  } catch (err) {
    console.warn('⚠️ Could not connect to PostgreSQL database:', err.message);
    console.warn('Make sure PostgreSQL server is running or configure DATABASE_URL in .env');
  }
};

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  initDb,
  isPgConnected: () => isPgConnected
};
