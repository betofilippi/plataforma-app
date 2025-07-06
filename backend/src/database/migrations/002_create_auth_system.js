exports.up = function(knex) {
  return knex.schema.createTable('auth_users', function(table) {
    table.increments('id').primary();
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100);
    table.string('last_name', 100);
    table.enum('role', ['admin', 'manager', 'user', 'viewer']).defaultTo('user');
    table.enum('status', ['active', 'inactive', 'suspended']).defaultTo('active');
    table.timestamp('last_login_at');
    table.string('reset_password_token', 255);
    table.timestamp('reset_password_expires');
    table.json('preferences').defaultTo('{}');
    table.timestamps(true, true);
    
    table.index(['email']);
    table.index(['role']);
    table.index(['status']);
  })
  .then(() => {
    return knex.schema.createTable('auth_sessions', function(table) {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('auth_users').onDelete('CASCADE');
      table.string('token_hash', 255).notNullable();
      table.string('refresh_token_hash', 255);
      table.timestamp('expires_at').notNullable();
      table.string('ip_address', 45);
      table.string('user_agent', 500);
      table.timestamps(true, true);
      
      table.index(['user_id']);
      table.index(['token_hash']);
      table.index(['expires_at']);
    });
  })
  .then(() => {
    // Insert default admin user
    const bcrypt = require('bcrypt');
    const saltRounds = 12;
    const defaultPassword = 'Admin@2025';
    
    return bcrypt.hash(defaultPassword, saltRounds).then(hash => {
      return knex('auth_users').insert({
        email: 'admin@plataforma.app',
        password_hash: hash,
        first_name: 'Administrator',
        last_name: 'System',
        role: 'admin',
        status: 'active'
      });
    });
  });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('auth_sessions')
    .dropTableIfExists('auth_users');
};