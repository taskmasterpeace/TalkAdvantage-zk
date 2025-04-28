const mkcert = require('mkcert');
const fs = require('fs');
const path = require('path');

async function generateCertificates() {
  console.log('Generating SSL certificates for local development...');
  
  const certsDir = path.join(__dirname, '..', 'certificates');
  
  // Create certificates directory if it doesn't exist
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }
  
  // Create CA certificate
  const ca = await mkcert.createCA({
    organization: 'TalkAdvantage Development CA',
    countryCode: 'US',
    state: 'California',
    locality: 'San Francisco',
    validityDays: 365
  });
  
  // Create certificate for localhost
  const cert = await mkcert.createCert({
    domains: ['localhost', '127.0.0.1'],
    validityDays: 365,
    caKey: ca.key,
    caCert: ca.cert
  });
  
  // Write certificates to disk
  fs.writeFileSync(path.join(certsDir, 'ca.key'), ca.key);
  fs.writeFileSync(path.join(certsDir, 'ca.cert'), ca.cert);
  fs.writeFileSync(path.join(certsDir, 'localhost.key'), cert.key);
  fs.writeFileSync(path.join(certsDir, 'localhost.cert'), cert.cert);
  
  console.log('SSL certificates generated successfully!');
  console.log(`Certificates saved to: ${certsDir}`);
  console.log('\nYou can now start the dev server with HTTPS enabled.');
}

generateCertificates().catch(console.error);
