import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certsDir = path.join(__dirname, '..', 'certificates');

// Create certificates directory if it doesn't exist
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

// OpenSSL commands to generate a self-signed certificate
try {
  console.log('Generating SSL certificates for local development...');
  
  // Generate private key
  execSync(`openssl genrsa -out "${path.join(certsDir, 'localhost.key')}" 2048`);
  
  // Generate CSR with subject alternative names
  execSync(`openssl req -new -key "${path.join(certsDir, 'localhost.key')}" \
    -out "${path.join(certsDir, 'localhost.csr')}" \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`);
  
  // Create config file for SANs
  const configPath = path.join(certsDir, 'openssl.cnf');
  fs.writeFileSync(configPath, `
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1
`);
  
  // Generate certificate with SAN
  execSync(`openssl x509 -req \
    -in "${path.join(certsDir, 'localhost.csr')}" \
    -signkey "${path.join(certsDir, 'localhost.key')}" \
    -out "${path.join(certsDir, 'localhost.crt')}" \
    -days 365 \
    -extfile "${configPath}" \
    -extensions v3_req`);
  
  console.log('SSL certificates generated successfully!');
  console.log(`Certificates saved to: ${certsDir}`);
  console.log('\nYou can now start the dev server with HTTPS enabled.');
  
  // Clean up temporary files
  fs.unlinkSync(path.join(certsDir, 'localhost.csr'));
  fs.unlinkSync(configPath);
  
} catch (error) {
  console.error('Error generating certificates:', error.message);
  process.exit(1);
}
