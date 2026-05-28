# Engineering Design Document: Go-Based Mail Proxy Service (GomailProxy)
This document specifies the architecture, data models, security controls, and API schemas for a high-performance Go microservice designed to handle multi-user OAuth2 token synchronization and outbound mailing via the Google Gmail API and SMTP (XOAuth2).
This document is optimized for consumption by downstream LLM development agents and engineers to generate production-grade code.
## 1. System Architecture & Context
```
   +-----------------------+
   |  Core Frontend / App  |
   +-----------------------+
               |
               | (1) REST / gRPC API (e.g., Send Mail)
               v
+--------------------------------------------------------+
| GomailProxy (Go Microservice)                          |
|                                                        |
|  +------------------+      +------------------------+  |
|  |  REST/gRPC API   |      |   Token Lifecycle      |  |
|  |     Handler      |      |   Manager (TokenSource)|  |
|  +------------------+      +------------------------+  |
|           |                            |               |
|           v                            v               |
|  +------------------+      +------------------------+  |
|  |  Service Layer   |----> | AES-GCM Encrypted DB   |  |
|  |  (Mail Building) |      | (SQLite / PostgreSQL)  |  |
|  +------------------+      +------------------------+  |
+--------------------------------------------------------+
               |                             |
               | (3) Handled via             | (2) OAuth2 Flow
               |     OAuth2 Token            |     & Token Refresh
               v                             v
   +-----------------------------------------------------+
   |                Google Workspace / Gmail             |
   +-----------------------------------------------------+

```
The service runs headless and acts as an abstraction proxy between your core application and Google's OAuth2/Gmail ecosystem. It eliminates the need for individual microservices to track token lifecycles, re-authentications, and low-level MIME message assemblies.
## 2. Technical Stack Specifications
**Runtime:** Go (Golang) 1.22+  
**Web Framework:**   
github.com/labstack/echo/v4  
github.com/gin-gonic/gin  
http://github.com/gin-gonic/gin   
**Database Interfacing:**  
io.gorm.io/gorm  
io.gorm.io/driver/sqlite (or PostgreSQL driver for production scaling).  
**OAuth2 Protocol Engine:**  
golang.org/x/oauth2  
golang.org/x/oauth2/google  
http://golang.org/x/oauth2/google  
**Google API Client Library:**  
google.golang.org/api/gmail/v1  
http://google.golang.org/api/gmail/v1  
**Mail Parsing & Composition Engine:**  
github.com/wnox/jmail or native net/smtp with custom MIME multi-part builders.  

## 3. Core Database Models & Security Specifications

### 3.1 Encryption at Rest (AES-GCM-256)

All sensitive user authorization records (AccessToken, RefreshToken) must be encrypted before being written to the storage volume.  
**Algorithm:**  
AES-256-GCM  
**Key Source:**  
ENVIRONMENT_VARIABLE via a 32-byte hexadecimal root key string (GOMAPROXY_ENCRYPTION_KEY).
**Implementation Rule:**  
The Initialization Vector (Nonce) must be uniquely randomized for every single encryption write phase and prepended to the ciphertext slice.  

### 3.2 GORM Entity Definition
```go
package models

import (
	"time"
	"gorm.io/gorm"
)

type MailAccount struct {
	ID           string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserEmail    string         `gorm:"type:varchar(255);uniqueIndex;not null"`
	Status       string         `gorm:"type:varchar(50);default:'pending_auth'"` // pending_auth, active, suspended
	EncryptedData []byte        `gorm:"type:bytea;not null"` // Contains encrypted JSON block of OAuth2 credentials
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    gorm.DeletedAt `gorm:"index"`
}

// Unencrypted inner structure used purely for runtime serialization inside the service layer
type SecretOAuthToken struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	Expiry       time.Time `json:"expiry"`
	ClientID     string    `json:"client_id"`
	ClientSecret string    `json:"client_secret"`
}

```
## 4. Token Lifecycle Management Pipeline
Go's standard library golang.org/x/oauth2 implements a native struct layer called TokenSource. The development agent must construct an automated pipeline around this to completely hide token renewal routines from the REST handlers.
```go
package oauth

import (
	"context"
	"golang.org/x/oauth2"
 "golang.org/x/oauth2/google"
 "google.golang.org/api/gmail/v1"
)

// RetrieveGmailClient initializes an auto-refreshing interface for a target mailbox.
func RetrieveGmailClient(ctx context.Context, config *oauth2.Config, storedToken *oauth2.Token) (*gmail.Service, error) {
	// TokenSource automatically monitors expiry times and uses the Refresh Token when needed.
	tokenSource := config.TokenSource(ctx, storedToken)
	
	httpClient := oauth2.NewClient(ctx, tokenSource)
	
	gmailService, err := gmail.NewService(ctx, option.WithHTTPClient(httpClient))
	if err != nil {
		return nil, err
	}
	
	return gmailService, nil
}

```

