const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

test.describe('Practice API - Automation Tests', () => {
  test('should return 200 and list of products', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/products`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body.data.length).toBeGreaterThan(0);
  });

  test('should login successfully and save token', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/auth/login`, {
      data: {
        email: 'qa@practice.com',
        password: 'password123',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('accessToken');
    expect(body.user.email).toBe('qa@practice.com');
  });

  test('should return 401 for unauthorized cart access', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/cart`);
    expect(response.status()).toBe(401);
  });
});
