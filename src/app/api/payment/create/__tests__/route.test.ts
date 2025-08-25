import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock the database module
vi.mock('@/lib/database', () => ({
  getDatabase: () => ({
    createPayment: vi.fn().mockResolvedValue({
      payment_id: 'test-payment-id',
      service_name: 'Test Service',
      amount: 100,
      description: 'Test Description',
      expires_at: new Date(Date.now() + 30 * 60 * 1000),
    }),
  }),
}));

// Mock the rate limiting module
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockReturnValue({ success: true }),
  createRateLimitResponse: vi.fn(),
}));

// Mock the QR code generation
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mock-qr-code'),
  },
}));

describe('POST /api/payment/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.NEXT_PUBLIC_BASE_URL;
    process.env.NODE_ENV = 'development';
  });

  it('should create payment with development base URL when NEXT_PUBLIC_BASE_URL is not set', async () => {
    const requestBody = {
      service_name: 'Test Service',
      amount: 100,
      description: 'Test Description',
    };

    const request = new NextRequest('http://localhost:3000/api/payment/create', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.base_url).toBe('http://localhost:3000');
    expect(data.payment_url).toBe('http://localhost:3000/pay/test-payment-id');
    expect(data.payment_id).toBe('test-payment-id');
  });

  it('should create payment with custom base URL when NEXT_PUBLIC_BASE_URL is set', async () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com';
    
    const requestBody = {
      service_name: 'Test Service',
      amount: 100,
      description: 'Test Description',
    };

    const request = new NextRequest('http://localhost:3000/api/payment/create', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.base_url).toBe('https://example.com');
    expect(data.payment_url).toBe('https://example.com/pay/test-payment-id');
  });

  it('should create payment with production base URL when NODE_ENV is production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.VERCEL_URL = 'myapp.vercel.app';
    
    const requestBody = {
      service_name: 'Test Service',
      amount: 100,
      description: 'Test Description',
    };

    const request = new NextRequest('http://localhost:3000/api/payment/create', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.base_url).toBe('https://myapp.vercel.app');
    expect(data.payment_url).toBe('https://myapp.vercel.app/pay/test-payment-id');
  });

  it('should return validation error for invalid request', async () => {
    const requestBody = {
      service_name: '', // Invalid: empty string
      amount: -1, // Invalid: negative amount
    };

    const request = new NextRequest('http://localhost:3000/api/payment/create', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });
});
