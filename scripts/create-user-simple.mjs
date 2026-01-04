// Simple script to create user via the registration API
// Make sure your Next.js server is running: npm run dev

const userData = {
  email: 'theitxprts@gmail.com',
  password: '786ninja',
  name: 'Test User'
};

console.log('Creating user account...');
console.log('Email:', userData.email);
console.log('Name:', userData.name);
console.log('');
console.log('Make sure your Next.js server is running on http://localhost:3000');
console.log('');

try {
  const response = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (response.ok) {
    console.log('✅ User created successfully!');
    console.log('📧 Email:', userData.email);
    console.log('🆔 User ID:', data.userId);
    console.log('');
    console.log('You can now login with:');
    console.log('Email:', userData.email);
    console.log('Password:', userData.password);
    console.log('');
    console.log('Login at: http://localhost:3000/login');
  } else {
    console.error('❌ Error:', data.error || 'Failed to create user');
    if (data.error === 'User already exists') {
      console.log('');
      console.log('The user already exists. You can login at: http://localhost:3000/login');
    }
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('');
  console.log('Make sure your Next.js server is running:');
  console.log('  npm run dev');
  console.log('');
  console.log('Then run this script again.');
  process.exit(1);
}




