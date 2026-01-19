// Script to create a test user account
// Usage: node scripts/create-test-user.js

const http = require('http');

const userData = {
  email: 'theitxprts@gmail.com',
  password: '786ninja',
  name: 'Test User'
};

const postData = JSON.stringify(userData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/create-user',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Creating user account...');
console.log('Email:', userData.email);
console.log('Name:', userData.name);
console.log('');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (res.statusCode === 201) {
        console.log('✅ User created successfully!');
        console.log('📧 Email:', response.user.email);
        console.log('👤 Name:', response.user.name);
        console.log('🆔 ID:', response.user.id);
        console.log('');
        console.log('You can now login with:');
        console.log('Email:', userData.email);
        console.log('Password:', userData.password);
      } else {
        console.error('❌ Error:', response.error || response.message);
        if (response.details) {
          console.error('Details:', response.details);
        }
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error parsing response:', error.message);
      console.log('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error creating user:', error.message);
  console.log('');
  console.log('Make sure your Next.js server is running:');
  console.log('  npm run dev');
  process.exit(1);
});

req.write(postData);
req.end();







