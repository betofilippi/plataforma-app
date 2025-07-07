/**
 * Seed: Admin User
 * Creates default admin user with hashed password
 */

const bcrypt = require('bcrypt');

exports.seed = async function(knex) {
  // Clear existing entries
  await knex('users').del();

  // Hash password for admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const managerPassword = await bcrypt.hash('manager123', 12);
  const userPassword = await bcrypt.hash('user123', 12);

  // Insert admin and sample users
  await knex('users').insert([
    {
      id: 1,
      email: 'admin@empresa.com.br',
      password_hash: adminPassword,
      first_name: 'Administrador',
      last_name: 'Sistema',
      role: 'admin',
      status: 'active',
      phone: '(11) 99999-9999',
      preferences: JSON.stringify({
        theme: 'light',
        language: 'pt-BR',
        notifications: true,
        dashboard_layout: 'default'
      }),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      email: 'gerente@empresa.com.br',
      password_hash: managerPassword,
      first_name: 'João',
      last_name: 'Silva',
      role: 'manager',
      status: 'active',
      phone: '(11) 98888-8888',
      preferences: JSON.stringify({
        theme: 'light',
        language: 'pt-BR',
        notifications: true,
        dashboard_layout: 'default'
      }),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      email: 'vendedor@empresa.com.br',
      password_hash: userPassword,
      first_name: 'Maria',
      last_name: 'Santos',
      role: 'user',
      status: 'active',
      phone: '(11) 97777-7777',
      preferences: JSON.stringify({
        theme: 'light',
        language: 'pt-BR',
        notifications: true,
        dashboard_layout: 'sales'
      }),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 4,
      email: 'estoque@empresa.com.br',
      password_hash: userPassword,
      first_name: 'Pedro',
      last_name: 'Oliveira',
      role: 'user',
      status: 'active',
      phone: '(11) 96666-6666',
      preferences: JSON.stringify({
        theme: 'light',
        language: 'pt-BR',
        notifications: true,
        dashboard_layout: 'inventory'
      }),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 5,
      email: 'financeiro@empresa.com.br',
      password_hash: userPassword,
      first_name: 'Ana',
      last_name: 'Costa',
      role: 'user',
      status: 'active',
      phone: '(11) 95555-5555',
      preferences: JSON.stringify({
        theme: 'dark',
        language: 'pt-BR',
        notifications: false,
        dashboard_layout: 'financial'
      }),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 6,
      email: 'viewer@empresa.com.br',
      password_hash: userPassword,
      first_name: 'Carlos',
      last_name: 'Pereira',
      role: 'viewer',
      status: 'active',
      phone: '(11) 94444-4444',
      preferences: JSON.stringify({
        theme: 'light',
        language: 'pt-BR',
        notifications: true,
        dashboard_layout: 'reports'
      }),
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  console.log('✅ Admin user and sample users seeded successfully');
  console.log('');
  console.log('🔐 Default User Credentials:');
  console.log('  Admin: admin@empresa.com.br / admin123');
  console.log('  Manager: gerente@empresa.com.br / manager123');
  console.log('  User: vendedor@empresa.com.br / user123');
  console.log('  User: estoque@empresa.com.br / user123');
  console.log('  User: financeiro@empresa.com.br / user123');
  console.log('  Viewer: viewer@empresa.com.br / user123');
  console.log('');
  console.log('⚠️  Remember to change these passwords in production!');
};