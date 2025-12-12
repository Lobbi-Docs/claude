# Security Vulnerability Audit

Conduct a comprehensive security audit of the codebase following OWASP Top 10 and security best practices:

## OWASP Top 10 Check
- **Injection**: SQL, NoSQL, OS command injection vulnerabilities
- **Broken Authentication**: Session management, credential storage
- **Sensitive Data Exposure**: Encryption, data protection
- **XML External Entities (XXE)**: XML parsing vulnerabilities
- **Broken Access Control**: Authorization and permission checks
- **Security Misconfiguration**: Default configs, exposed endpoints
- **Cross-Site Scripting (XSS)**: Input sanitization, output encoding
- **Insecure Deserialization**: Object deserialization vulnerabilities
- **Using Components with Known Vulnerabilities**: Dependency audit
- **Insufficient Logging & Monitoring**: Security event tracking

## Additional Security Checks
- API security (rate limiting, authentication)
- Secrets management (environment variables, key rotation)
- CORS configuration
- CSRF protection
- Content Security Policy
- Input validation and sanitization
- Cryptographic practices
- Error handling (no information leakage)

## Output Format
For each finding, provide:
1. **Severity**: Critical/High/Medium/Low
2. **Location**: File path and line number
3. **Description**: What the vulnerability is
4. **Impact**: Potential consequences
5. **Remediation**: How to fix it
6. **References**: OWASP/CWE links

Generate a security report with prioritized actionable items.
