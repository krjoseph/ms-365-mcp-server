import { Request, Response, NextFunction } from 'express';
import logger from '../logger.js';

/**
 * Microsoft Bearer Token Auth Middleware validates that the request has a valid Microsoft access token
 * The token is passed in the Authorization header as a Bearer token
 * 
 * Note: MCP protocol methods for server discovery and tool listing are allowed without authentication
 */
export const microsoftBearerTokenAuthMiddleware = (
  req: Request & { microsoftAuth?: { accessToken: string; refreshToken: string } },
  res: Response,
  next: NextFunction
): void => {
  // Check if this is an MCP protocol method that should be allowed without authentication
  if (req.method === 'POST' && req.body) {
    try {
      const mcpRequest = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      logger.info(`MCP request: ${JSON.stringify(mcpRequest)}`);
      
      // Allow MCP protocol methods without authentication for server discovery and tool listing
      const allowedWithoutAuth = [
        'initialize',                 // Initialize the server
        'notifications/initialized',  // Initialize notifications
        'tools/list',                 // List available tools
        'tools/describe',             // Describe a tool
        'tools/invoke',               // Invoke a tool
        'server/info',                // Get server information
        'server/capabilities',        // Get server capabilities
        'server/status',              // Get server status
      ];
      
      if (allowedWithoutAuth.includes(mcpRequest.method)) {
        logger.info(`Allowing MCP ${mcpRequest.method} call without authentication`);
        next();
        return;
      }
    } catch (error) {
      // If we can't parse the body, continue with normal auth flow
      logger.debug('Could not parse MCP request body, proceeding with authentication');
    }
  }
  
  // Allow GET requests to /mcp without authentication (typically used for server discovery)
  if (req.method === 'GET' && req.path === '/mcp') {
    logger.info('Allowing MCP GET request without authentication for server discovery');
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.error('Missing or invalid access token');
    res.status(401).json({ error: 'Missing or invalid access token' });
    return;
  }

  const accessToken = authHeader.substring(7);

  // For Microsoft Graph, we don't validate the token here - we'll let the API calls fail if it's invalid
  // and handle token refresh in the GraphClient

  // Extract refresh token from a custom header (if provided)
  const refreshToken = (req.headers['x-microsoft-refresh-token'] as string) || '';

  // Store tokens in request for later use
  req.microsoftAuth = {
    accessToken,
    refreshToken,
  };

  next();
};

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
  tenantId: string = 'common',
  codeVerifier?: string
): Promise<{
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
}> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  // Add code_verifier for PKCE flow
  if (codeVerifier) {
    params.append('code_verifier', codeVerifier);
  }

  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error(`Failed to exchange code for token: ${error}`);
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  return response.json();
}

/**
 * Refresh an access token
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  tenantId: string = 'common'
): Promise<{
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}> {
  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error(`Failed to refresh token: ${error}`);
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return response.json();
}
