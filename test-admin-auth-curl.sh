#!/bin/bash

# VidZo Admin Authentication - cURL Testing Scripts
# All authentication endpoints with example requests

BASE_URL="http://localhost:5000/api/v1/auth"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}VidZo Admin Authentication - cURL Tests${NC}"
echo -e "${BLUE}========================================${NC}\n"

# 1. ADMIN LOGIN
echo -e "${YELLOW}1. ADMIN LOGIN${NC}"
echo -e "${GREEN}Endpoint: POST /login${NC}"
curl -X POST "${BASE_URL}/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vidzo.com",
    "password": "admin123"
  }' | jq .
echo -e "\n"

# 2. FORGET PASSWORD
echo -e "${YELLOW}2. FORGET PASSWORD${NC}"
echo -e "${GREEN}Endpoint: POST /forget-password${NC}"
curl -X POST "${BASE_URL}/forget-password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vidzo.com"
  }' | jq .
echo -e "\n"

# 3. VERIFY RESET OTP
echo -e "${YELLOW}3. VERIFY RESET OTP${NC}"
echo -e "${GREEN}Endpoint: POST /verify-reset-otp${NC}"
echo -e "${YELLOW}Note: Replace OTP with actual OTP from email${NC}"
curl -X POST "${BASE_URL}/verify-reset-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vidzo.com",
    "otp": "123456"
  }' | jq .
echo -e "\n"

# 4. RESET PASSWORD
echo -e "${YELLOW}4. RESET PASSWORD${NC}"
echo -e "${GREEN}Endpoint: POST /reset-password${NC}"
echo -e "${YELLOW}Note: Replace resetToken with actual token from step 3${NC}"
curl -X POST "${BASE_URL}/reset-password" \
  -H "Content-Type: application/json" \
  -H "resettoken: YOUR_RESET_TOKEN_HERE" \
  -d '{
    "email": "admin@vidzo.com",
    "otp": "123456",
    "newPassword": "newAdmin456",
    "confirmPassword": "newAdmin456"
  }' | jq .
echo -e "\n"

# 5. RESEND OTP
echo -e "${YELLOW}5. RESEND OTP${NC}"
echo -e "${GREEN}Endpoint: POST /resend-otp${NC}"
curl -X POST "${BASE_URL}/resend-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vidzo.com"
  }' | jq .
echo -e "\n"

# 6. CHANGE PASSWORD (Requires logged-in access token)
echo -e "${YELLOW}6. CHANGE PASSWORD${NC}"
echo -e "${GREEN}Endpoint: POST /change-password${NC}"
echo -e "${YELLOW}Note: Replace accessToken with actual token from login${NC}"
curl -X POST "${BASE_URL}/change-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{
    "oldPassword": "newAdmin456",
    "newPassword": "admin123",
    "confirmPassword": "admin123"
  }' | jq .
echo -e "\n"

# 7. REFRESH TOKEN
echo -e "${YELLOW}7. REFRESH TOKEN${NC}"
echo -e "${GREEN}Endpoint: POST /refresh-token${NC}"
echo -e "${YELLOW}Note: Replace refreshToken with actual token${NC}"
curl -X POST "${BASE_URL}/refresh-token" \
  -H "refreshtoken: YOUR_REFRESH_TOKEN_HERE" | jq .
echo -e "\n"

# 8. GOOGLE LOGIN
echo -e "${YELLOW}8. GOOGLE LOGIN${NC}"
echo -e "${GREEN}Endpoint: POST /google-login${NC}"
curl -X POST "${BASE_URL}/google-login" \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "<Google_ID_Token>"
  }' | jq .
echo -e "\n"

# 9. APPLE LOGIN
echo -e "${YELLOW}9. APPLE LOGIN${NC}"
echo -e "${GREEN}Endpoint: POST /apple-login${NC}"
curl -X POST "${BASE_URL}/apple-login" \
  -H "Content-Type: application/json" \
  -d '{
    "identityToken": "<Apple_Identity_Token>",
    "authorizationCode": "<Authorization_Code>"
  }' | jq .
echo -e "\n"

# 10. SEND OTP
echo -e "${YELLOW}10. SEND OTP${NC}"
echo -e "${GREEN}Endpoint: POST /send-otp${NC}"
curl -X POST "${BASE_URL}/send-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vidzo.com"
  }' | jq .
echo -e "\n"

# 11. VERIFY OTP & LOGIN
echo -e "${YELLOW}11. VERIFY OTP & LOGIN${NC}"
echo -e "${GREEN}Endpoint: POST /verify-otp${NC}"
curl -X POST "${BASE_URL}/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vidzo.com",
    "otp": "123456"
  }' | jq .
echo -e "\n"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Testing Complete${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${YELLOW}Tips:${NC}"
echo "1. Make sure backend is running: npm run dev"
echo "2. Check .env for JWT and database configuration"
echo "3. Install jq for JSON formatting: https://stedolan.github.io/jq/"
echo "4. Replace placeholder tokens with actual values from responses"
echo "5. For OTP endpoints, check backend logs or email for OTP code"
