import { describe, it, expect, vi } from 'vitest';
import { microsoftBearerTokenAuthMiddleware } from '../src/lib/microsoft-auth.js';

// Mock Express types
const mockRequest = (method: string, path: string, body?: any, headers?: any) => ({
  method,
  path,
  body,
  headers: headers || {},
} as any);

const mockResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext = vi.fn();

describe('Microsoft Bearer Token Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MCP Protocol Methods Without Authentication', () => {
    it('should allow tools/list without authentication', () => {
      const req = mockRequest('POST', '/mcp', { method: 'tools/list' });
      const res = mockResponse();
      
      microsoftBearerTokenAuthMiddleware(req, res, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow server/info without authentication', () => {
      const req = mockRequest('POST', '/mcp', { method: 'server/info' });
      const res = mockResponse();
      
      microsoftBearerTokenAuthMiddleware(req, res, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow server/capabilities without authentication', () => {
      const req = mockRequest('POST', '/mcp', { method: 'server/capabilities' });
      const res = mockResponse();
      
      microsoftBearerTokenAuthMiddleware(req, res, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow server/status without authentication', () => {
      const req = mockRequest('POST', '/mcp', { method: 'server/status' });
      const res = mockResponse();
      
      microsoftBearerTokenAuthMiddleware(req, res, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow GET requests to /mcp without authentication', () => {
      const req = mockRequest('GET', '/mcp');
      const res = mockResponse();
      
      microsoftBearerTokenAuthMiddleware(req, res, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Authentication Required for Other Methods', () => {
    it('should require authentication for tool execution', () => {
      const req = mockRequest('POST', '/mcp', { method: 'list-mail-messages' });
      const res = mockResponse();
      
      microsoftBearerTokenAuthMiddleware(req, res, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid access token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should require authentication for unknown MCP methods', () => {
      const req = mockRequest('POST', '/mcp', { method: 'unknown/method' });
      const res = mockResponse();
      
      microsoftBearerTokenAuthMiddleware(req, res, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid access token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow tools/list without authorization header', () => {
      const req = mockRequest('POST', '/mcp', { method: 'tools/list' });
      req.headers = {}; // No authorization header
      const res = mockResponse();
      
      microsoftBearerTokenAuthMiddleware(req, res, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed JSON body gracefully', () => {
      const req = mockRequest('POST', '/mcp', 'invalid json');
      const res = mockResponse();
      
      microsoftBearerTokenAuthMiddleware(req, res, mockNext);
      
      // Should fall back to requiring authentication
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid access token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing body gracefully', () => {
      const req = mockRequest('POST', '/mcp');
      const res = mockResponse();
      
      microsoftBearerTokenAuthMiddleware(req, res, mockNext);
      
      // Should fall back to requiring authentication
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid access token' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
}); 