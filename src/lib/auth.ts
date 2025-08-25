// =================================
// 🔐 Authentication Utilities
// =================================

import { NextRequest } from "next/server";

export interface AuthResult {
  success: boolean;
  token?: string;
  error?: string;
}

export async function getAuthHeaders(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        success: false,
        error: "Missing or invalid authorization header"
      };
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    // For now, just check if token exists (in production, validate JWT)
    if (!token) {
      return {
        success: false,
        error: "Invalid token"
      };
    }

    return {
      success: true,
      token
    };
  } catch (error) {
    return {
      success: false,
      error: "Authentication failed"
    };
  }
}
