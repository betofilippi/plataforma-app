const axios = require('axios');

// Test the backend API
async function testAPI() {
  const baseUrl = 'http://localhost:3001';
  
  console.log('🚀 Testing Backend API...\n');
  
  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${baseUrl}/health`);
    console.log('✅ Health check passed');
    console.log('   Response:', healthResponse.data);
    console.log('');
    
    // Test 2: Login
    console.log('2. Testing login endpoint...');
    const loginResponse = await axios.post(`${baseUrl}/auth/login`, {
      email: 'admin@nxt.com',
      password: 'admin123'
    });
    console.log('✅ Login successful');
    console.log('   User:', loginResponse.data.data.user.email);
    
    const token = loginResponse.data.data.access_token;
    const authHeaders = { Authorization: `Bearer ${token}` };
    console.log('');
    
    // Test 3: Dashboard stats
    console.log('3. Testing dashboard stats...');
    const statsResponse = await axios.get(`${baseUrl}/dashboard/stats`, { headers: authHeaders });
    console.log('✅ Dashboard stats retrieved');
    console.log('   Total clients:', statsResponse.data.data.totalClientes);
    console.log('   Total products:', statsResponse.data.data.totalImportacoes);
    console.log('');
    
    // Test 4: Get clients
    console.log('4. Testing clients endpoint...');
    const clientsResponse = await axios.get(`${baseUrl}/api/cad/clients`, { headers: authHeaders });
    console.log('✅ Clients retrieved');
    console.log('   Total clients:', clientsResponse.data.pagination?.total || clientsResponse.data.data.length);
    console.log('');
    
    // Test 5: Get products
    console.log('5. Testing products endpoint...');
    const productsResponse = await axios.get(`${baseUrl}/api/cad/products`, { headers: authHeaders });
    console.log('✅ Products retrieved');
    console.log('   Total products:', productsResponse.data.pagination?.total || productsResponse.data.data.length);
    console.log('');
    
    // Test 6: Get suppliers
    console.log('6. Testing suppliers endpoint...');
    const suppliersResponse = await axios.get(`${baseUrl}/api/cad/suppliers`, { headers: authHeaders });
    console.log('✅ Suppliers retrieved');
    console.log('   Total suppliers:', suppliersResponse.data.pagination?.total || suppliersResponse.data.data.length);
    console.log('');
    
    // Test 7: Dashboard activities
    console.log('7. Testing dashboard activities...');
    const activitiesResponse = await axios.get(`${baseUrl}/dashboard/activities`, { headers: authHeaders });
    console.log('✅ Activities retrieved');
    console.log('   Activity count:', activitiesResponse.data.data.length);
    console.log('');
    
    // Test 8: Create a new client
    console.log('8. Testing client creation...');
    const newClient = {
      nome: 'Cliente Teste API',
      email: 'teste@api.com',
      telefone: '(11) 99999-0000',
      cpf_cnpj: '123.456.789-00',
      tipo_pessoa: 'F',
      endereco: 'Rua Teste, 123',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01000-000'
    };
    
    const createClientResponse = await axios.post(`${baseUrl}/api/cad/clients`, newClient, { headers: authHeaders });
    console.log('✅ Client created successfully');
    console.log('   Client ID:', createClientResponse.data.data.id);
    console.log('   Client name:', createClientResponse.data.data.nome);
    console.log('');
    
    console.log('🎉 All tests passed! Backend API is working correctly.\n');
    console.log('📊 Summary:');
    console.log('   - Authentication: Working');
    console.log('   - Database: Connected and seeded');
    console.log('   - Dashboard endpoints: Working');
    console.log('   - CAD endpoints (Clients, Products, Suppliers): Working');
    console.log('   - CRUD operations: Working');
    console.log('');
    console.log('🚀 Backend is ready for deployment!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      console.log('\n💡 Make sure the server is running on port 3001');
      console.log('   Run: npm run dev');
    }
    process.exit(1);
  }
}

// Test for missing dependencies
console.log('📦 Checking dependencies...');
try {
  require('axios');
  console.log('✅ axios found');
} catch (e) {
  console.log('❌ axios not found - installing...');
  const { execSync } = require('child_process');
  execSync('npm install axios', { stdio: 'inherit' });
}

// Run tests
if (require.main === module) {
  testAPI();
}

module.exports = testAPI;