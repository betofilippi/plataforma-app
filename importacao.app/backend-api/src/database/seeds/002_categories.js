/**
 * Seed: Categories
 * Creates product, client, and supplier categories
 */

exports.seed = async function(knex) {
  // Clear existing entries
  await knex('supplier_categories').del();
  await knex('client_categories').del();
  await knex('product_categories').del();

  // Insert product categories
  await knex('product_categories').insert([
    // Main categories
    { id: 1, name: 'Eletrônicos', code: 'ELET', description: 'Produtos eletrônicos e tecnologia', parent_id: null, is_active: true, sort_order: 1 },
    { id: 2, name: 'Roupas e Acessórios', code: 'ROUP', description: 'Vestuário e acessórios', parent_id: null, is_active: true, sort_order: 2 },
    { id: 3, name: 'Casa e Jardim', code: 'CASA', description: 'Produtos para casa e jardim', parent_id: null, is_active: true, sort_order: 3 },
    { id: 4, name: 'Esportes e Lazer', code: 'ESPO', description: 'Artigos esportivos e de lazer', parent_id: null, is_active: true, sort_order: 4 },
    { id: 5, name: 'Automotivo', code: 'AUTO', description: 'Peças e acessórios automotivos', parent_id: null, is_active: true, sort_order: 5 },
    { id: 6, name: 'Saúde e Beleza', code: 'SAUD', description: 'Produtos de saúde e beleza', parent_id: null, is_active: true, sort_order: 6 },
    { id: 7, name: 'Livros e Mídia', code: 'LIVR', description: 'Livros, música e vídeos', parent_id: null, is_active: true, sort_order: 7 },
    { id: 8, name: 'Ferramentas', code: 'FERR', description: 'Ferramentas e equipamentos', parent_id: null, is_active: true, sort_order: 8 },
    { id: 9, name: 'Alimentos e Bebidas', code: 'ALIM', description: 'Produtos alimentícios', parent_id: null, is_active: true, sort_order: 9 },
    { id: 10, name: 'Escritório', code: 'ESCR', description: 'Material de escritório', parent_id: null, is_active: true, sort_order: 10 },

    // Electronics subcategories
    { id: 11, name: 'Smartphones', code: 'SMAR', description: 'Telefones celulares', parent_id: 1, is_active: true, sort_order: 1 },
    { id: 12, name: 'Laptops', code: 'LAPT', description: 'Computadores portáteis', parent_id: 1, is_active: true, sort_order: 2 },
    { id: 13, name: 'Tablets', code: 'TABL', description: 'Tablets e e-readers', parent_id: 1, is_active: true, sort_order: 3 },
    { id: 14, name: 'Acessórios', code: 'ELET_ACES', description: 'Acessórios eletrônicos', parent_id: 1, is_active: true, sort_order: 4 },
    { id: 15, name: 'TV e Som', code: 'TVSO', description: 'TVs, som e vídeo', parent_id: 1, is_active: true, sort_order: 5 },

    // Clothing subcategories
    { id: 16, name: 'Roupas Masculinas', code: 'MASC', description: 'Roupas para homens', parent_id: 2, is_active: true, sort_order: 1 },
    { id: 17, name: 'Roupas Femininas', code: 'FEMI', description: 'Roupas para mulheres', parent_id: 2, is_active: true, sort_order: 2 },
    { id: 18, name: 'Calçados', code: 'CALC', description: 'Sapatos e tênis', parent_id: 2, is_active: true, sort_order: 3 },
    { id: 19, name: 'Bolsas e Carteiras', code: 'BOLS', description: 'Bolsas e acessórios', parent_id: 2, is_active: true, sort_order: 4 },
    { id: 20, name: 'Joias e Relógios', code: 'JOIA', description: 'Joias e relógios', parent_id: 2, is_active: true, sort_order: 5 }
  ]);

  // Insert client categories
  await knex('client_categories').insert([
    { id: 1, name: 'Varejo', code: 'VAR', description: 'Clientes do varejo', is_active: true, default_discount: 0.00 },
    { id: 2, name: 'Atacado', code: 'ATA', description: 'Clientes do atacado', is_active: true, default_discount: 5.00 },
    { id: 3, name: 'Distribuidor', code: 'DIS', description: 'Distribuidores', is_active: true, default_discount: 10.00 },
    { id: 4, name: 'Revendedor', code: 'REV', description: 'Revendedores', is_active: true, default_discount: 7.50 },
    { id: 5, name: 'Corporativo', code: 'COR', description: 'Clientes corporativos', is_active: true, default_discount: 12.00 },
    { id: 6, name: 'Governo', code: 'GOV', description: 'Órgãos governamentais', is_active: true, default_discount: 8.00 },
    { id: 7, name: 'ONG', code: 'ONG', description: 'Organizações não governamentais', is_active: true, default_discount: 15.00 },
    { id: 8, name: 'Especial', code: 'ESP', description: 'Clientes especiais', is_active: true, default_discount: 20.00 }
  ]);

  // Insert supplier categories
  await knex('supplier_categories').insert([
    { id: 1, name: 'Fabricante', code: 'FAB', description: 'Fabricantes de produtos', is_active: true },
    { id: 2, name: 'Distribuidor', code: 'DIS', description: 'Distribuidores', is_active: true },
    { id: 3, name: 'Importador', code: 'IMP', description: 'Importadores', is_active: true },
    { id: 4, name: 'Atacadista', code: 'ATA', description: 'Atacadistas', is_active: true },
    { id: 5, name: 'Prestador de Serviços', code: 'SER', description: 'Prestadores de serviços', is_active: true },
    { id: 6, name: 'Revenda', code: 'REV', description: 'Revendas', is_active: true },
    { id: 7, name: 'Representante', code: 'REP', description: 'Representantes comerciais', is_active: true },
    { id: 8, name: 'Cooperativa', code: 'COO', description: 'Cooperativas', is_active: true },
    { id: 9, name: 'Produtor Rural', code: 'RUR', description: 'Produtores rurais', is_active: true },
    { id: 10, name: 'Internacional', code: 'INT', description: 'Fornecedores internacionais', is_active: true }
  ]);

  console.log('✅ Categories seeded successfully');
};