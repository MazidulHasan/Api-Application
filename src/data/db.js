const { faker } = require('@faker-js/faker');
const crypto = require('crypto');

class DataStore {
  constructor() {
    this.users = [];
    this.products = [];
    this.carts = new Map(); // userId => { items: [{ productId, quantity }] }
    this.orders = [];
    this.sessions = []; // to manage JWT refresh tokens and active sessions

    this.seedData();
  }

  seedData() {
    console.log('[DB] Seeding in-memory database...');

    // Seed admin user
    this.users.push({
      id: crypto.randomUUID(),
      email: 'admin@practice.com',
      password: 'password123', // In a real app this would be hashed
      firstName: 'System',
      lastName: 'Admin',
      phone: faker.phone.number(),
      role: 'admin',
      createdAt: new Date().toISOString(),
    });

    // Seed regular QA user
    this.users.push({
      id: crypto.randomUUID(),
      email: 'qa@practice.com',
      password: 'password123',
      firstName: 'QA',
      lastName: 'Engineer',
      phone: faker.phone.number(),
      role: 'user',
      createdAt: new Date().toISOString(),
    });

    // Seed Products
    const categories = ['Electronics', 'Clothing', 'Home', 'Books', 'Toys'];
    for (let i = 0; i < 100; i++) {
      this.products.push({
        id: crypto.randomUUID(),
        name: faker.commerce.productName(),
        price: parseFloat(faker.commerce.price({ min: 10, max: 1000 })),
        category: faker.helpers.arrayElement(categories),
        stock: faker.number.int({ min: 0, max: 100 }), // Some items might be out of stock (0)
        description: faker.commerce.productDescription(),
        createdAt: faker.date.past().toISOString(),
      });
    }

    console.log(`[DB] Seeded ${this.users.length} users and ${this.products.length} products.`);
  }

  // Helper methods
  findUserByEmail(email) {
    return this.users.find((u) => u.email === email);
  }

  findUserById(id) {
    return this.users.find((u) => u.id === id);
  }

  findProductById(id) {
    return this.products.find((p) => p.id === id);
  }
}

// Export a singleton instance
const db = new DataStore();
module.exports = db;