## 5. API Schema Definitions (REST Specifications)

The following schema defines the core endpoints your development agent must construct. All requests and responses must communicate using standard JSON blocks.

### 5.1 Initiate OAuth2 Onboarding Link

**Endpoint:**  
POST /api/v1/accounts/onboard  
**Request Body:**  
```json
{
  "user_email": "user@yourdomain.com"
}

```
**Response Body (200 OK):**  
```json
{
  "user_email": "user@yourdomain.com",
  "auth_uri": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&scope=https://www.googleapis.com/auth/gmail.send..."
}

```

### 5.2 Handle OAuth2 Callback Redirect Hook

**Endpoint:**  
GET /api/v1/oauth/callback  
**Query Parameters:**  
code, state (maps back to the user context).  
**Processing Rules:**  
Exchange code payload for token credentials using the oauth2.Exchange command, encrypt values using AES-GCM, update the SQL status index to active, and redirect the user back to the target application dashboard success view.  

### 5.3 Execute Outbound Email Delivery

**Endpoint:**  
POST /api/v1/email/send  
**Request Body:**  
```json
{
  "sender_identity": "user@yourdomain.com",
  "recipient_address": "target@clientdomain.com",
  "subject_line": "Automated Project Milestone Report",
  "body_content_html": "<h1>Milestone Reached</h1><p>Your deployment pipeline was executed successfully.</p>",
  "body_content_plain": "Milestone Reached: Your deployment pipeline was executed successfully."
}

```
**Response Responses:**  
202 Accepted: Email successfully processed, wrapped into a RFC 822 raw message block, pushed via the active Gmail client instance, and dispatched cleanly into the internet ecosystem.  
```json
{
  "status": "success",
  "message_id": "18f3a382e718b29",
  "dispatched_at": "2026-05-22T14:10:00Z"
}

```
  401 Unauthorized: Token storage read failure, or re-authentication with Google failed because permissions were manually revoked by the end-user.  
  422 Unprocessable Entity: Bad content encoding, missing required parameters, or invalid target address patterns.  

## 6. Implementation Roadmap For Code Generation Agents

Follow this chronological sequence when generating the engine components:  
**Crypto &amp; Encryption Implementation**  
*Core Setup*  
Build the standalone crypto package. Implement EncryptAESGCM([]byte, key) and DecryptAESGCM([]byte, key). Write unit tests with randomized nonces to guarantee no cipher leakage.  
**DB Engine &amp; GORM Wiring**  
*Storage Layer*  
Declare the data model structures. Configure hook routines (BeforeSave, AfterFind) within GORM to transparently handle data block encryption/decryption routines automatically.  
**OAuth2 &amp; Google Client Logic**  
*Protocol Layer*  
Write the token verification logic using Go&#39;s oauth2 library. Ensure the TokenSource instantiation accurately hooks runtime execution pathways to cleanly intercept and renew expired access arrays.  
**HTTP Endpoint Handler Wiring**  
*API Routing*  
Expose the Echo or Gin server routes. Connect payload bindings to intercept errors, validate syntax, map contextual states, and stream structured JSON out to client channels.  
**Operational Warning:**  
Ensure your deployment stack correctly routes standard Unix environment context variables into GOMAPROXY_ENCRYPTION_KEY at boot phase. Running the container without an explicit 32-byte hexadecimal cryptographical configuration signature must trigger an unrecoverable runtime crash sequence (log.Fatal) to prevent accidental plain-text database leakage.  
