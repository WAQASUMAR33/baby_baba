import { createEmployee, getAllEmployees } from './src/lib/employee-db.js';

async function test() {
    try {
        console.log('Inserting test employee...');
        const emp = await createEmployee({
            name: 'Test Employee 1',
            phoneNumber: '0300-1234567',
            city: 'Lahore',
            address: 'Test Address 123',
            cnic: '35202-1234567-1'
        });
        console.log('✅ Created:', emp);
    } catch (error) {
        console.error('❌ Full Error:', error);
    }
}

test();
